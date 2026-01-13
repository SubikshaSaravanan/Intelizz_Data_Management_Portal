from flask import Blueprint, request, jsonify
import pandas as pd
from models import Invoice
from database import db
from xml_builder import build_invoice_xml
from otm_service import post_to_otm, get_otm_status

bp = Blueprint("api", __name__)

@bp.route("/upload", methods=["POST"])
def upload():
    df = pd.read_excel(request.files["file"])
    result = []

    for inv_xid, rows in df.groupby("INVOICE_XID"):
        invoice_num = rows.iloc[0]["INVOICE_NUM"]

        # 🚫 DO NOT skip existing rows anymore
        old = Invoice.query.filter_by(invoice_xid=inv_xid).first()
        if old:
            db.session.delete(old)
            db.session.commit()

        # Build XML
        xml_bytes, xml_string = build_invoice_xml(rows)

        # Send to OTM
        response_xml, transmission_no = post_to_otm(xml_bytes)

        # Fetch real status
        status = get_otm_status(transmission_no)

        # 🔥 Create row AFTER transmission is available
        inv = Invoice()
        inv.invoice_xid = inv_xid
        inv.invoice_num = invoice_num
        inv.transmission_no = transmission_no
        inv.status = status
        inv.request_xml = xml_string
        inv.response_xml = response_xml

        db.session.add(inv)
        db.session.commit()

        print("SAVED:", inv_xid, transmission_no, status)

        result.append({
            "invoice_xid": inv_xid,
            "invoice_num": invoice_num,
            "transmission_no": transmission_no,
            "status": status
        })

    return jsonify(result)



@bp.route("/invoices")
def invoices():
    data = Invoice.query.order_by(Invoice.created_at.desc()).all()
    return jsonify([{
        "id": i.id,
        "invoice_xid": i.invoice_xid,
        "invoice_num": i.invoice_num,
        "transmission_no": i.transmission_no,
        "status": i.status
    } for i in data])


@bp.route("/refresh/<int:id>", methods=["POST"])
def refresh(id):
    inv = Invoice.query.get(id)
    if not inv or not inv.transmission_no:
        return jsonify({"status": "NO_TRANSMISSION"})

    inv.status = get_otm_status(inv.transmission_no)
    db.session.commit()
    return jsonify({"status": inv.status})


@bp.route("/xml/<int:id>")
def xml(id):
    inv = Invoice.query.get(id)
    return inv.request_xml, 200, {
        "Content-Type": "application/xml",
        "Content-Disposition": f"attachment; filename={inv.invoice_num}.xml"
    }


@bp.route("/delete/<int:id>", methods=["DELETE"])
def delete(id):
    inv = Invoice.query.get(id)
    db.session.delete(inv)
    db.session.commit()
    return {"status": "deleted"}
