import pandas as pd
from lxml import etree
from datetime import datetime, UTC
from dateutil import parser as date_parser

NS = "http://xmlns.oracle.com/apps/otm/transmission/v6.4"


def to_glog_date(value):
    dt = date_parser.parse(str(value), dayfirst=True)
    return dt.strftime("%Y%m%d%H%M%S")


def e(parent, tag, text=None):
    el = etree.SubElement(parent, f"{{{NS}}}{tag}")
    if text is not None:
        el.text = str(text)
    return el


def build_invoice_xml(invoice_rows):
    first = invoice_rows.iloc[0]

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
    e(ph, "DomainName", first.DOMAIN)

    ig = e(ph, "InvoiceGid")
    gid = e(ig, "Gid")
    e(gid, "DomainName", first.DOMAIN)
    e(gid, "Xid", first.INVOICE_XID)

    e(ph, "TransactionCode", "IU")
    e(ph, "InvoiceNum", first.INVOICE_NUM)

    inv_date = e(ph, "InvoiceDate")
    e(inv_date, "GLogDate", to_glog_date(first.INVOICE_DATE))
    e(inv_date, "TZId", "UTC")
    e(inv_date, "TZOffset", "+00:00")

    ref = e(ph, "InvoiceRefnum")
    rq = e(ref, "InvoiceRefnumQualifierGid")
    rqg = e(rq, "Gid")
    e(rqg, "Xid", "BM")
    e(ref, "InvoiceRefnumValue", first.INVOICE_NUM)

    spg = e(ph, "ServiceProviderGid")
    spgid = e(spg, "Gid")
    e(spgid, "DomainName", first.DOMAIN)
    e(spgid, "Xid", first.SERVICE_PROVIDER)

    spal = e(ph, "ServiceProviderAlias")
    spalq = e(spal, "ServiceProviderAliasQualifierGid")
    spalqg = e(spalq, "Gid")
    e(spalqg, "Xid", "GLOG")
    e(spal, "ServiceProviderAliasValue", f"{first.DOMAIN}.{first.SERVICE_PROVIDER}")

    e(ph, "GlobalCurrencyCode", first.CURRENCY)

    # ---------- LINE ITEMS ----------
    pmd = e(payment, "PaymentModeDetail")
    gd = e(pmd, "GenericDetail")

    line_no = 1
    total_amount = 0.0

    for _, row in invoice_rows.iterrows():
        gli = e(gd, "GenericLineItem")
        e(gli, "AssignedNum", str(line_no))

        lir = e(gli, "LineItemRefNum")
        e(lir, "LineItemRefNumValue", row.SHIPMENT_GID)
        lirq = e(lir, "LineItemRefNumQualifierGid")
        lirqg = e(lirq, "Gid")
        e(lirqg, "Xid", "GLOG")

        cile = e(gli, "CommonInvoiceLineElements")
        com = e(cile, "Commodity")
        e(com, "Description", row.COST_TYPE)

        fr = e(cile, "FreightRate")
        fc = e(fr, "FreightCharge")
        fa = e(fc, "FinancialAmount")
        e(fa, "GlobalCurrencyCode", row.CURRENCY)
        e(fa, "MonetaryAmount", f"{row.AMOUNT:.4f}")
        e(fa, "RateToBase", "1.0")
        e(fa, "FuncCurrencyAmount", "0.0")

        ctg = e(gli, "CostTypeGid")
        ctgid = e(ctg, "Gid")
        e(ctgid, "Xid", row.COST_TYPE)

        total_amount += float(row.AMOUNT)
        line_no += 1

    # ---------- SUMMARY ----------
    ps = e(payment, "PaymentSummary")
    psfc = e(ps, "FreightCharge")
    psfa = e(psfc, "FinancialAmount")
    e(psfa, "GlobalCurrencyCode", first.CURRENCY)
    e(psfa, "MonetaryAmount", f"{total_amount:.4f}")
    e(ps, "InvoiceTotal", "1")

    xml_bytes = etree.tostring(root, pretty_print=True, encoding="UTF-8", xml_declaration=True)
    xml_string = etree.tostring(root, pretty_print=True, encoding="unicode")

    return xml_bytes, xml_string
