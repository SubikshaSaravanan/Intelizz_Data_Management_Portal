from datetime import datetime
import pandas as pd
import requests
import logging
from requests.auth import HTTPBasicAuth
from flask import Blueprint, request, jsonify, current_app
from ..database import db
from .item_service import bulk_create_items, post_to_otm
from .item_model import FieldConfig  # Needed for the /config route
import io
from flask import send_file

_OTM_METADATA_CACHE = {}


# item_modules/item_routes.py

# Import your models and service functions

# 1. Verify this name matches what you use in decorators
item_bp = Blueprint("items", __name__)

import re

@item_bp.route("/sync-fields", methods=["POST"])
def sync_fields():
    try:
        from .item_service import get_all_otm_item_keys
        
        # This now gets the full list of property keys from OTM
        otm_keys = get_all_otm_item_keys()
        
        if not otm_keys:
            return jsonify({"error": "Failed to fetch keys from OTM metadata"}), 400

        new_count = 0
        for key in otm_keys:
            exists = FieldConfig.query.filter_by(key=key).first()
            if not exists:
                # Create a readable label (e.g., itemXid -> Item Xid)
                readable_label = key.replace("item", "Item ").replace("Gid", " ID").strip()
                
                new_field = FieldConfig(
                    key=key,
                    label=readable_label,
                    display=True, # Default to showing new fields
                    mandatory=False
                )
                db.session.add(new_field)
                new_count += 1
        
        db.session.commit()
        return jsonify({"message": f"Sync complete. Added {new_count} new fields."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


def get_otm_item_metadata():
    """Fetches OTM metadata with robust error handling."""
    global _OTM_METADATA_CACHE
    if _OTM_METADATA_CACHE:
        return _OTM_METADATA_CACHE
    try:
        url = current_app.config.get("OTM_METADATA_URL", "").rstrip("/")
        user = current_app.config.get("OTM_USERNAME")
        pw = current_app.config.get("OTM_PASSWORD")
        
        if not url or not user:
            raise ValueError("OTM Configuration missing (URL/User)")
            
        if "metadata-catalog" not in url:
            url = f"{url}/metadata-catalog/items"

        response = requests.get(
            url,
            auth=HTTPBasicAuth(user, pw),
            headers={"Accept": "application/json"},
            timeout=15,
            verify=False
        )
        if response.status_code == 200:
            data = response.json()
            _OTM_METADATA_CACHE = data
            return data
        raise Exception(f"Metadata fetch failed: {response.status_code}")
    except Exception as e:
        logging.error(f"Metadata fetch error: {str(e)}")
        return {}

@item_bp.route("/otm-keys", methods=["GET"])
def fetch_otm_keys():
    """Fetches valid field keys directly from OTM's metadata catalog."""
    try:
        from .item_service import get_all_otm_item_keys
        keys = get_all_otm_item_keys()
        
        if not keys:
            return jsonify({"error": "No keys found or OTM unreachable"}), 404
            
        return jsonify({
            "count": len(keys),
            "keys": sorted(keys)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



def clean_value(val):
    if pd.isna(val):
        return None
    if isinstance(val, (pd.Timestamp, datetime)):
        return val.isoformat()
    return val

@item_bp.route("/config", methods=["GET"])
def get_config():
    """✅ FIXED: Added missing route to stop 404 errors"""
    try:
        configs = FieldConfig.query
        return jsonify([{
            "key": c.key, 
            "label": c.label, 
            "mandatory": c.mandatory
        } for c in configs]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    


@item_bp.route("/config/update", methods=["POST"])
def update_config():
    try:
        data = request.get_json()
        if not isinstance(data, list):
            # Handle if frontend sends { "fields": [...] }
            data = data.get("fields", [])

        # 1. RESET EVERYTHING TO HIDDEN
        # This is the most important line to fix your problem.
        FieldConfig.query.update({FieldConfig.display: False})
        
        # 2. ENABLE ONLY SELECTED FIELDS
        for field_data in data:
            key = field_data.get("key")
            # Only update if the frontend says display is True
            if field_data.get("display") is True:
                config = FieldConfig.query.filter_by(key=key).first()
                if config:
                    config.display = True
                    config.mandatory = field_data.get("mandatory", False)
                else:
                    # If sync missed it, create it now as 'display=True'
                    new_field = FieldConfig(
                        key=key,
                        label=field_data.get("label", key),
                        display=True,
                        mandatory=field_data.get("mandatory", False)
                    )
                    db.session.add(new_field)

        db.session.commit()
        return jsonify({"message": "Database updated and filtered successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500





@item_bp.route("/export-template", methods=["GET"])
def export_template():
    try:
        db.session.expire_all()
        
        # 1. Fetch user selections
        selected_configs = FieldConfig.query.filter_by(display=True).all()
        selected_keys = [c.key for c in selected_configs]
        
        # 2. FORCE include mandatory OTM fields
        mandatory_fields = ["itemXid", "itemName","domainName"]
        final_columns = mandatory_fields + [k for k in selected_keys if k not in mandatory_fields]

        df = pd.DataFrame(columns=final_columns)
        output = io.BytesIO()

        # Use xlsxwriter but REMOVE worksheet.protect()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Template')
            workbook = writer.book
            worksheet = writer.sheets['Template']

            # NO worksheet.protect() here. Let the sheet stay 100% open.

            # Formats
            fmt_gray = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3', 'border': 1})
            fmt_blue = workbook.add_format({'bold': True, 'bg_color': '#CCE5FF', 'border': 1})

            for i, col_name in enumerate(final_columns):
                fmt = fmt_gray if col_name in mandatory_fields else fmt_blue
                # Keep the visual (*) but the cell itself stays unlocked
                label = f"{col_name}" if col_name in mandatory_fields else col_name
                worksheet.write(0, i, label, fmt)
                worksheet.set_column(i, i, len(label) + 5)

        output.seek(0)
        
        # 3. Use the exact modern XLSX MimeType
        return send_file(
            output, 
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            as_attachment=True, 
            download_name="OTM_Template.xlsx"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500





@item_bp.route("/bulk-upload", methods=["POST"])
def bulk_upload():
    try:
        # 1. Validation
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({"error": "Invalid file format. Upload Excel only."}), 400

        print(f"📂 File received: {file.filename}")

        # 2. Read Excel
        try:
            df = pd.read_excel(file)
            # Replace NaN with None so JSON/DB handles it correctly
            df = df.where(pd.notnull(df), None)
        except Exception as e:
            return jsonify({"error": f"Excel read failed: {str(e)}"}), 400

        sync_results = []
        success_count = 0
        failed_count = 0

        # 3. Process Rows
        for index, row in df.iterrows():
            try:
                # Strip keys to prevent " itemXid" mismatch
                row_dict = {str(k).strip(): clean_value(v) for k, v in row.to_dict().items()}
                
                # ✅ Logic: Call Service to create the Item Object
                item = bulk_create_items(row_dict) 
                
                if not item:
                    raise Exception("Service failed to initialize item object")

                db.session.add(item)
                
                # ✅ Logic: Call OTM Sync
                # post_to_otm now handles the Smart Prefixing and Date Wrapping
                response = post_to_otm(item)

                if response and response.status_code in [200, 201, 204]:
                    item.otm_sync_status = "SUCCESS"
                    success_count += 1
                else:
                    item.otm_sync_status = "FAILED"
                    failed_count += 1
                    # Capture detailed OTM error if available
                    try:
                        item.otm_error = response.json() if response else "No response"
                    except:
                        item.otm_error = response.text if response else "Unknown Error"

                sync_results.append({
                   "itemXid": item.item_xid, 
                    "status": item.otm_sync_status,
                    "error": getattr(item, 'otm_error', None)
                })

            except Exception as row_error:
                failed_count += 1
                print(f"❌ Row {index} failed: {str(row_error)}")
                sync_results.append({
                    "row_index": index,
                    "status": "FAILED",
                    "error": str(row_error)
                })

        # 4. Save to Database
        db.session.commit()
        
        return jsonify({
            "message": "Upload completed",
            "summary": {
                "total": len(df),
                "success": success_count,
                "failed": failed_count
            },
            "results": sync_results
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Server error", "details": str(e)}), 500