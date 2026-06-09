import requests
import json
import logging
import urllib3
import uuid
import pandas as pd
from datetime import datetime
from requests.auth import HTTPBasicAuth
from flask import current_app, jsonify, Blueprint, request
from ..database import db
from .item_model import Item, FieldConfig

item_bp = Blueprint('item', __name__)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_OTM_METADATA_CACHE = None

def set_nested_value(d, path, value):
    """Sets a value in a nested dictionary using a dot-notated path."""
    keys = path.split('.')
    for key in keys[:-1]:
        d = d.setdefault(key, {})
    d[keys[-1]] = value

def get_otm_item_metadata():
    
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

def get_all_otm_item_keys():
    """
    Deep-dives into OTM metadata to extract EVERY available field 
    for the Item Manager.
    """
    metadata = get_otm_item_metadata()
    
    # 1. Locate the Schema definitions
    schemas = metadata.get("components", {}).get("schemas", {}) or metadata.get("definitions", {})
    
    # 2. Find the root 'Item' object
    # OTM typically names this 'Item', 'item', or 'items'
    item_schema = None
    for key in ['Item', 'items', 'item']:
        if key in schemas:
            item_schema = schemas[key]
            break
            
    if not item_schema:
        logging.error("Critical: 'Item' schema not found in OTM Metadata JSON.")
        return []

    # 3. Extract all top-level properties (this includes itemName, itemXid, etc.)
    properties = item_schema.get("properties", {})
    
    # Optional: If you want to identify which ones are 'child' resources 
    # (objects/lists), OTM usually marks them with 'items' or '$ref'.
    all_keys = sorted(list(properties.keys()))
    
    print(f"✅ Found {len(all_keys)} total fields in OTM Item Metadata")
    return all_keys


def filter_otm_payload(payload):
    """Filters payload keys against OTM metadata to prevent 400 errors."""
    metadata = get_otm_item_metadata()
    # Flexible path for OTM Schema
    all_schemas = metadata.get("components", {}).get("schemas", {}) or metadata.get("definitions", {})
    
    item_schema = {}
    for tk in ['Item', 'items', 'item']:
        if tk in all_schemas:
            item_schema = all_schemas[tk]
            break
            
    valid_fields = item_schema.get("properties", {}).keys()
    if not valid_fields:
        return payload

    always_allow = ["itemGid", "itemXid", "itemName", "isActive", "isHazardous"]
    # ❌ We specifically exclude 'domainName' here because it's often read-only in REST
    return {k: v for k, v in payload.items() if k in valid_fields or k in always_allow}

def set_nested_value(d, path, value):
    keys = path.split('.')
    current = d

    otm_child_resources = [
        'itemShipUnit',
        'itemPackagingUnit',
        'itemRemark',
        'itemProductClassification'
    ]

    for i, key in enumerate(keys[:-1]):
        if key in otm_child_resources:
            if key not in current:
                current[key] = []

            # If list is empty → create first object
            if not current[key]:
                current[key].append({})

            # Always work on last object (for grouping)
            current = current[key][-1]
        else:
            current = current.setdefault(key, {})

    current[keys[-1]] = value



def post_to_otm(item_record):
    raw_url = current_app.config.get("OTM_ITEM_URL", "").rstrip("/")
    url = raw_url if raw_url.endswith("/items") else f"{raw_url}/items"

    payload = item_record.payload or {}
    domain = (payload.get("domainName") or "INTL").upper().strip()

    final_payload = {
        "itemGid": item_record.item_gid,
        "itemXid": item_record.item_xid,
        "itemName": item_record.item_name,
        "domainName": domain
    }

    for key, value in payload.items():
        if value is None or value == "" or key in final_payload:
            continue

        # 🔥 ✅ DATE FIX (ONLY ADDITION)
        if key in ["effectiveDate", "expirationDate"]:
            date_str = format_otm_date(value)
            if date_str:
                # OTM requires the {"value": "YYYY-MM-DD"} object format
                final_payload[key] = {"value": date_str}
            continue

        elif key.lower().endswith("gid"):
            val_str = str(value).strip()

            if "nmfc" in key.lower():
                try:
                    val_str = f"{float(val_str):.1f}"
                except:
                    pass

            final_payload[key] = val_str if "." in val_str else f"{domain}.{val_str}"

        elif key == "nmfcCodeGid":
            nmfc_val = str(value).strip()
            final_payload["nmfcClassGid"] = nmfc_val if "." in nmfc_val else f"{domain}.{nmfc_val}"

        elif key == "priority":
            try:
                final_payload[key] = int(value)
            except ValueError:
                final_payload[key] = str(value)

        else:
            final_payload[key] = value

    try:
        print(f"\n--- SENDING TO OTM (Domain: {domain}) ---")
        print(json.dumps(final_payload, indent=2))

        print("NMFC FINAL:", final_payload.get("nmfcClassGid"))

        response = requests.post(
            url,
            params={"upsert": "true"},
            json=final_payload,
            auth=HTTPBasicAuth(
                current_app.config["OTM_USERNAME"],
                current_app.config["OTM_PASSWORD"]
            ),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Requested-By": "OTM"
            },
            timeout=30,
            verify=False
        )

        if response.status_code in [200, 201]:
            print(f"✅ Success: {response.status_code}")
        else:
            print(f"❌ OTM Error {response.status_code}: {response.text}")
            logging.error(f"OTM Response: {response.text}")

        return response

    except Exception as e:
        logging.error(f"Connection Error: {str(e)}")
        return None


def clean_payload(data):
    import pandas as pd

    if isinstance(data, dict):
        return {k: clean_payload(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_payload(i) for i in data]
    elif isinstance(data, pd.Timestamp):
        return data.isoformat()
    return data

def format_otm_date(date_str):
    if not date_str:
        return None
    try:
        dt = datetime.fromisoformat(str(date_str).replace("Z", ""))
        return dt.strftime("%Y-%m-%d") 
    except Exception as e:
        print("Date conversion error:", date_str, e)
        return None
    
def create_item(data):
    """Logic to create item with data cleaning."""
    # Clean all incoming keys from the request/Excel
    clean_data = {str(k).strip(): v for k, v in data.items()}
    clean_data = clean_payload(clean_data)

    clean_data["effectiveDate"] = {
        "value": format_otm_date(clean_data.get("effectiveDate"))
    }

    if clean_data.get("expirationDate"):
        clean_data["expirationDate"] = {
            "value": format_otm_date(clean_data.get("expirationDate"))
        }

    for k, v in clean_data.items():
        if "Date" in k:
            print("AFTER CLEAN:", k, type(v), v)
        
    configs = FieldConfig.query.filter_by(display=True).all()
    for cfg in configs:
        if cfg.mandatory and not clean_data.get(cfg.key):
            raise ValueError(f"Field '{cfg.label or cfg.key}' is mandatory.")

    domain = (clean_data.get("domainName") or "INTL").upper().strip()
    xid = (clean_data.get("itemXid") or "").upper().strip()
    
    if not xid:
        xid = f"ITEM_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:4].upper()}"

    item_gid = f"{domain}.{xid}"
    item = Item.query.filter_by(item_gid=item_gid).first() or Item(item_gid=item_gid)
    
    item.item_xid = xid
    item.item_name = clean_data.get("itemName") or xid
    item.domain_name = domain
    item.payload = clean_data
    print("FINAL CLEAN PAYLOAD:", clean_data)
    
    db.session.add(item)
    db.session.flush()

    response = post_to_otm(item)
    item.otm_sync_status = "SUCCESS" if response and response.status_code in [200, 201, 204] else "FAILED"
    
    db.session.commit()
    return item



def clean_value(val):
    if pd.isna(val):
        return None

    if isinstance(val, (pd.Timestamp, datetime)):
        return val.isoformat()   # keep raw ISO

    return val


def bulk_create_items(row_dict):
    """
    Create ONE Item object from a row dict.
    No DB commit. No OTM call.
    """

    try:
        # ✅ Clean all values
        clean_data = {k.strip(): clean_value(v) for k, v in row_dict.items()}

        # ✅ Required fields (adjust if needed)
        item_xid = clean_data.get("itemXid") or str(uuid.uuid4())
        domain_name = clean_data.get("domainName", "INTL")

        # ✅ Build item_gid
        item_gid = f"{domain_name}.{item_xid}"

        # ✅ Create Item object (NO COMMIT)
        item = Item(
            item_gid=item_gid,
            item_xid=item_xid,
            item_name=clean_data.get("itemName"),
            domain_name=domain_name,
            payload=clean_data,  # JSON safe now
            otm_sync_status="PENDING",
            sync_attempts=0
        )

        return item

    except Exception as e:
        logging.error(f"Item creation failed: {str(e)}")
        raise

def list_items(limit=50, offset=0):
    return Item.query.order_by(Item.id.desc()).offset(offset).limit(limit).all()

def delete_item(item_id):
    item = Item.query.get(item_id)
    if item:
        db.session.delete(item)
        db.session.commit()
        return True
    return False