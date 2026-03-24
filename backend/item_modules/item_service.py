import requests
import json
import logging
import urllib3
import urllib.parse
import uuid
import pandas as pd
from datetime import datetime
from requests.auth import HTTPBasicAuth
from flask import current_app
from ..database import db
from .item_model import Item
from .item_model import FieldConfig

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_OTM_METADATA_CACHE = None

def get_otm_item_metadata():
    global _OTM_METADATA_CACHE
    if _OTM_METADATA_CACHE:
        return _OTM_METADATA_CACHE
    try:
        url = current_app.config.get("OTM_METADATA_URL", "").rstrip("/")
        if not url:
            return {}
            
        if "metadata-catalog" not in url:
            url = f"{url}/metadata-catalog/items"

        response = requests.get(
            url,
            auth=HTTPBasicAuth(current_app.config["OTM_USERNAME"], current_app.config["OTM_PASSWORD"]),
            headers={"Accept": "application/json"},
            timeout=15,
            verify=False
        )
        if response.status_code == 200:
            data = response.json()
            _OTM_METADATA_CACHE = data
            return data
        return {}
    except Exception as e:
        logging.error(f"Metadata fetch failed: {str(e)}")
        return {}

def filter_otm_payload(payload):
    metadata = get_otm_item_metadata()
    properties = (metadata.get("components", {}).get("schemas", {}).get("Item", {}).get("properties", {}))
    valid_fields = properties.keys()

    if not valid_fields:
        return payload

    always_allow = ["itemGid", "itemXid", "itemName", "domainName", "isActive", "isHazardous"]
    return {k: v for k, v in payload.items() if k in valid_fields or k in always_allow}

def post_to_otm(item_record):
    raw_url = current_app.config.get("OTM_ITEM_URL", "").rstrip("/")
    if not raw_url:
        logging.error("OTM_ITEM_URL not configured")
        return None
        
    url = raw_url if raw_url.endswith("/items") else f"{raw_url}/items"

    auth = HTTPBasicAuth(
        current_app.config["OTM_USERNAME"], 
        current_app.config["OTM_PASSWORD"]
    )

    otm_payload = {
        "itemGid": item_record.item_gid,
        "itemXid": item_record.item_xid,
        "itemName": item_record.item_name,
        "domainName": item_record.domain_name
    }

    reserved = ["itemGid", "itemXid", "itemName", "domainName"]
    if item_record.payload:
        for k, v in item_record.payload.items():
            if k not in reserved and k not in ["isActive", "isHazardous"] and v not in ["", None, [], {}]:
                otm_payload[k] = v

    otm_payload = filter_otm_payload(otm_payload)

    try:
        logging.info(f"Syncing to OTM: {item_record.item_gid}")
        response = requests.post(
            url,
            params={"upsert": "true"},
            json=otm_payload,
            auth=auth,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=30,
            verify=False
        )
        return response
    except Exception as e:
        logging.error(f"OTM Connection Error: {str(e)}")
        return None

def bulk_create_items(file):
    try:
        # 1. Load Excel
        df = pd.read_excel(file)
        
        # FIX 1: Replace all NaN (empty cells) with None globally.
        # This prevents the "Token 'NaN' is invalid" error in PostgreSQL.
        df = df.where(pd.notnull(df), None)
        
        results = []
        for _, row in df.iterrows():
            # Convert row to dict and remove None values to keep data clean
            item_data = {k: v for k, v in row.to_dict().items() if v is not None}
            
            try:
                # Reuse existing robust creation logic
                new_item = create_item(item_data)
                results.append({
                    "itemXid": new_item.item_xid,
                    "status": "SUCCESS",
                    "otm_status": new_item.otm_sync_status
                })
            except Exception as e:
                # FIX 2: Clear the "poisoned" transaction state.
                # If one row fails, you MUST rollback so the next row can try again.
                db.session.rollback()
                
                logging.error(f"Row failed: {item_data.get('itemXid')} - {str(e)}")
                results.append({
                    "itemXid": item_data.get("itemXid", "Unknown"),
                    "status": "FAILED",
                    "error": str(e)
                })
        return results
    except Exception as e:
        logging.error(f"Excel parsing failed: {str(e)}")
        raise

def create_item(data):
    configs = FieldConfig.query.filter_by(display=True).all()
    for cfg in configs:
        if cfg.mandatory and not data.get(cfg.key):
            raise ValueError(f"Field '{cfg.label or cfg.key}' is mandatory.")

    domain = (data.get("domainName") or "INTL").upper().strip()
    
    xid = (data.get("itemXid") or "").upper().strip()
    if not xid:
        timestamp = datetime.now().strftime("%Y%m%d")
        random_suffix = uuid.uuid4().hex[:4].upper()
        xid = f"ITEM_{timestamp}_{random_suffix}"
        logging.info(f"No itemXid provided. Auto-generated: {xid}")

    item_gid = f"{domain}.{xid}"
    item_name = data.get("itemName") or xid

    item = Item.query.filter_by(item_gid=item_gid).first()
    if not item:
        item = Item(item_gid=item_gid)
        db.session.add(item)

    item.item_xid = xid
    item.item_name = item_name
    item.domain_name = domain
    item.payload = data
    item.otm_sync_status = "PENDING"
    
    db.session.flush()

    response = post_to_otm(item)

    if response and response.status_code in [200, 201, 204]:
        safe_gid = urllib.parse.quote(item.item_gid)
        base_url = current_app.config["OTM_ITEM_URL"].rstrip("/")
        verify_base = base_url if base_url.endswith("/items") else f"{base_url}/items"
        verify_url = f"{verify_base}/{safe_gid}"

        try:
            verify = requests.get(
                verify_url,
                auth=HTTPBasicAuth(current_app.config["OTM_USERNAME"], current_app.config["OTM_PASSWORD"]),
                headers={"Accept": "application/json"},
                timeout=15,
                verify=False
            )
            
            if verify.status_code == 200:
                item.otm_sync_status = "SUCCESS"
                logging.info(f"Sync Verified for {item.item_gid}")
            else:
                item.otm_sync_status = "FAILED"
        except Exception as e:
            item.otm_sync_status = "FAILED"
            logging.error(f"Verification Step Failed: {str(e)}")
    else:
        item.otm_sync_status = "FAILED"
        if response is not None:
            logging.error(f"OTM Rejected Request ({response.status_code}): {response.text}")
        else:
            logging.error("OTM Sync Failed: No response from server.")

    db.session.commit()
    return item

def get_item(item_id):
    return Item.query.get_or_404(item_id)

def list_items(limit=50, offset=0):
    return Item.query.order_by(Item.id.desc()).offset(offset).limit(limit).all()

def delete_item(item_id):
    item = Item.query.get(item_id)
    if item:
        db.session.delete(item)
        db.session.commit()
        return True
    return False

def get_otm_reference_data(resource_path, field_name):
    try:
        raw_url = current_app.config.get("OTM_METADATA_URL", "").rstrip("/")
        if "/metadata-catalog" not in raw_url:
             # Basic safety if the URL doesn't contain the expected string
             base_url = raw_url 
        else:
             base_url = raw_url.split("/metadata-catalog")[0]
             
        url = f"{base_url}/{resource_path}"
        response = requests.get(
            url,
            auth=HTTPBasicAuth(current_app.config["OTM_USERNAME"], current_app.config["OTM_PASSWORD"]),
            params={"limit": 100},
            timeout=15,
            verify=False
        )
        if response.status_code == 200:
            data = response.json()
            return [i.get(field_name) for i in data.get("items", []) if i.get(field_name)]
        return []
    except Exception as e:
        logging.error(f"Reference data fetch failed: {str(e)}")
        return []