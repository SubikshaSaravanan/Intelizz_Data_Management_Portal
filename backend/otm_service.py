import time
import requests
from lxml import etree
from config import Config

# ============================================================
# NAMESPACES
# ============================================================
NS = {
    "dbxml": "http://xmlns.oracle.com/apps/otm/DBXML",
    "otm": "http://xmlns.oracle.com/apps/otm/transmission/v6.4"
}


# ============================================================
# POST XML
# ============================================================
def post_to_otm(xml_bytes):

    r = requests.post(
        Config.OTM_URL,
        data=xml_bytes,
        headers={"Content-Type": "application/xml"},
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=120
    )

    raw = r.text
    transmission_no = None

    try:
        root = etree.fromstring(raw.encode())
        node = root.find(".//otm:ReferenceTransmissionNo", NS)
        if node is not None:
            transmission_no = node.text.strip()
    except Exception as e:
        print("Transmission parse error:", e)

    return raw, transmission_no


# ============================================================
# GET STATUS
# ============================================================
def get_otm_status(transmission_no):

    sql = f"""
    <sql2xml>
      <Query>
        <RootName>I_Transmission</RootName>
        <Statement>
          SELECT STATUS
          FROM I_Transmission
          WHERE I_Transmission_No = {transmission_no}
        </Statement>
      </Query>
    </sql2xml>
    """

    r = requests.post(
        Config.OTM_DBXML_URL,
        data=sql,
        headers={"Content-Type": "application/xml"},
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD)
    )

    root = etree.fromstring(r.text.encode())
    node = root.find(".//I_Transmission")

    if node is not None:
        return node.attrib.get("STATUS", "UNKNOWN")

    return "UNKNOWN"


# ============================================================
# ✅ FINAL ERROR FETCH (OTM EXPERT VERSION)
# ============================================================
def get_transmission_error_report(transmission_no):

    sql = f"""
    <sql2xml>
      <Query>
        <RootName>I_Transmission</RootName>
        <Statement>
          SELECT I_MESSAGE_CODE     
            FROM i_log
          WHERE i_transmission_no = {transmission_no}
            AND WRITTEN_BY = 'InvoiceInterface'
          ORDER BY log_id DESC
        </Statement>
      </Query>
    </sql2xml>
    """

    # 🔁 Retry because OTM writes logs asynchronously
    for attempt in range(6):

        r = requests.post(
            Config.OTM_DBXML_URL,
            data=sql,
            headers={"Content-Type": "application/xml"},
            auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD)
        )

        root = etree.fromstring(r.text.encode())

        errors = []

        # 🔥 CORRECT NAMESPACE SEARCH
        nodes = root.findall(
            ".//dbxml:I_Transmission",
            namespaces=NS
        )

        for node in nodes:

            code = node.attrib.get("I_MESSAGE_CODE", "")

            message = (
                node.attrib.get("CAST(I_MESSAGE_TEXTASVARCHAR(1000))")
                or node.attrib.get("CAST(I_MESSAGE_TEXT AS VARCHAR(1000))")
                or ""
            )

            if code or message:
                errors.append(f"{code}: {message}")

        if errors:
            return "\n\n".join(errors)

        # wait for OTM async job
        time.sleep(10)

    return None
