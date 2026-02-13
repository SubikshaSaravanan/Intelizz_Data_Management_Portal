import json
from flask import Blueprint, request, jsonify
from item_modules.item_model import FieldConfig, db
from item_modules.item_service import (
    create_item,
    get_otm_item_metadata,
    list_items
)

item_bp = Blueprint("item_bp", __name__)



# --- 2. LIVE FIELD CONFIGURATION (UPDATE DB) ---

@item_bp.route("/upload-template-json", methods=["POST"])
def upload_template_json():
    """Processes field configurations and saves them to the active FieldConfig table."""
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({"error": "Data must be a list of field configurations"}), 400

        for item in data:
            key = item.get('key')
            if not key:
                continue

            cfg = FieldConfig.query.filter_by(key=key).first()
            if not cfg:
                cfg = FieldConfig(key=key)
                db.session.add(cfg)

            # Map frontend keys to DB columns
            cfg.label = item.get('label', cfg.label)
            cfg.display = bool(item.get('display', cfg.display))
            cfg.mandatory = bool(item.get('mandatory', cfg.mandatory))
            cfg.default_value = item.get('defaultValue', item.get('default_value', cfg.default_value))

        db.session.commit()
        return jsonify({"message": "Active configuration updated successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- 3. OTM SYNC ---

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

# --- 4. CONFIG & ROOT ---

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