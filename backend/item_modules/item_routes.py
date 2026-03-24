from datetime import datetime
import json
import pandas as pd                    
from io import BytesIO                 
from flask import Blueprint, request, jsonify, send_file  
from .item_model import FieldConfig
from ..database import db
from .item_service import (
    bulk_create_items,
    create_item,
    get_otm_item_metadata,
    list_items
)

item_bp = Blueprint("item_bp", __name__)


# --- 1. BULK UPLOAD LOGIC ---

@item_bp.route("/bulk-upload", methods=["POST"])
def bulk_upload():
    """Endpoint to handle Excel file uploads for bulk item creation."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Ensure it's an Excel file
    if file and file.filename.endswith(('.xlsx', '.xls')):
        try:
            # Executes the logic we fixed in the service layer
            results = bulk_create_items(file)
            
            # Generate a quick summary for the UI
            success_count = sum(1 for r in results if r['status'] == 'SUCCESS')
            fail_count = sum(1 for r in results if r['status'] == 'FAILED')
            
            return jsonify({
                "message": "Bulk processing complete.",
                "summary": {
                    "total": len(results),
                    "success": success_count, 
                    "failed": fail_count
                },
                "details": results # Full list for the table view
            }), 200
        except Exception as e:
            return jsonify({"error": f"Bulk processing failed: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file format. Please upload an Excel file."}), 400


# --- 3. EXCEL TEMPLATE MANAGEMENT ---
@item_bp.route("/export-template", methods=["GET"])
def export_template():
    """Generates an empty Excel data-entry template based on UI configuration."""
    try:
        # 1. Fetch only the fields the user has set to 'display' in FieldConfigManager
        active_configs = FieldConfig.query.filter_by(display=True).order_by(FieldConfig.id.asc()).all()
        
        # 2. Create a list of keys to serve as Excel Headers (e.g., itemXid, domainName)
        headers = [c.key for c in active_configs]
        
        # 3. Create an empty DataFrame with these headers
        df = pd.DataFrame(columns=headers)
        
        # 4. Add a sample row with default values to guide the user
        sample_row = {c.key: (c.default_value if c.default_value else "") for c in active_configs}
        df = pd.concat([df, pd.DataFrame([sample_row])], ignore_index=True)

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Item_Upload_Template')
        
        output.seek(0)
        
        # 5. Return the file with a timestamped filename
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'OTM_Bulk_Template_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@item_bp.route("/upload-template-json", methods=["POST", "OPTIONS"])
def upload_template_json():
    """Updates FieldConfigs from a JSON payload (Save Changes button)."""
    # 1. Handle Pre-flight request
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        for item in data:
            key = item.get('key')
            if not key:
                continue

            # Find existing field in DB
            cfg = FieldConfig.query.filter_by(key=key).first()
            if not cfg:
                # Optional: Create if it doesn't exist
                cfg = FieldConfig(key=key)
                db.session.add(cfg)

            # 2. Sync Frontend keys to DB columns
            # cfg.column_name = item.get('frontend_key')
            cfg.label = item.get('label', cfg.label)
            cfg.display = item.get('display', cfg.display)
            cfg.mandatory = item.get('mandatory', cfg.mandatory)
            cfg.default_value = item.get('defaultValue', cfg.default_value)

        db.session.commit()
        return jsonify({"message": "Active configuration saved successfully!"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
# --- 4. OTM SYNC ---

@item_bp.route("/sync-fields", methods=["POST"])
def sync_fields_from_otm():
    try:

        otm_data = get_otm_item_metadata()

        otm_fields = (
            otm_data.get('components', {})
            .get('schemas', {})
            .get('Item', {})
            .get('properties', {})
        )

        required_list = (
            otm_data.get('components', {})
            .get('schemas', {})
            .get('Item', {})
            .get('required', [])
        )

        if not otm_fields:
            return jsonify({"error": "No fields found in OTM metadata"}), 404

        new_count = 0

        for field_key in otm_fields.keys():

            if field_key in ['links', '_self']:
                continue

            is_otm_required = field_key in required_list

            exists = FieldConfig.query.filter_by(key=field_key).first()

            if not exists:

                new_cfg = FieldConfig(
                    key=field_key,
                    display=True,
                    mandatory=is_otm_required,
                    section="core"
                )

                db.session.add(new_cfg)
                new_count += 1

            else:
                exists.mandatory = is_otm_required or exists.mandatory

        db.session.commit()

        return jsonify({"message": f"Synced {new_count} new fields"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
# --- 5. CONFIG & ROOT ---

@item_bp.route("/config", methods=["GET"])
def handle_config():
    """Fetch the current active configuration."""
    configs = FieldConfig.query.order_by(FieldConfig.id.asc()).all()
    return jsonify([c.to_dict() for c in configs]), 200

@item_bp.route("/", methods=["GET", "POST"])
def handle_root():
    if request.method == "POST":
        try:
            data = request.get_json()
            new_item = create_item(data)
            return jsonify({"item_gid": new_item.item_gid, "status": new_item.otm_sync_status}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    items = list_items()
    return jsonify([{"id": i.id, "item_gid": i.item_gid, "status": i.otm_sync_status} for i in items]), 200