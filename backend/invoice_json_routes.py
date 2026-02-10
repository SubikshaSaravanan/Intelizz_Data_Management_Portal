import requests
from flask import Blueprint, request, jsonify
from config import Config
from models import InvoiceJson
from database import db
import json

invoice_json_routes = Blueprint("invoice_json_routes", __name__)


# ------------------------------------------------------
# Extract invoice GID from OTM link
# ------------------------------------------------------
def extract_gid(href):
    if not href:
        return None
    return href.split("/invoices/")[-1]


# ======================================================
# CREATE INVOICE (POST TO OTM)
# ======================================================
@invoice_json_routes.route("/invoice/json", methods=["POST"])
def create_invoice():

    payload = request.json

    record = InvoiceJson(
        invoice_xid=payload.get("invoiceXid"),
        invoice_number=payload.get("invoiceNumber"),
        request_json=payload,
        status="SUBMITTED"
    )

    db.session.add(record)
    db.session.commit()

    headers = {
        "Content-Type":
            "application/vnd.oracle.resource+json;type=singular",
        "Accept":
            "application/vnd.oracle.resource+json"
    }

    response = requests.post(
        f"{Config.OTM_REST_URL}/invoices",
        json=payload,
        headers=headers,
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=120
    )

    if response.status_code in (200, 201):
        data = response.json()
        record.invoice_gid = data.get("links", [{}])[0].get("href")
        record.response_json = data
        record.status = "CREATED"
    else:
        record.status = "ERROR"
        record.error_message = response.text

    db.session.commit()

    return jsonify(response.json()), response.status_code


# ======================================================
# LIST ALL JSON INVOICES
# ======================================================
@invoice_json_routes.route("/invoice/json", methods=["GET"])
def list_invoices():

    rows = InvoiceJson.query.order_by(
        InvoiceJson.created_at.desc()
    ).all()

    return jsonify([
        {
            "id": r.id,
            "invoice_xid": r.invoice_xid,
            "invoice_number": r.invoice_number,
            "invoice_gid": r.invoice_gid,
            "status": r.status,
            "error_message": r.error_message,
            "request_json": r.request_json
        }
        for r in rows
    ])


# ======================================================
# GET INVOICE FROM OTM
# ======================================================
@invoice_json_routes.route("/invoice/json/otm/<int:id>", methods=["GET"])
def get_invoice_from_otm(id):

    inv = InvoiceJson.query.get(id)

    if not inv or not inv.invoice_gid:
        return {"error": "Invoice GID not found"}, 404

    gid = extract_gid(inv.invoice_gid)

    response = requests.get(
        f"{Config.OTM_REST_URL}/invoices/{gid}",
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        headers={
            "Accept": "application/vnd.oracle.resource+json"
        },
        timeout=120
    )

    return response.json(), response.status_code


# ======================================================
# UPDATE INVOICE IN OTM
# ======================================================
@invoice_json_routes.route("/invoice/json/otm/<int:id>", methods=["PATCH"])
def update_invoice_otm(id):

    inv = InvoiceJson.query.get(id)

    if not inv or not inv.invoice_gid:
        return {"error": "Invoice GID not found"}, 404

    gid = extract_gid(inv.invoice_gid)
    payload = request.json

    headers = {
        "Content-Type":
            "application/vnd.oracle.resource+json;type=singular",
        "Accept":
            "application/vnd.oracle.resource+json"
    }

    response = requests.patch(
        f"{Config.OTM_REST_URL}/invoices/{gid}",
        json=payload,
        headers=headers,
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=120
    )

    if response.status_code in (200, 204):
        inv.request_json = payload
        inv.status = "UPDATED_IN_OTM"
        db.session.commit()

    return (
        response.json() if response.text else {},
        response.status_code
    )


# # ======================================================
# # DELETE INVOICE FROM OTM
# # ======================================================
# @invoice_json_routes.route("/invoice/json/otm/<int:id>", methods=["DELETE"])
# def delete_invoice_otm(id):

#     inv = InvoiceJson.query.get(id)

#     if not inv or not inv.invoice_gid:
#         return {"error": "Invoice GID not found"}, 404

#     gid = extract_gid(inv.invoice_gid)

#     response = requests.delete(
#         f"{Config.OTM_REST_URL}/invoices/{gid}",
#         auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
#         timeout=120
#     )

#     if response.status_code in (200, 204):
#         db.session.delete(inv)
#         db.session.commit()

#     return {"message": "Invoice deleted from OTM"}, response.status_code
@invoice_json_routes.route("/invoice/json/upload", methods=["POST"])
def upload_invoice_json():

    file = request.files.get("file")

    if not file:
        return {"error": "No file uploaded"}, 400

    try:
        payload = json.load(file)
    except Exception:
        return {"error": "Invalid JSON file"}, 400

    headers = {
        "Content-Type":
            "application/vnd.oracle.resource+json;type=singular",
        "Accept":
            "application/vnd.oracle.resource+json"
    }

    response = requests.post(
        f"{Config.OTM_REST_URL}/invoices",
        json=payload,
        headers=headers,
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=120
    )

    return response.json(), response.status_code
