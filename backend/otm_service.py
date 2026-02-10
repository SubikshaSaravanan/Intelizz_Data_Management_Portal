import requests
from lxml import etree
from config import Config
import base64

# ============================================================
# NAMESPACES
# ============================================================
NS = {
    "dbxml": "http://xmlns.oracle.com/apps/otm/DBXML",
    "otm": "http://xmlns.oracle.com/apps/otm/transmission/v6.4"
}


# ============================================================
# POST XML TO OTM
# ============================================================
def post_to_otm(xml_bytes):

    print("📤 Sending XML to OTM...")

    response = requests.post(
        Config.OTM_URL,
        data=xml_bytes,
        headers={"Content-Type": "application/xml"},
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=120
    )

    raw_xml = response.text
    transmission_no = None

    try:
        root = etree.fromstring(raw_xml.encode())

        node = root.find(
            ".//otm:ReferenceTransmissionNo",
            namespaces=NS
        )

        if node is not None:
            transmission_no = int(node.text.strip())
            print("✅ Transmission No:", transmission_no)

    except Exception as e:
        print("❌ Transmission parse error:", e)

    return raw_xml, transmission_no


# ============================================================
# GET TRANSMISSION STATUS
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

    response = requests.post(
        Config.OTM_DBXML_URL,
        data=sql,
        headers={"Content-Type": "application/xml"},
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=60
    )

    root = etree.fromstring(response.text.encode())
    node = root.find(".//I_Transmission")

    if node is not None:
        return node.attrib.get("STATUS", "UNKNOWN")

    return "UNKNOWN"


# ============================================================
# FETCH ERROR MESSAGE FROM I_LOG
# ============================================================
def get_transmission_error_report(transmission_no):

    sql = f"""
    <sql2xml>
      <Query>
        <RootName>I_LOG</RootName>
        <Statement>
          SELECT I_MESSAGE_CODE, I_MESSAGE_TEXT
          FROM I_LOG
          WHERE I_TRANSMISSION_NO = {transmission_no}
            AND WRITTEN_BY = 'InvoiceInterface'
        </Statement>
      </Query>
    </sql2xml>
    """

    response = requests.post(
        Config.OTM_DBXML_URL,
        data=sql,
        headers={"Content-Type": "application/xml"},
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=60
    )

    root = etree.fromstring(response.text.encode())

    errors = []

    for log in root.findall(".//I_LOG"):

        code = log.attrib.get("I_MESSAGE_CODE")
        encoded_msg = log.attrib.get("I_MESSAGE_TEXT")

        decoded_msg = None

        if encoded_msg:
            try:
                decoded_msg = base64.b64decode(encoded_msg).decode("utf-8")
            except Exception:
                decoded_msg = encoded_msg

        errors.append(f"{code} : {decoded_msg}")

    return "\n".join(errors)