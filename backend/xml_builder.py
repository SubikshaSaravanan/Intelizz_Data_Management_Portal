import pandas as pd
from lxml import etree
from datetime import datetime, UTC
from dateutil import parser as date_parser

NS = "http://xmlns.oracle.com/apps/otm/transmission/v6.4"


def to_glog_date(value):
    if not value or str(value).strip().lower() in ["none", "missing", ""]:
        return datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    try:
        dt = date_parser.parse(str(value), dayfirst=True)
        return dt.strftime("%Y%m%d%H%M%S")
    except Exception:
        print(f"⚠️ Failed to parse date: {value}. Using current time.")
        return datetime.now(UTC).strftime("%Y%m%d%H%M%S")

def e(parent, tag, text=None):
    el = etree.SubElement(parent, f"{{{NS}}}{tag}")
    if text is not None:
        # Filter out obvious place holders
        clean_text = str(text)
        if clean_text.lower() in ["none", "missing"]:
            clean_text = ""
        el.text = clean_text
    return el


def build_invoice_xml(invoice_rows, field_mapping=None):
    df = invoice_rows
    if df.empty:
        raise ValueError("Cannot build XML from empty dataframe")
        
    first = df.iloc[0]

    # Helper to get value from Excel based on mapping or default
    def get_val(row, field_id, default_col):
        col_name = field_mapping.get(field_id) if field_mapping else default_col
        if not col_name or col_name not in df.columns:
            col_name = default_col
        
        val = row.get(col_name) if col_name in df.columns else None
        
        if isinstance(val, list):
            return "; ".join([str(v) for v in val if str(v).strip()])
            
        if pd.isna(val) or val is None:
            return ""
        return str(val)

    root = etree.Element(f"{{{NS}}}Transmission", nsmap={"otm": NS})

    # ---------- HEADER ----------
    header = e(root, "TransmissionHeader")
    e(header, "Version", "25c")

    tcd = e(header, "TransmissionCreateDt")
    e(tcd, "GLogDate", datetime.now(UTC).strftime("%Y%m%d%H%M%S"))
    e(tcd, "TZId", "UTC")
    e(tcd, "TZOffset", "+00:00")

    e(header, "GLogXMLElementName", "INVOICE")

    # ---------- BODY ----------
    body = e(root, "TransmissionBody")
    gx = e(body, "GLogXMLElement")
    invoice = e(gx, "Invoice")
    payment = e(invoice, "Payment")

    # ---------- PAYMENT HEADER ----------
    ph = e(payment, "PaymentHeader")
    e(ph, "DomainName", get_val(first, 'domainName', 'DOMAIN') or "INTL")

    ig = e(ph, "InvoiceGid")
    gid = e(ig, "Gid")
    e(gid, "DomainName", get_val(first, 'domainName', 'DOMAIN') or "INTL")
    e(gid, "Xid", get_val(first, 'invoiceXid', 'INVOICE_XID'))

    e(ph, "TransactionCode", "IU")
    e(ph, "InvoiceNum", get_val(first, 'invoiceNumber', 'INVOICE_NUM'))

    inv_date = e(ph, "InvoiceDate")
    e(inv_date, "GLogDate", to_glog_date(get_val(first, 'invoiceDate', 'INVOICE_DATE')))
    e(inv_date, "TZId", "UTC")
    e(inv_date, "TZOffset", "+00:00")

    ref = e(ph, "InvoiceRefnum")
    rq = e(ref, "InvoiceRefnumQualifierGid")
    rqg = e(rq, "Gid")
    e(rqg, "Xid", "BM")
    e(ref, "InvoiceRefnumValue", get_val(first, 'invoiceNumber', 'INVOICE_NUM'))

    spg = e(ph, "ServiceProviderGid")
    spgid = e(spg, "Gid")
    e(spgid, "DomainName", get_val(first, 'domainName', 'DOMAIN') or "INTL")
    e(spgid, "Xid", get_val(first, 'serviceProvider', 'SERVICE_PROVIDER'))

    spal = e(ph, "ServiceProviderAlias")
    spalq = e(spal, "ServiceProviderAliasQualifierGid")
    spalqg = e(spalq, "Gid")
    e(spalqg, "Xid", "GLOG")
    e(spal, "ServiceProviderAliasValue", f"{get_val(first, 'domainName', 'DOMAIN') or 'INTL'}.{get_val(first, 'serviceProvider', 'SERVICE_PROVIDER')}")

    e(ph, "GlobalCurrencyCode", get_val(first, 'currencyGid', 'CURRENCY') or "INR")

    # ---------- LINE ITEMS ----------
    pmd = e(payment, "PaymentModeDetail")
    gd = e(pmd, "GenericDetail")

    line_no = 1
    total_amount = 0.0

    for _, row in df.iterrows():
        gli = e(gd, "GenericLineItem")
        e(gli, "AssignedNum", str(line_no))

        lir = e(gli, "LineItemRefNum")
        e(lir, "LineItemRefNumValue", get_val(row, 'shipmentGid', 'SHIPMENT_GID'))
        lirq = e(lir, "LineItemRefNumQualifierGid")
        lirqg = e(lirq, "Gid")
        e(lirqg, "Xid", "GLOG")

        cile = e(gli, "CommonInvoiceLineElements")
        com = e(cile, "Commodity")
        e(com, "Description", get_val(row, 'costTypeGid', 'COST_TYPE'))

        fr = e(cile, "FreightRate")
        fc = e(fr, "FreightCharge")
        fa = e(fc, "FinancialAmount")
        e(fa, "GlobalCurrencyCode", get_val(row, 'currencyGid', 'CURRENCY') or "INR")
        
        amount_val = get_val(row, 'amount', 'AMOUNT') or "0"
        try:
            f_amount = float(amount_val)
        except ValueError:
            f_amount = 0.0
            
        e(fa, "MonetaryAmount", f"{f_amount:.4f}")
        e(fa, "RateToBase", "1.0")
        e(fa, "FuncCurrencyAmount", "0.0")

        ctg = e(gli, "CostTypeGid")
        ctgid = e(ctg, "Gid")
        e(ctgid, "Xid", get_val(row, 'costTypeGid', 'COST_TYPE'))

        total_amount += f_amount
        line_no += 1

    # ---------- SUMMARY ----------
    ps = e(payment, "PaymentSummary")
    psfc = e(ps, "FreightCharge")
    psfa = e(psfc, "FinancialAmount")
    e(psfa, "GlobalCurrencyCode", get_val(first, 'currencyGid', 'CURRENCY') or "INR")
    e(psfa, "MonetaryAmount", f"{total_amount:.4f}")
    e(ps, "InvoiceTotal", "1")

    xml_bytes = etree.tostring(root, pretty_print=True, encoding="UTF-8", xml_declaration=True)
    xml_string = etree.tostring(root, pretty_print=True, encoding="unicode")

    return xml_bytes, xml_string
