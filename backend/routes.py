from flask import Blueprint, request, jsonify
import pandas as pd
import json

from database import db
from models import Invoice

from xml_builder import build_invoice_xml
from json_builder import build_invoice_json_from_excel


from otm_service import (
    post_to_otm,
    get_otm_status,
    get_transmission_error_report
)

from otm_rest_service import post_excel_json_invoice_to_otm, get_otm_metadata
from models import Invoice, OtmObjectMetadata, MetadataField
from invoice_template_routes import invoice_template_bp

bp = Blueprint("api", __name__)

# ✅ ADD THIS LINE
bp.register_blueprint(invoice_template_bp)





# ============================================================
# UPLOAD EXCEL → XML OR JSON → SEND TO OTM
# ============================================================
@bp.route("/invoice/upload", methods=["POST"])
def upload_invoice():

    file = request.files.get("file")
    process_type = request.form.get("processType")  # xml | json

    if not file or not process_type:
        return {"error": "File or processType missing"}, 400

    try:
        # ==========================
        # XML FLOW (MULTI-INVOICE)
        # ==========================
        if process_type == "xml":
            df = pd.read_excel(file)

            grouped = df.groupby("INVOICE_XID")

            results = []

            for invoice_xid, invoice_df in grouped:

                invoice_num = str(invoice_df.iloc[0]["INVOICE_NUM"])

                xml_bytes, xml_string = build_invoice_xml(invoice_df)
                response_xml, transmission_no = post_to_otm(xml_bytes)

                invoice = Invoice(
                    invoice_xid=invoice_xid,
                    invoice_num=invoice_num,
                    transmission_no=transmission_no,
                    status="RECEIVED",

                    request_xml=xml_string,
                    request_json=None,

                    response_xml=response_xml,
                    error_message=None,

                    source_type="XML"
                )

                db.session.add(invoice)

                results.append({
                    "invoiceXid": invoice_xid,
                    "invoiceNumber": invoice_num,
                    "transmission_no": transmission_no
                })

            db.session.commit()

            return jsonify({
                "message": "Invoices created using XML",
                "count": len(results),
                "invoices": results
            })

        # ==========================
        # JSON FLOW
        # ==========================
        elif process_type == "json":
            json_payload = build_invoice_json_from_excel(file)
            otm_response = post_excel_json_invoice_to_otm(json_payload)

            invoice = Invoice(
                invoice_xid=json_payload["invoiceXid"],
                invoice_num=json_payload["invoiceNumber"],
                transmission_no=(
                    otm_response.get("transmissionNo")
                    or otm_response.get("id")
                ),
                status="RECEIVED",

                request_xml=None,
                request_json=json_payload,

                response_xml=json.dumps(otm_response),
                error_message=None,

                source_type="JSON"
            )

            db.session.add(invoice)
            db.session.commit()

            return jsonify({
                "message": "Invoice created using JSON",
                "invoiceXid": invoice.invoice_xid,
                "invoiceNumber": invoice.invoice_num,
                "transmission_no": invoice.transmission_no
            })

        return {"error": "Invalid processType"}, 400

    except Exception as e:
        return {"error": str(e)}, 500


# ============================================================
# FETCH ALL INVOICES
# ============================================================
@bp.route("/invoices", methods=["GET"])
def invoices():

    invoices = Invoice.query.order_by(
        Invoice.created_at.desc()
    ).all()

    return jsonify([
        {
            "id": i.id,
            "invoice_xid": i.invoice_xid,
            "invoice_num": i.invoice_num,
            "transmission_no": i.transmission_no,
            "status": i.status,
            "error_message": i.error_message,

            "has_json": bool(i.request_json),
            "has_xml": bool(i.request_xml),

            "source_type": i.source_type
        }
        for i in invoices
    ])


# ============================================================
# REFRESH STATUS (XML ONLY)
# ============================================================
@bp.route("/refresh/<int:id>", methods=["POST"])
def refresh(id):

    inv = Invoice.query.get_or_404(id)

    if not inv.transmission_no:
        return jsonify({"status": inv.status})

    if inv.source_type == "JSON":
        return jsonify({
            "status": inv.status,
            "error_message": inv.error_message
        })

    status = get_otm_status(inv.transmission_no)
    inv.status = status

    if status == "ERROR":
        inv.error_message = get_transmission_error_report(
            inv.transmission_no
        )

    db.session.commit()

    return jsonify({
        "status": inv.status,
        "error_message": inv.error_message
    })


# ============================================================
# 🔁 RESEND INVOICE (XML + JSON)
# ============================================================
@bp.route("/invoice/resend/<int:id>", methods=["POST"])
def resend_invoice(id):

    inv = Invoice.query.get_or_404(id)

    try:
        if inv.source_type == "XML" and inv.request_xml:
            response_xml, transmission_no = post_to_otm(
                inv.request_xml.encode("utf-8")
            )
            inv.transmission_no = transmission_no
            inv.response_xml = response_xml

        elif inv.source_type == "JSON" and inv.request_json:
            otm_response = post_excel_json_invoice_to_otm(inv.request_json)
            inv.transmission_no = (
                otm_response.get("transmissionNo")
                or otm_response.get("id")
            )
            inv.response_xml = json.dumps(otm_response)

        inv.status = "RECEIVED"
        inv.error_message = None

        db.session.commit()

        return jsonify({
            "message": "Invoice resent successfully",
            "transmission_no": inv.transmission_no
        })

    except Exception as e:
        inv.status = "ERROR"
        inv.error_message = str(e)
        db.session.commit()
        return {"error": str(e)}, 500


# ============================================================
# VIEW XML
# ============================================================
@bp.route("/xml/<int:id>", methods=["GET"])
def view_xml(id):

    inv = Invoice.query.get_or_404(id)

    if not inv.request_xml:
        return "XML not found", 404

    return inv.request_xml, 200, {
        "Content-Type": "application/xml"
    }


# ============================================================
# VIEW JSON
# ============================================================
@bp.route("/json/<int:id>", methods=["GET"])
def view_json(id):

    inv = Invoice.query.get_or_404(id)

    if not inv.request_json:
        return "JSON not found", 404

    return jsonify(inv.request_json)


# ============================================================
# DELETE INVOICE (FIXED FOR CORS)
# ============================================================
@bp.route("/delete/<int:id>", methods=["DELETE", "OPTIONS"])
def delete_invoice(id):

    if request.method == "OPTIONS":
        return "", 200

    inv = Invoice.query.get_or_404(id)
    db.session.delete(inv)
    db.session.commit()

    return jsonify({"message": "Invoice deleted"}), 200


# ============================================================
# UPLOAD RAW JSON FILE
# ============================================================
@bp.route("/invoice/json/upload", methods=["POST"])
def upload_raw_json():

    file = request.files.get("file")
    if not file:
        return {"error": "JSON file missing"}, 400

    try:
        payload = json.load(file)
        otm_response = post_excel_json_invoice_to_otm(payload)

        invoice = Invoice(
            invoice_xid=payload.get("invoiceXid", "JSON_UPLOAD"),
            invoice_num=payload.get("invoiceNumber", "JSON_UPLOAD"),
            transmission_no=(
                otm_response.get("transmissionNo")
                or otm_response.get("id")
            ),
            status="RECEIVED",

            request_json=payload,
            request_xml=None,

            response_xml=json.dumps(otm_response),
            error_message=None,

            source_type="JSON"
        )

        db.session.add(invoice)
        db.session.commit()

        return jsonify({
            "message": "JSON invoice uploaded successfully",
            "invoiceXid": invoice.invoice_xid,
            "invoiceNumber": invoice.invoice_num,
            "transmission_no": invoice.transmission_no
        })

    except Exception as e:
        return {"error": str(e)}, 500
# ============================================================
# OTM CATALOG LOADING
# ============================================================
def load_otm_catalog():
    import os
    path = os.path.join(os.path.dirname(__file__), "otm_catalog.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {"MASTER": [], "TRANSACTION": [], "POWER": []}

def get_classification_from_catalog(object_name):
    catalog = load_otm_catalog()
    for category, items in catalog.items():
        if any(i['name'] == object_name for i in items):
            return category
    return "TRANSACTION"

# ============================================================
# SYNC OTM METADATA
# ============================================================
@bp.route("/metadata/sync/<object_name>", methods=["POST"])
def sync_metadata(object_name):
    status_code, data = get_otm_metadata(object_name)

    if status_code != 200:
        return jsonify(data), status_code

    # Check classification from catalog
    classification = get_classification_from_catalog(object_name)

    # Update or create Header
    metadata = OtmObjectMetadata.query.filter_by(object_name=object_name).first()
    if not metadata:
        metadata = OtmObjectMetadata(object_name=object_name, classification=classification)
        db.session.add(metadata)
    else:
        metadata.classification = classification
        metadata.last_synced = db.func.now()

    # Clear existing fields
    MetadataField.query.filter_by(metadata_id=metadata.id).delete()

    # Add new fields from metadata-catalog
    # The structure of OTM metadata-catalog Usually has "attributes" or "properties"
    # We will simple extract top-level names for now
    items = data.get("attributes", [])
    for item in items:
        field = MetadataField(
            object_metadata=metadata,
            field_name=item.get("name"),
            data_type=item.get("type"),
            is_required=not item.get("nullable", True)
        )
        db.session.add(field)

    db.session.commit()

    return jsonify({
        "message": f"Metadata for {object_name} synced successfully",
        "fields_count": len(items),
        "classification": classification
    })

# ============================================================
# DASHBOARD MODULES
# ============================================================
@bp.route("/dashboard/modules", methods=["GET"])
def get_dashboard_modules():
    catalog = load_otm_catalog()
    otm_meta = {m.object_name: m for m in OtmObjectMetadata.query.all()}

    modules = {
        "MASTER": [],
        "TRANSACTION": [],
        "POWER": []
    }

    for category, items in catalog.items():
        for item in items:
            db_entry = otm_meta.get(item['name'])
            
            # Start with catalog data and add sync status
            module = item.copy()
            module.update({
                "title": item.get('display', item['name']),
                "path": item.get('path', f"/{item['name']}"),
                "last_synced": db_entry.last_synced.isoformat() if db_entry and db_entry.last_synced else None,
                "is_synced": bool(db_entry and db_entry.last_synced),
                "is_app": item.get('is_app', False)
            })
            
            modules[category].append(module)

    return jsonify(modules)
