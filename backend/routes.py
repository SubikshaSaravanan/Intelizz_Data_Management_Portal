from flask import Blueprint, request, jsonify
import pandas as pd

from models import Invoice
from database import db
from xml_builder import build_invoice_xml
from otm_service import (
    post_to_otm,
    get_otm_status,
    get_transmission_error_report
)

bp = Blueprint("api", __name__)


# ============================================================
# UPLOAD EXCEL  ✅ FIXED
# ============================================================
@bp.route("/upload", methods=["POST"])
def upload():

    df = pd.read_excel(request.files["file"])
    result = []

    for inv_xid, rows in df.groupby("INVOICE_XID"):

        invoice_num = rows.iloc[0]["INVOICE_NUM"]

        old = Invoice.query.filter_by(invoice_xid=inv_xid).first()
        if old:
            db.session.delete(old)
            db.session.commit()

        xml_bytes, xml_string = build_invoice_xml(rows)

        response_xml, transmission_no = post_to_otm(xml_bytes)

        status = get_otm_status(transmission_no)

        # ✅ FETCH ERROR IMMEDIATELY
        error_message = None
        if status == "ERROR":
            error_message = get_transmission_error_report(
                transmission_no
            )

        inv = Invoice(
            invoice_xid=inv_xid,
            invoice_num=invoice_num,
            transmission_no=transmission_no,
            status=status,
            request_xml=xml_string,
            response_xml=response_xml,
            error_message=error_message
        )

        db.session.add(inv)
        db.session.commit()

        result.append({
            "invoice_xid": inv_xid,
            "invoice_num": invoice_num,
            "transmission_no": transmission_no,
            "status": status,
            "error_message": error_message
        })

    return jsonify(result)


# ============================================================
# FETCH INVOICES
# ============================================================
@bp.route("/invoices")
def invoices():

    data = Invoice.query.order_by(
        Invoice.created_at.desc()
    ).all()

    return jsonify([
        {
            "id": i.id,
            "invoice_xid": i.invoice_xid,
            "invoice_num": i.invoice_num,
            "transmission_no": i.transmission_no,
            "status": i.status,
            "error_message": i.error_message
        }
        for i in data
    ])


# ============================================================
# REFRESH STATUS + ERROR
# ============================================================
@bp.route("/refresh/<int:id>", methods=["POST"])
def refresh(id):

    inv = Invoice.query.get(id)

    if not inv or not inv.transmission_no:
        return jsonify({"status": "NO_TRANSMISSION"})

    status = get_otm_status(inv.transmission_no)
    inv.status = status

    if status == "ERROR":

        error = get_transmission_error_report(
            inv.transmission_no
        )

        # store only if available
        if error and error.strip():
            inv.error_message = error

    db.session.commit()

    return jsonify({
        "status": inv.status,
        "error_message": inv.error_message
    })


# ============================================================
# VIEW XML
# ============================================================
@bp.route("/xml/<int:id>")
def view_xml(id):

    inv = Invoice.query.get(id)

    if not inv:
        return "Invoice not found", 404

    return inv.request_xml, 200, {
        "Content-Type": "application/xml",
        "Content-Disposition": "inline"
    }


# ============================================================
# DELETE
# ============================================================
@bp.route("/delete/<int:id>", methods=["DELETE"])
def delete(id):

    inv = Invoice.query.get(id)
    db.session.delete(inv)
    db.session.commit()

    return {"status": "deleted"}
