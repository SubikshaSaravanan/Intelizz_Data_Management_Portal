import json
from flask import Blueprint, request, jsonify
from .item_model import FieldConfig, Template
from io import BytesIO
import pandas as pd
from flask import send_file
from .item_service import (
    create_item,
    get_otm_item_metadata,
    list_items
)

item_bp = Blueprint("item_bp", __name__)



# --- 3. EXCEL TEMPLATE MANAGEMENT ---

@item_bp.route("/export-template", methods=["GET"])
def export_template():
    """Generates an Excel file with the current field configurations."""
    try:
        configs = FieldConfig.query.order_by(FieldConfig.id.asc()).all()
        data = [c.to_dict() for c in configs]
        
        # Flatten for Excel
        df = pd.DataFrame(data)
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='FieldConfigs')
        
        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='Item_UI_Template.xlsx'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@item_bp.route("/upload-template", methods=["POST"])
def upload_template():
    """Updates FieldConfigs from an uploaded Excel file."""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        df = pd.read_excel(file)
        data = df.to_dict(orient='records')

        for item in data:
            key = item.get('key')
            if not key:
                continue

            cfg = FieldConfig.query.filter_by(key=key).first()
            if not cfg:
                cfg = FieldConfig(key=key)
                db.session.add(cfg)

            # Map Excel/Frontend keys to DB columns
            cfg.label = item.get('label', cfg.label)
            # Handle Boolean conversion from Excel (might be 1/0 or True/False)
            cfg.display = str(item.get('display', cfg.display)).lower() in ['true', '1', 'yes']
            cfg.mandatory = str(item.get('mandatory', cfg.mandatory)).lower() in ['true', '1', 'yes']
            cfg.default_value = item.get('defaultValue', item.get('default_value', cfg.default_value))
            cfg.section = item.get('section', cfg.section) or 'core'

        db.session.commit()
        return jsonify({"message": "Active configuration updated from Excel successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- 4. OTM SYNC ---

@item_bp.route("/sync-fields", methods=["POST"])
def sync_fields_from_otm():
    """Pull fresh metadata from OTM."""
    try:
        otm_data = get_otm_item_metadata()
        otm_fields = (otm_data.get('components', {}).get('schemas', {})
                             .get('items', {}).get('properties', {}))
        
        if not otm_fields:
            return jsonify({"error": "No fields found in OTM metadata"}), 404

        new_count = 0
        for field_key in otm_fields.keys():
            if field_key in ['links', '_self']: 
                continue
                
            exists = FieldConfig.query.filter_by(key=field_key).first()
            if not exists:
                new_cfg = FieldConfig(
                    key=field_key, 
                    label="", 
                    default_value="", 
                    display=False, 
                    mandatory=False,
                    section="core"
                )
                db.session.add(new_cfg)
                new_count += 1
                
        db.session.commit()
        return jsonify({"message": f"Successfully synced {new_count} new fields."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Sync failed: {str(e)}"}), 500

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