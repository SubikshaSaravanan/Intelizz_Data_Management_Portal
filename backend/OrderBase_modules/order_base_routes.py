import io
import json
import logging
import uuid
import pandas as pd
import requests
import numpy as np
from flask import Blueprint, current_app, jsonify, request, send_file

from ..database import db
from ..config import Config
from .OrderBase_models import OrderBaseFieldConfig, OrderBase
from .OrderBase_service import create_or_update_orderbase, post_to_otm

order_bp = Blueprint('order_bp', __name__)

# Logger setup
logger = logging.getLogger(__name__)

# Core mandatory fields
OB_CORE_FIELDS = [
    "orderBaseXid",
    "domainName",
    "sourceLocationGid",
    "destLocationGid"
]

def trigger_fallback(message):
    return jsonify({"error": message}), 400

def get_otm_session():
    """Create authenticated session (handles JSESSIONID automatically)"""
    session = requests.Session()
    session.auth = (Config.OTM_USERNAME, Config.OTM_PASSWORD)

    # Establish session (important for OTM)
    try:
        session.get(Config.OTM_BASE_URL, timeout=10)
    except Exception as e:
        logger.warning(f"Session init failed: {str(e)}")

    return session


@order_bp.route("/config", methods=["GET"])
def get_ob_config():
    try:
        configs = OrderBaseFieldConfig.query.order_by(
            OrderBaseFieldConfig.id.asc()
        ).all()

        return jsonify([{
            "key": c.key,
            "label": c.label,
            "display": c.display,
            "section": c.section,
            "required": c.required,
            "type": c.data_type
        } for c in configs]), 200

    except Exception as e:
        logger.error(f"Config fetch error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@order_bp.route("/sync-fields", methods=["POST"])
def sync_ob_metadata():
    try:
        session = get_otm_session()

        base_url = current_app.config.get("OTM_ORDER_URL", "").rstrip('/') + "/orderBases"
        describe_url = current_app.config.get("OTM_ORDER_BASE_METADATA_URL")

        otm_keys = []
        response = None
        describe_success = False

        # 1. Try Describe API
        if describe_url:
            try:
                response = session.get(
                    describe_url,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    params={"q": ""},  
                    timeout=10
                )
                logger.info(f"Describe URL: {describe_url} | Status: {response.status_code}")
                if response.status_code == 200:
                    describe_success = True
            except Exception as e:
                logger.warning(f"Describe endpoint not reached: {str(e)}. Using fallback data API.")

        # Parse Describe response
        if describe_success and response is not None:
            data = response.json()
            attributes = data.get('attributes') or data.get('properties', [])

            if isinstance(attributes, dict):
                attributes = [
                    {**v, "name": k} for k, v in attributes.items()
                ]

            if attributes:
                for attr in attributes:
                    key = attr.get('name')
                    if not key:
                        continue

                    o_type = str(attr.get('type', 'string')).lower()
                    ui_type = (
                        'DateTime' if 'date' in o_type else
                        'Integer' if 'int' in o_type or 'number' in o_type else
                        'String'
                    )
                    is_required = (
                        not attr.get('nullable', True)
                        or key in OB_CORE_FIELDS
                    )

                    otm_keys.append({
                        "key": key,
                        "label": key,
                        "type": ui_type,
                        "required": is_required
                    })

        # 2. Fallback to Data API if describe fails or is empty
        if not otm_keys:
            logger.warning("Switching to Data API fallback to discover keys")
            try:
                fallback_response = session.get(
                    base_url, 
                    headers={"Accept": "application/json"}, 
                    params={"limit": 5}, 
                    timeout=10
                )
                
                if fallback_response.status_code == 200:
                    data = fallback_response.json()
                    items = data.get("items", [])
                    
                    all_keys = set()
                    for item in items:
                        all_keys.update(item.keys())

                    for key in all_keys:
                        otm_keys.append({
                            "key": key,
                            "label": key,
                            "type": "String",
                            "required": key in OB_CORE_FIELDS
                        })
                else:
                    logger.warning(f"Data API fallback returned status: {fallback_response.status_code}")
            except Exception as e:
                logger.warning(f"Fallback Data API failed: {str(e)}")

        # 3. Ultimate Fallback (Default to Core Fields)
        if not otm_keys:
            logger.warning("Both APIs failed or returned no data. Defaulting to OB_CORE_FIELDS.")
            for key in OB_CORE_FIELDS:
                otm_keys.append({
                    "key": key,
                    "label": key,
                    "type": "String",
                    "required": True
                })

        # Database Sync
        for item in otm_keys:
            field = OrderBaseFieldConfig.query.filter_by(
                key=item['key']
            ).first()

            if not field:
                db.session.add(OrderBaseFieldConfig(
                    key=item['key'],
                    label=item['label'],
                    data_type=item['type'],
                    required=item['required'],
                    section=(
                        'system'
                        if item['key'] in OB_CORE_FIELDS
                        else 'child'
                    ),
                    display=(
                        True
                        if item['key'] in OB_CORE_FIELDS
                        else False
                    )
                ))
            else:
                field.data_type = item['type']
                field.required = item['required']

        db.session.commit()

        return jsonify({
            "message": f"Synced {len(otm_keys)} fields",
            "source": (
                "describe"
                if describe_success
                else "fallback"
            )
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Sync error: {str(e)}")
        return trigger_fallback(f"Internal Error: {str(e)}")


@order_bp.route("/config/update", methods=["POST"])
def update_config():
    try:
        data = request.json.get("configs", [])

        for item in data:
            field = OrderBaseFieldConfig.query.filter_by(key=item["key"]).first()
            if field:
                field.display = item.get("display", False)
                field.required = item.get("required", False)
                field.label = item.get("label", field.label)

        db.session.commit()
        return jsonify({"message": "Saved successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@order_bp.route("/export-template", methods=["GET"])
def export_template():
    try:
        fields = OrderBaseFieldConfig.query.filter_by(display=True).all()
        columns = [f.label for f in fields]
        df = pd.DataFrame(columns=columns)

        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)

        return send_file(
            output,
            download_name="orderbase_template.xlsx",
            as_attachment=True
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500



def sanitize_for_json(obj):
    """Recursively convert numpy types to standard python types."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    elif isinstance(obj, (np.int64, np.int32, np.integer)):
        return int(obj)
    elif isinstance(obj, (np.float64, np.float32, np.floating)):
        return float(obj)
    elif pd.isna(obj):
        return None
    return obj

@order_bp.route("/bulk-upload", methods=["POST"])
def bulk_upload_orders():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        df = pd.read_excel(file)
        
        configs = {c.label: c.key for c in OrderBaseFieldConfig.query.all()}
        
        # 1. Group the dataframe by Order ID
        grouped = df.groupby("orderBaseXid")
        
        uploaded_count = 0

        for xid, group in grouped:
            first_row = group.iloc[0].to_dict()
            
            clean_payload = {}
            for label, value in first_row.items():
                if pd.isna(value): continue
                key = configs.get(label, label)
                clean_payload[key] = value

            # 2. Add the multiple ship units logic
            ship_units = []
            for i, (_, row) in enumerate(group.iterrows(), start=1):
                unit_row = row.to_dict()
                unit_item = {configs.get(l, l): v for l, v in unit_row.items() if pd.notna(v)}
                unit_item['obShipUnitXid'] = f"{xid}_{i}"
                ship_units.append(unit_item)

            # 3. Update the payload and calculate totals
            clean_payload['shipUnits'] = ship_units
            
            # Using .item() or the sanitize function fixes the numpy type issue
            clean_payload['totalWeight'] = group['weight'].sum() if 'weight' in group.columns else clean_payload.get('weight')
            clean_payload['totalVolume'] = group['volume'].sum() if 'volume' in group.columns else clean_payload.get('volume')

            # --- THE FIX ---
            # Convert all numpy types to standard Python types
            final_payload = sanitize_for_json(clean_payload)

            # This now saves correctly to the JSON column in your DB
            create_or_update_orderbase(final_payload)
            uploaded_count += 1

        db.session.commit()
        return jsonify({"message": f"Successfully uploaded {uploaded_count} unique orders"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Upload error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@order_bp.route("/sync-to-otm", methods=["POST"])
def sync_to_otm():
    try:
        pending_orders = OrderBase.query.filter_by(otm_sync_status="PENDING").all()

        if not pending_orders:
            return jsonify({"message": "No pending orders found. Automatic retry is disabled."}), 200

        success_count = 0
        results = []

        for order in pending_orders:
            data = order.to_dict()
            if not data.get("sourceLocationGid") or not data.get("destLocationGid"):
                order.otm_sync_status = "FAILED"
                results.append({"xid": order.order_base_xid, "error": "Missing Locations"})
                continue

            is_success = post_to_otm(order)
            
            if is_success:
                success_count += 1
            else:
                results.append({"xid": order.order_base_xid, "status": "Failed"})

        db.session.commit()
        return jsonify({
            "processed": len(pending_orders),
            "success": success_count,
            "details": results
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500