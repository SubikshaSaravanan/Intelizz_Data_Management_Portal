from flask import Blueprint, request, jsonify
import pandas as pd
import json
import os

# =============================
# Database & Models
# =============================
from .database import db
from .models import Invoice, OtmObjectMetadata, MetadataField

# =============================
# Builders
# =============================
from .xml_builder import build_invoice_xml
from .json_builder import build_invoice_json_from_excel

# =============================
# OTM Services
# =============================
from .otm_service import (
    post_to_otm,
    get_otm_status,
    get_transmission_error_report
)

from .otm_rest_service import (
    post_excel_json_invoice_to_otm,
    get_otm_metadata
)

# =============================
# Other Blueprints
# =============================
from .invoice_template_routes import invoice_template_bp


bp = Blueprint("api", __name__)

# Register child blueprint
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
    invoices = Invoice.query.order_by(Invoice.created_at.desc()).all()

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
# RESEND INVOICE (XML + JSON)
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
# DELETE INVOICE
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
# OTM CATALOG LOADING
# ============================================================
def load_otm_catalog():
    path = os.path.join(os.path.dirname(__file__), "otm_catalog.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {"MASTER": [], "TRANSACTION": [], "POWER": []}


def get_classification_from_catalog(object_name):
    catalog = load_otm_catalog()
    for category, items in catalog.items():
        if any(i["name"] == object_name for i in items):
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

    classification = get_classification_from_catalog(object_name)

    metadata = OtmObjectMetadata.query.filter_by(
        object_name=object_name
    ).first()

    if not metadata:
        metadata = OtmObjectMetadata(
            object_name=object_name,
            classification=classification
        )
        db.session.add(metadata)
    else:
        metadata.classification = classification
        metadata.last_synced = db.func.now()

    MetadataField.query.filter_by(metadata_id=metadata.id).delete()

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

    modules = {"MASTER": [], "TRANSACTION": [], "POWER": []}

    for category, items in catalog.items():
        for item in items:
            db_entry = otm_meta.get(item["name"])

            module = item.copy()
            module.update({
                "title": item.get("display", item["name"]),
                "path": item.get("path", f"/{item['name']}"),
                "last_synced": (
                    db_entry.last_synced.isoformat()
                    if db_entry and db_entry.last_synced
                    else None
                ),
                "is_synced": bool(db_entry and db_entry.last_synced),
                "is_app": item.get("is_app", False)
            })

            # Add summary stats for Invoice modules
            if item["name"] == "invoices":
                # XML Counts
                x_total = Invoice.query.filter_by(source_type="XML").count()
                x_success = Invoice.query.filter_by(source_type="XML", status="PROCESSED").count()
                x_error = Invoice.query.filter_by(source_type="XML", status="ERROR").count()
                
                # JSON Counts
                j_total = Invoice.query.filter_by(source_type="JSON").count()
                j_success = Invoice.query.filter_by(source_type="JSON", status="PROCESSED").count()
                j_error = Invoice.query.filter_by(source_type="JSON", status="ERROR").count()
                
                module["summary"] = [
                    {"label": "Total", "value": x_total, "icon": "FileText", "color": "text-indigo-300", "source": "XML"},
                    {"label": "Success", "value": x_success, "icon": "CheckCircle", "color": "text-emerald-300", "source": "XML"},
                    {"label": "Error", "value": x_error, "icon": "AlertCircle", "color": "text-rose-300", "source": "XML"},
                    {"label": "Total", "value": j_total, "icon": "FilePlus", "color": "text-cyan-300", "source": "JSON"},
                    {"label": "Success", "value": j_success, "icon": "CheckCircle", "color": "text-emerald-300", "source": "JSON"},
                    {"label": "Error", "value": j_error, "icon": "AlertCircle", "color": "text-rose-300", "source": "JSON"}
                ]
            elif item["name"] == "invoice_json":
                total = Invoice.query.filter_by(source_type="JSON").count()
                success = Invoice.query.filter_by(source_type="JSON", status="PROCESSED").count()
                error = Invoice.query.filter_by(source_type="JSON", status="ERROR").count()
                pending = Invoice.query.filter_by(source_type="JSON", status="RECEIVED").count()
                module["summary"] = [
                    {"label": "Total", "value": total, "icon": "FilePlus", "color": "text-cyan-300", "source": "JSON"},
                    {"label": "Success", "value": success, "color": "text-emerald-300", "icon": "CheckCircle", "source": "JSON"},
                    {"label": "Error", "value": error, "color": "text-rose-300", "icon": "AlertCircle", "source": "JSON"},
                    {"label": "Pending", "value": pending, "color": "text-amber-300", "icon": "Clock", "source": "JSON"}
                ]

            modules[category].append(module)

    return jsonify({
        "version": "1.1-SUMMARY",
        "data": modules
    })
