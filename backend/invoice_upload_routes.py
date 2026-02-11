from flask import Blueprint, request, jsonify
import pandas as pd
import os
import json

from json_builder import build_invoice_json_from_excel
from xml_builder import build_invoice_xml

from otm_service import post_to_otm
from otm_rest_service import post_excel_json_invoice_to_otm

from models import Invoice
from database import db

invoice_upload_routes = Blueprint("invoice_upload_routes", __name__)

TEMPLATES_FILE = "invoice_templates.json"

def get_template_full(template_id):
    if not template_id or not os.path.exists(TEMPLATES_FILE):
        return None
    try:
        with open(TEMPLATES_FILE, "r") as f:
            templates = json.load(f)
            return next((t for t in templates if t["id"] == template_id), None)
    except Exception as e:
        print(f"⚠️ Error loading template {template_id}: {e}")
    return None

@invoice_upload_routes.route("/invoice/upload", methods=["POST"])
def upload_invoice():
    print("--- INVOICE UPLOAD REQUEST ---")
    
    file = request.files.get("file")
    process_type = request.form.get("processType")
    template_id = request.form.get("templateId")

    print(f"DEBUG: processType={process_type}, templateId={template_id}, file_present={file is not None}")
    if file:
        print(f"DEBUG: filename={file.filename}")

    if not process_type:
        print("ERROR: processType is missing")
        return {"error": "processType missing"}, 400

    if not file and not template_id:
        print("ERROR: Neither file nor templateId provided")
        return {"error": "Excel file or Template ID must be provided"}, 400

    # Get Template Details
    template = get_template_full(template_id)
    if template_id and not template:
        print(f"ERROR: Template {template_id} not found")
        return {"error": "Template not found"}, 404

    mapping = { f["id"]: f["displayText"] for f in template.get("fields", []) } if template else None
    
    # DATA EXTRACTION
    try:
        if not file:
            print("INFO: Virtual data flow (Template Defaults)")
            # Create a single row dict from template defaults
            virtual_row = {}
            for field in template.get("fields", []):
                col_name = field.get("displayText") or field.get("name")
                default_val = field.get("defaultValue", "")
                
                # Filter empty values from lists
                if isinstance(default_val, list):
                    default_val = [v for v in default_val if str(v).strip()]
                    # If only one item remains, maybe just keep it as a list? 
                    # The requirement says "serialize as an array".
                    
                virtual_row[col_name] = default_val
            
            if not virtual_row:
                print("ERROR: Template has no fields for virtual processing")
                return {"error": "Template has no fields"}, 400
                
            df = pd.DataFrame([virtual_row])
        else:
            print("INFO: File upload flow")
            df = pd.read_excel(file)

        if df.empty:
            print("ERROR: DataFrame is empty")
            return {"error": "No data found to process"}, 400

        print(f"DEBUG: Data loaded success. Rows: {len(df)}")

    except Exception as e:
        print(f"ERROR: Exception during data loading: {str(e)}")
        return {"error": f"Failed to load data: {str(e)}"}, 500

    # PROCESSING
    try:
        if process_type == "xml":
            print("🔁 XML FLOW")
            
            # Helper to get value from Row
            def get_val(row, field_id, default_col):
                col_name = mapping.get(field_id) if mapping else default_col
                if not col_name or col_name not in df.columns:
                    col_name = default_col
                return str(row.get(col_name)) if col_name in df.columns else "MISSING"

            first_row = df.iloc[0]
            invoice_xid = get_val(first_row, "invoiceXid", "INVOICE_XID")
            invoice_num = get_val(first_row, "invoiceNumber", "INVOICE_NUM")

            xml_bytes, xml_string = build_invoice_xml(df, field_mapping=mapping)
            response_xml, transmission_no = post_to_otm(xml_bytes)

            invoice = Invoice(
                invoice_xid=invoice_xid,
                invoice_num=invoice_num,
                transmission_no=transmission_no,
                status="RECEIVED",
                request_xml=xml_string,
                response_xml=response_xml,
                error_message=None
            )
            db.session.add(invoice)
            db.session.commit()
            print("✅ XML SUCCESS")

            return jsonify({
                "message": f"Processed successfully ({'Template' if not file else 'File'})",
                "invoiceXid": invoice_xid,
                "invoiceNumber": invoice_num,
                "transmission_no": transmission_no
            })

        elif process_type == "json":
            print("🔁 JSON FLOW")
            from json_builder import build_invoice_json_from_dataframe
            json_payload = build_invoice_json_from_dataframe(df, field_mapping=mapping)

            otm_response = post_excel_json_invoice_to_otm(json_payload)
            transmission_no = otm_response.get("transmissionNo") or otm_response.get("id")

            invoice = Invoice(
                invoice_xid=json_payload["invoiceXid"],
                invoice_num=json_payload["invoiceNumber"],
                transmission_no=transmission_no,
                status="RECEIVED",
                request_xml=None,
                request_json=json.dumps(json_payload),
                response_xml=str(otm_response),
                error_message=None
            )
            db.session.add(invoice)
            db.session.commit()
            print("✅ JSON SUCCESS")

            return jsonify({
                "message": f"Processed successfully ({'Template' if not file else 'File'})",
                "invoiceXid": json_payload["invoiceXid"],
                "invoiceNumber": json_payload["invoiceNumber"],
                "transmission_no": transmission_no
            })

        else:
            return {"error": "Invalid processType"}, 400

    except Exception as e:
        print(f"❌ PROCESSING ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500
