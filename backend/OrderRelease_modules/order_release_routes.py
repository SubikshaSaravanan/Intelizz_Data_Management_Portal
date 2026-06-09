from flask import Blueprint, request, jsonify, send_file, current_app
import requests
from requests.auth import HTTPBasicAuth
import pandas as pd
import numpy as np
from io import BytesIO

from ..database import db 
from .OrderRelease_models import OTMFieldRegistry, UserFieldPreference
from .service import OTMOrderReleaseService

order_release_bp = Blueprint('order_release_bp', __name__)


# =========================================================
# 1. SYNC FIELDS FROM OTM CATALOG
# =========================================================
@order_release_bp.route('/sync-from-otm', methods=['POST'])
def sync_from_otm():
    try:
        config = current_app.config
        metadata_url = config.get("OTM_ORDERRELEASE_METADATA_URL")
        username = config.get("OTM_USERNAME")
        password = config.get("OTM_PASSWORD")

        headers = {"Accept": "application/json"}
        auth = HTTPBasicAuth(username, password)

        response = requests.get(metadata_url, headers=headers, auth=auth, timeout=15)

        if response.status_code != 200:
            return jsonify({"status": "error", "message": f"Oracle returned {response.status_code}"}), 400

        data = response.json()
        schemas = data.get("components", {}).get("schemas", {})
        order_release_schema = schemas.get("orderReleases", {})
        properties = order_release_schema.get("properties", {})

        if not properties:
            return jsonify({"status": "error", "message": "No schema properties found"}), 400

        synced_count = 0

        for db_path, attributes in properties.items():

            display_name = attributes.get("title") or db_path.replace('_', ' ').title()
            data_type = attributes.get("type", "string")
            is_read_only = attributes.get("readOnly", False)

            field = OTMFieldRegistry.query.filter_by(otm_db_path=db_path).first()

            if not field:
                field = OTMFieldRegistry(
                    display_name=display_name,
                    otm_db_path=db_path,
                    field_group="readonly_attributes" if is_read_only else "system",
                    data_type=data_type,
                    is_required=False
                )
                db.session.add(field)
                synced_count += 1
            else:
                field.data_type = data_type

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Synced {synced_count} fields"
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(str(e))
        return jsonify({"status": "error", "message": str(e)}), 500


# =========================================================
# 2. FETCH FIELDS
# =========================================================
@order_release_bp.route('/fields', methods=['GET'])
def get_available_fields():
    fields = OTMFieldRegistry.query.all()

    return jsonify([
        {
            "id": f.id,
            "display_name": f.display_name,
            "otm_db_path": f.otm_db_path,
            "group": f.field_group,
            "is_required": f.is_required
        }
        for f in fields
    ])


# =========================================================
# 3. SAVE CONFIG
# =========================================================
@order_release_bp.route('/save-config', methods=['POST'])
def save_config():
    data = request.json

    user_id = data.get('user_id')
    selected_fields = data.get('fields', [])

    pref = UserFieldPreference.query.filter_by(user_id=user_id).first()

    if pref:
        pref.selected_fields = selected_fields
    else:
        pref = UserFieldPreference(
            user_id=user_id,
            selected_fields=selected_fields
        )
        db.session.add(pref)

    db.session.commit()

    return jsonify({"status": "success"}), 200


# =========================================================
# 4. DOWNLOAD TEMPLATE
# =========================================================
@order_release_bp.route('/download-template/<user_id>', methods=['GET'])
def download_template(user_id):
    pref = UserFieldPreference.query.filter_by(user_id=user_id).first()

    if not pref or not pref.selected_fields:
        return jsonify({"error": "No configuration found"}), 404

    df = pd.DataFrame(columns=list(pref.selected_fields))

    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False)

    output.seek(0)

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="OTM_Order_Release_Template.xlsx"
    )


# =========================================================
# 5. UPLOAD EXCEL (CONSOLIDATED BULK PROCESSING)
# =========================================================
@order_release_bp.route('/upload', methods=['POST'])
def upload_excel():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    user_id = request.form.get('user_id', 'SYSTEM')

    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        config = current_app.config

        # Initialize the updated bulk-ready service
        otm_service = OTMOrderReleaseService(
            order_release_url=config.get("OTM_ORDERRELEASE_URL"),
            username=config.get("OTM_USERNAME"),
            password=config.get("OTM_PASSWORD")
        )

        df = pd.read_excel(BytesIO(file.read()))

        # Fix NaN values properly
        df = df.replace({np.nan: None})

        if df.empty:
            return jsonify({"error": "Empty Excel file"}), 400

        # Maintain a map of orderReleaseXid -> list of (row_number, row_dict)
        grouped_orders = {}
        
        for index, row in df.iterrows():
            excel_row = row.to_dict()
            row_number = index + 2  # Excel row numbers are 1-indexed, plus 1 for header
            
            order_id = excel_row.get("orderReleaseXid")
            if not order_id:
                # Handle edge cases where a row lacks an ID immediately
                grouped_orders[f"UNKNOWN_ROW_{row_number}"] = [(row_number, excel_row)]
                continue

            if order_id not in grouped_orders:
                grouped_orders[order_id] = []
            
            grouped_orders[order_id].append((row_number, excel_row))

        results = []

        # Process each Order Release as a single structural payload
        for order_id, row_tuples in grouped_orders.items():
            # Extract row indices and raw dictionaries
            row_numbers = [item[0] for item in row_tuples]
            rows_data = [item[1] for item in row_tuples]

            try:
                if "UNKNOWN_ROW" in order_id:
                    raise ValueError("Missing orderReleaseXid column value on this row")

                # Send the entire list of rows for this specific Order Release ID
                res = otm_service.post_bulk_order_release(order_id, rows_data)

                results.append({
                    "excel_rows": row_numbers,
                    "order_release_id": res.get("id"),
                    "status": res.get("status"),
                    "error": res.get("error")
                })

            except Exception as row_error:
                results.append({
                    "excel_rows": row_numbers,
                    "order_release_id": order_id if "UNKNOWN_ROW" not in order_id else None,
                    "status": "Failed",
                    "error": str(row_error)
                })

        failed_count = sum(1 for r in results if r["status"] != "Success")

        return jsonify({
            "message": f"Processed {len(df)} lines into {len(grouped_orders)} unique Order Releases with {failed_count} failures",
            "summary": results
        }), 200

    except Exception as e:
        current_app.logger.error(str(e))
        return jsonify({"error": str(e)}), 500