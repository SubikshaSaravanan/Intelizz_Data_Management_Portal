
import json
import logging
import io
import pandas as pd
import uuid
from datetime import datetime
import pytz
import requests
from requests.auth import HTTPBasicAuth
from flask import Blueprint, current_app, jsonify, request, send_file

from ..database import db
from .OrderBase_models import OrderBase, OrderBaseFieldConfig
from ..config import Config

# Blueprint and Logger Setup
order_bp = Blueprint('order_bp', __name__)
logger = logging.getLogger(__name__)

# --- HELPERS ---

def sanitize_for_json(obj):
    """Recursively convert datetime / pandas Timestamp to JSON-safe format"""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    elif isinstance(obj, pd.Timestamp):
        return obj.to_pydatetime().isoformat()
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj


def qualify_gid(val, domain="SKYMFG/DEMO"):
    """Ensures GID is in DOMAIN.XID format."""
    if not val or str(val).lower() == 'none':
        return None
    val_str = str(val).strip()
    return val_str if "." in val_str else f"{domain.upper()}.{val_str}"


def format_date(val):
    """Return strict OTM-compatible datetime with timezone"""

    if val is None or str(val).strip() in ["", "NaT", "nan"]:
        return None

    # Convert pandas Timestamp
    if isinstance(val, pd.Timestamp):
        val = val.to_pydatetime()

    # Convert string (Excel input)
    if isinstance(val, str):
        try:
            val = pd.to_datetime(val).to_pydatetime()
        except Exception:
            return None

    if not isinstance(val, datetime):
        return None

    # Attach timezone (IST)
    tz = pytz.timezone("Asia/Kolkata")

    if val.tzinfo is None:
        val = tz.localize(val)
    else:
        val = val.astimezone(tz)

    # Return ISO format WITHOUT microseconds
    return val.isoformat(timespec='seconds')


# --- DATABASE LOGIC ---

def create_or_update_orderbase(data):
    """Saves or updates a local record safely"""
    try:
        payload = sanitize_for_json(data or {})

        domain = str(payload.get("domainName", "SKYMFG/DEMO")).upper().strip()
        xid = str(payload.get("orderBaseXid", "")).strip()

        if not xid:
            raise ValueError("orderBaseXid is required for upload")

        gid = qualify_gid(xid, domain)
        name = payload.get("orderBaseName") or xid

        existing = OrderBase.query.filter_by(order_base_gid=gid).first()

        if existing:
            existing.order_base_xid = xid
            existing.order_base_name = name
            existing.domain_name = domain
            existing.payload = payload
            existing.otm_sync_status = "PENDING"
            order = existing
        else:
            order = OrderBase(
                order_base_gid=gid,
                order_base_xid=xid,
                order_base_name=name,
                domain_name=domain,
                payload=payload,
                otm_sync_status="PENDING",
                created_at=datetime.utcnow()
            )
            db.session.add(order)

        db.session.commit()
        return order

    except Exception as e:
        logger.error(f"Database Error: {str(e)}")
        db.session.rollback()
        raise

# --- OTM INTEGRATION LOGIC ---

def post_to_otm(order_record):
    try:
        # 1. Access the payload stored in the database
        data = order_record.payload 
        
        domain = str(data.get("domainName", "SKYMFG/DEMO")).upper().strip()
        xid = data.get("orderBaseXid")

        def qualify(val):
            if not val or str(val).lower() == "none":
                return None
            v = str(val).strip()
            return v if "." in v else f"{domain}.{v}"

        def safe_float(value, default=0.0):
            try:
                return float(value)
            except (TypeError, ValueError):
                return default

        # -----------------------------
        # BUILD SHIP UNITS LIST
        # -----------------------------
        otm_ship_units = []
        
        for unit in data.get("shipUnits", []):
            weight = safe_float(unit.get("weight"))
            volume = safe_float(unit.get("volume"))
            
            current_unit = {
                "obShipUnitXid": unit.get("obShipUnitXid"),
                "transportHandlingUnitGid": qualify(unit.get("transportHandlingUnitGid", "FSC_PALLET")),
                "shipUnitCount": 1,
                "sourceLocationGid": qualify(unit.get("sourceLocationGid")),
                "destLocationGid": qualify(unit.get("destLocationGid")),
                "weight": {"value": weight, "unit": "LB"},
                "volume": {"value": volume, "unit": "CUFT"},
                "length": {"value": safe_float(unit.get("length", 4)), "unit": "FT"},
                "width": {"value": safe_float(unit.get("width", 4)), "unit": "FT"},
                "height": {"value": safe_float(unit.get("height", 4)), "unit": "FT"},
                "flexCommodityCode": qualify(unit.get("flexCommodityCode", "TEST")),
                "netWeight": {"value": safe_float(unit.get("netWeight")), "unit": "LB"},
                "netVolume": {"value": safe_float(unit.get("netVolume")), "unit": "CUFT"},
                "pickupIsAppt": False,
                "deliveryIsAppt": False,
                
                # --- ADDED: ACCESSORIALS ---
                "accessorials": {
                    "items": [
                        {
                            "accessorialCodeGid": unit.get("accessorialCodeGid", "HAZARDOUS")
                        }
                    ]
                },
                
                # --- ADDED: SPECIAL SERVICES ---
                "specialServices": {
                    "items": [
                        {
                            "specialServiceGid": unit.get("specialServiceGid", "TRANSPORT")
                        }
                    ]
                }
            }

            # Handle Dates
            early = format_date(unit.get("earlyPickupDate"))
            late = format_date(unit.get("lateDeliveryDate"))
            if early: current_unit["earlyPickupDate"] = {"value": early}
            if late: current_unit["lateDeliveryDate"] = {"value": late}

            # Handle Involved Parties
            contact = unit.get("involvedPartyContactGid")
            if contact and str(contact).lower() != "nan":
                current_unit["involvedParties"] = {
                    "items": [{
                        "involvedPartyQualGid": unit.get("involvedPartyQualGid", "BILL TO"),
                        "involvedPartyContactGid": qualify(contact),
                        "comMethodGid": unit.get("comMethodGid", "EMAIL")
                    }]
                }
            
            otm_ship_units.append(current_unit)

        # -----------------------------
        # FINAL PAYLOAD
        # -----------------------------
        otm_payload = {
            "orderBaseXid": xid,
            "orderTypeGid": "PURCHASE_ORDER",
            "isTemplate": False,
            "releaseMethodGid": "SHIP_UNITS",
            "bundlingType": "AUTOMATIC",
            "priority": 1,
            "domainName": domain,
            "totalWeight": {"value": safe_float(data.get("totalWeight")), "unit": "LB"},
            "totalVolume": {"value": safe_float(data.get("totalVolume")), "unit": "CUFT"},
            "shipUnits": {
                "items": otm_ship_units 
            }
        }

        otm_payload = sanitize_for_json(otm_payload)

        # POST TO OTM logic remains same...
        response = requests.post(
            Config.OTM_ORDER_URL,
            json=otm_payload,
            headers={"Content-Type": "application/json", "X-Requested-By": "OTM_INTEGRATION"},
            auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
            timeout=60
        )
        if response.status_code in (200, 201, 202):
            order_record.otm_sync_status = "SUCCESS"
        else:
            order_record.otm_sync_status = "FAILED"

        db.session.commit()
        return True

    except Exception as e:
        logger.error(f"Internal Logic Error: {str(e)}")
        db.session.rollback()
        return False  