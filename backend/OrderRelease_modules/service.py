import json
import requests
from typing import Dict, List


class OTMOrderReleaseService:

    def __init__(self, order_release_url: str, username: str, password: str):
        if not order_release_url:
            raise ValueError("❌ OTM_ORDERRELEASE_URL is missing in config.py")

        self.endpoint = order_release_url
        self.auth = (username, password)
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def safe_date(self, value):
        return {"value": value} if value else None

    def safe_float(self, value, default=1.0):
        try:
            if value is None or str(value).strip() == "" or str(value).lower() == "nan":
                return default
            v = float(value)
            return v if v > 0 else default
        except:
            return default

    def safe_str(self, value):
        if value is None or str(value).strip() == "" or str(value).lower() == "nan":
            return None
        return str(value).strip()

    def is_valid_value(self, value):
        """Validates if an Excel field contains actual dimensional data."""
        if value is None:
            return False
        val_str = str(value).strip().lower()
        return val_str != "" and val_str != "nan"

    def prepare_bulk_payload(
        self, order_release_id: str, rows: List[Dict]
    ) -> Dict:
        """Groups multiple Excel rows under a single Order Release header payload.

        Supports AUTO_CALC, ONE_TO_ONE, and SHIP_UNITS structures seamlessly.
        """
        # Grab common fields from the first row in the group
        first_row = rows[0]
        release_method = (
            first_row.get("releaseMethodGid", "ONE_TO_ONE") or "ONE_TO_ONE"
        )
        
        domain = "SKYMFG/DEMO"

        base_payload = {
            "orderReleaseXid": self.safe_str(order_release_id),
            "isTemplate": False,
            "releaseMethodGid": release_method,
            "domainName": domain,
            "priority": 1,
            "sourceLocation": {"locationGid": first_row.get("sourceLocationGid")},
            "destinationLocation": {
                "locationGid": first_row.get("destLocationGid")
            },
            "earlyPickupDate": self.safe_date(first_row.get("earlyPickupDate")),
            "latePickupDate": self.safe_date(first_row.get("latePickupDate")),
            "earlyDeliveryDate": self.safe_date(
                first_row.get("earlyDeliveryDate")
            ),
            "lateDeliveryDate": self.safe_date(first_row.get("lateDeliveryDate")),
            "transportHandlingUnitGid": first_row.get(
                "transportHandlingUnitGid"
            ),
        }

        # Step 1: Populate underlying transaction lines node at root level (Required by all release methods)
        items_payload = []
        for row in rows:
            line_xid = self.safe_str(row.get("orderReleaseLineXid") or row.get("orderReleaseLineGid"))
            
            line_item = {
                "orderReleaseLineXid": line_xid,
                "packagedItemGid": row.get("packagedItemGid", "DEFAULT") or "DEFAULT",
                "weight": {
                    "value": self.safe_float(row.get("weightValue")),
                    "unit": row.get("weightUnit", "LB"),
                },
                "volume": {
                    "value": self.safe_float(row.get("volumeValue")),
                    "unit": row.get("volumeUnit", "CUFT"),
                },
            }
            items_payload.append(line_item)

        base_payload["lines"] = {"items": items_payload}

        # Step 2: If method is SHIP_UNITS, overlay and bind the shipUnits array container to those root lines
        if release_method in ["SHIP_UNITS", "SHIP_UNIT"]:
            base_payload["bundlingType"] = "AUTOMATIC"
            base_payload["isSplittable"] = True

            ship_units_items = []
            for idx, row in enumerate(rows, start=1):
                ship_unit_xid = row.get("shipUnitXid") or f"SU_{order_release_id}_{idx}"
                line_xid = self.safe_str(row.get("orderReleaseLineXid") or row.get("orderReleaseLineGid"))
                
                # Protect database validation by confirming domain presence on line pointers
                full_line_gid = f"{domain}.{line_xid}" if "." not in line_xid else line_xid

                weight_val = self.safe_float(row.get("weightValue"))
                weight_unit = row.get("weightUnit", "LB")
                volume_val = self.safe_float(row.get("volumeValue"))
                volume_unit = row.get("volumeUnit", "CUFT")

                # Extract dimensional properties from row data
                length_val = row.get("length")
                width_val = row.get("width")
                height_val = row.get("height")

                ship_unit_node = {
                    "shipUnitXid": self.safe_str(ship_unit_xid),
                    "shipUnitCount": 1,
                    "isSplitable": True,
                    "transportHandlingUnitGid": row.get("transportHandlingUnitGid"),
                    "unitWeight": {
                        "value": weight_val,
                        "unit": weight_unit
                    },
                    "unitVolume": {
                        "value": volume_val,
                        "unit": volume_unit
                    },
                    "totalGrossWeight": {
                        "value": weight_val, 
                        "unit": weight_unit
                    },
                    "totalGrossVolume": {
                        "value": volume_val,
                        "unit": volume_unit
                    },
                    "lines": {
                        "items": [
                            {
                                "shipUnitLineNo": idx,
                                "orderReleaseLineGid": full_line_gid,
                                "weight": {
                                    "value": weight_val,
                                    "unit": weight_unit
                                },
                                "volume": {
                                    "value": volume_val,
                                    "unit": volume_unit
                                },
                                "itemPackageCount": int(self.safe_float(row.get("itemPackageCount"), 1.0)),
                                "packagedItemGid": row.get("packagedItemGid", "DEFAULT") or "DEFAULT"
                            }
                        ]
                    }
                }

                # Map Length, Width, and Height per Ship Unit individually if they exist
                if self.is_valid_value(length_val):
                    ship_unit_node["length"] = {
                        "value": self.safe_float(length_val),
                        "unit": row.get("lengthUnit") or "FT"
                    }
                if self.is_valid_value(width_val):
                    ship_unit_node["width"] = {
                        "value": self.safe_float(width_val),
                        "unit": row.get("widthUnit") or "FT"
                    }
                if self.is_valid_value(height_val):
                    ship_unit_node["height"] = {
                        "value": self.safe_float(height_val),
                        "unit": row.get("heightUnit") or "FT"
                    }

                ship_units_items.append(ship_unit_node)

            base_payload["shipUnits"] = {"items": ship_units_items}

        return base_payload

    def post_bulk_order_release(self, order_release_id: str, rows: List[Dict]):
        payload = self.prepare_bulk_payload(order_release_id, rows)

        try:
            response = requests.post(
                self.endpoint,
                auth=self.auth,
                headers=self.headers,
                json=payload,
                timeout=30,
            )

            print("\n================ OTM REQUEST ================\n")
            print(json.dumps(payload, indent=2))

            print("\n================ OTM RESPONSE ================")
            print("Status Code:", response.status_code)
            try:
                response_json = response.json()
                print(json.dumps(response_json, indent=2))
            except:
                response_json = {"raw": response.text}
                print(response.text)
            print("=============================================\n")

            if response.status_code in [200, 201]:
                return {
                    "id": order_release_id,
                    "status": "Success",
                    "otm_response": response_json,
                }

            error_msg = response_json.get("detail", response.text) if "detail" in response_json else response.text
            return {
                "id": order_release_id,
                "status": "Failed",
                "error": error_msg,
                "otm_response": response_json,
            }

        except Exception as e:
            print("\n🔥 OTM EXCEPTION:", str(e))
            return {"id": order_release_id, "status": "Error", "message": str(e)}