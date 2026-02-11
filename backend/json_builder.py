import pandas as pd
from datetime import datetime
from uuid import uuid4


def build_invoice_json_from_excel(excel_file, field_mapping=None):
    df = pd.read_excel(excel_file)
    return build_invoice_json_from_dataframe(df, field_mapping)


def build_invoice_json_from_dataframe(df, field_mapping=None):
    print("📊 EXCEL/DF COLUMNS:", df.columns.tolist())

    header = df.iloc[0]
    now = datetime.utcnow().isoformat()

    # Helper to get value based on mapping or default
    def get_val(field_id, default_col):
        col_name = field_mapping.get(field_id) if field_mapping else default_col
        if not col_name or col_name not in df.columns:
            col_name = default_col
        
        val = header.get(col_name) if col_name in df.columns else None
        if isinstance(val, list):
            return val
        return str(val) if val is not None else None

    # For line items
    def get_row_val(row, field_id, default_col):
        col_name = field_mapping.get(field_id) if field_mapping else default_col
        if not col_name or col_name not in df.columns:
            col_name = default_col
        
        val = row.get(col_name) if col_name in df.columns else None
        if isinstance(val, list):
            return val
        return val

    payload = {
        "domainName": "INTL",
        "invoiceXid": f"{get_val('invoiceXid', 'INVOICE_XID')}_{uuid4().hex[:6]}",
        "invoiceNumber": get_val('invoiceNumber', 'INVOICE_NUM'),
        "invoiceType": "STANDARD",
        "invoiceSource": "MANUAL",
        "servprovAliasQualGid": "GLOG",
        "servprovAliasValue": get_val('serviceProvider', 'SERVICE_PROVIDER'),
        "currencyGid": get_val('currencyGid', 'CURRENCY') or "INR",
        "invoiceDate": {"value": now, "timezone": "UTC"},
        "dateReceived": {"value": now, "timezone": "UTC"},
        "refnums": {
            "items": [
                {
                    "invoiceRefnumQualGid": "BM",
                    "invoiceRefnumValue": get_val('invoiceNumber', 'INVOICE_NUM'),
                    "domainName": "INTL"
                }
            ]
        },
        "lineItems": {"items": []}
    }

    for idx, row in df.iterrows():
        # Safeguard amount parsing
        amount_val = get_row_val(row, 'amount', 'AMOUNT')
        try:
            f_amount = float(amount_val) if amount_val and str(amount_val).strip() else 0.0
        except ValueError:
            f_amount = 0.0

        payload["lineItems"]["items"].append({
            "lineitemSeqNo": idx + 1,
            "description": "",
            "freightCharge": {
                "value": f_amount,
                "currency": payload["currencyGid"]
            },
            "processAsFlowThru": False,
            "costTypeGid": get_row_val(row, 'costTypeGid', 'COST_TYPE') or "GENERIC",
            "domainName": "INTL",
            "costRefs": {
                "items": [{"shipmentCostQualGid": "SHIPMENT_COST", "domainName": "INTL"}]
            }
        })

    return payload
