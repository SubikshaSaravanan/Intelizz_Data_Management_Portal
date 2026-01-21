from flask import Blueprint, request, jsonify
from database import db
from models import InvoiceFieldConfig

invoice_config_bp = Blueprint(
    "invoice_config",
    __name__,
    url_prefix="/api/invoice-config"
)

# -------------------------------
# GET ALL CONFIG
# -------------------------------
@invoice_config_bp.route("", methods=["GET"])
def get_config():
    rows = InvoiceFieldConfig.query.order_by(
        InvoiceFieldConfig.id
    ).all()

    return jsonify([
        {
            "id": r.id,
            "field_name": r.field_name,
            "display_text": r.display_text,
            "default_value": r.default_value,
            "visible": r.visible,
            "disabled": r.disabled,
            "data_type": r.data_type
        }
        for r in rows
    ])


# -------------------------------
# SAVE CONFIG
# -------------------------------
@invoice_config_bp.route("", methods=["POST"])
def save_config():
    data = request.json

    InvoiceFieldConfig.query.delete()

    for row in data:
        db.session.add(
            InvoiceFieldConfig(
                field_name=row["field_name"],
                display_text=row.get("display_text"),
                default_value=row.get("default_value"),
                visible=row.get("visible", True),
                disabled=row.get("disabled", False),
                data_type=row.get("data_type")
            )
        )

    db.session.commit()
    return jsonify({"message": "Saved"})
