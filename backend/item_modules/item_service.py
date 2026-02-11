import requests
import json
import logging
import urllib3
from requests.auth import HTTPBasicAuth
from flask import current_app
from database import db
from .item_model import Item
from item_modules.item_model import FieldConfig
 
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
 
# ======================================================
# 1. FETCH OTM ITEM METADATA (Schema)
# ======================================================
 
def get_otm_item_metadata():
    try:
        url = current_app.config["OTM_METADATA_URL"].rstrip("/")
        if "metadata-catalog" not in url:
            url = f"{url}/metadata-catalog/items"
 
        response = requests.get(
            url,
            auth=HTTPBasicAuth(
                current_app.config["OTM_USERNAME"],
                current_app.config["OTM_PASSWORD"]
            ),
            headers={"Accept": "application/json"},
            timeout=15,
            verify=False
        )
 
        if response.status_code == 200:
            return response.json()
 
        logging.error(f"OTM metadata fetch failed: {response.status_code}")
        return {}
 
    except Exception as e:
        logging.error(f"OTM metadata exception: {str(e)}")
        return {}
 
# ======================================================
# 2. FILTER PAYLOAD USING OTM SCHEMA (CRITICAL)
# ======================================================
 
def filter_otm_payload(payload):
    metadata = get_otm_item_metadata()
 
    valid_fields = (
        metadata.get("components", {})
        .get("schemas", {})
        .get("Item", {})
        .get("properties", {})
        .keys()
    )
 
    if not valid_fields:
        return payload  # fallback (do not block)
 
    return {k: v for k, v in payload.items() if k in valid_fields}
 
# ======================================================
# 3. POST / UPSERT ITEM INTO OTM (ONLY RELIABLE WAY)
# ======================================================
 
def post_to_otm(item_record):
    raw_url = current_app.config["OTM_ITEM_URL"].rstrip("/")
    base_url = raw_url.split("/items")[0]
    url = f"{base_url}/items"
 
    auth = HTTPBasicAuth(
        current_app.config["OTM_USERNAME"],
        current_app.config["OTM_PASSWORD"]
    )
 
    # ---- MINIMUM SAFE PAYLOAD ----
    otm_payload = {
        "itemGid": item_record.item_gid,
        "itemXid": item_record.item_xid,
        "itemName": item_record.item_name,
        "domainName": item_record.domain_name,
 
        # VERY IMPORTANT DEFAULTS
        "isActive": True,
        "isHazardous": False
    }
 
    # ---- ADD EXTRA FIELDS (ONLY IF VALID) ----
    reserved = ["itemGid", "itemXid", "itemName", "domainName"]
    for k, v in item_record.payload.items():
        if k not in reserved and v not in ["", None, [], {}]:
            otm_payload[k] = v
 
    # ---- FILTER AGAINST OTM SCHEMA ----
    otm_payload = filter_otm_payload(otm_payload)
 
    try:
        logging.info(f"Upserting item into OTM: {item_record.item_gid}")
 
        response = requests.post(
            url,
            params={"upsert": "true"},
            json=otm_payload,
            auth=auth,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=30,
            verify=False
        )
 
        return response
 
    except Exception as e:
        logging.error(f"OTM sync fatal error: {str(e)}")
        return None
 
# ======================================================
# 4. CREATE ITEM (LOCAL + OTM SYNC)
# ======================================================
 
def create_item(data):
    # ---- 1. UI MANDATORY FIELD VALIDATION ----
    configs = FieldConfig.query.filter_by(display=True).all()
    for cfg in configs:
        if cfg.mandatory and not data.get(cfg.key):
            raise ValueError(f"Field '{cfg.label or cfg.key}' is mandatory.")
 
    # ---- 2. DOMAIN & XID ----
    domain = (data.get("domainName") or "INTL").upper().strip()
    xid = (data.get("itemXid") or "").upper().strip()
 
    if not xid:
        raise ValueError("itemXid is required.")
 
    item_gid = f"{domain}.{xid}"
 
    # ---- 3. NAME HANDLING ----
    item_name = data.get("itemName") or xid
 
    # ---- 4. UPSERT LOCAL DB ----
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
 
    # ---- 5. SYNC TO OTM ----
    response = post_to_otm(item)
 
    # ---- 6. VERIFY OTM PERSISTENCE (DO NOT TRUST STATUS) ----
    if response and response.status_code in [200, 201, 204]:
        verify_url = (
            current_app.config["OTM_ITEM_URL"].rstrip("/") +
            f"/{item.item_gid}"
        )
 
        verify = requests.get(
            verify_url,
            auth=HTTPBasicAuth(
                current_app.config["OTM_USERNAME"],
                current_app.config["OTM_PASSWORD"]
            ),
            headers={"Accept": "application/json"},
            timeout=15,
            verify=False
        )
 
        if verify.status_code == 200:
            item.otm_sync_status = "SUCCESS"
        else:
            item.otm_sync_status = "FAILED"
            logging.error("OTM accepted request but item not persisted")
 
    else:
        item.otm_sync_status = "FAILED"
        error = response.text if response else "OTM timeout"
        logging.error(f"OTM sync failed: {error}")
 
    db.session.commit()
    return item
 
# ======================================================
# 5. HELPERS
# ======================================================
 
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
        raw_url = current_app.config["OTM_METADATA_URL"].rstrip("/")
        base_url = raw_url.split("/metadata-catalog")[0]
        url = f"{base_url}/{resource_path}"
 
        response = requests.get(
            url,
            auth=HTTPBasicAuth(
                current_app.config["OTM_USERNAME"],
                current_app.config["OTM_PASSWORD"]
            ),
            params={"limit": 100},
            timeout=15,
            verify=False
        )
 
        if response.status_code == 200:
            return [i.get(field_name) for i in response.json().get("items", [])]
 
        return []
 
    except Exception:
        return []