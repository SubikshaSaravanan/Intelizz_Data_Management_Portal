import requests
from lxml import etree
from config import Config

OTM_NS = {"otm": "http://xmlns.oracle.com/apps/otm/transmission/v6.4"}


def post_to_otm(xml_bytes):
    r = requests.post(
        Config.OTM_URL,
        data=xml_bytes,
        headers={"Content-Type": "application/xml"},
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD)
    )

    raw = r.text

    print("\n========== OTM RAW RESPONSE ==========")
    print(raw)
    print("=====================================\n")

    transmission = None

    try:
        root = etree.fromstring(raw.encode())
        node = root.find(".//otm:ReferenceTransmissionNo", namespaces=OTM_NS)
        if node is not None:
            transmission = node.text.strip()
    except Exception as e:
        print("Transmission parse error:", e)

    return raw, transmission


def get_otm_status(transmission_no):
    if not transmission_no:
        return "NO_TRANSMISSION"

    sql = f"""
    <sql2xml>
      <Query>
        <RootName>I_Transmission</RootName>
        <Statement>
          Select STATUS from I_Transmission where I_Transmission_No={transmission_no}
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

    print("\n========== OTM STATUS RESPONSE ==========")
    print(r.text)
    print("=======================================\n")

    try:
        root = etree.fromstring(r.text.encode())
        node = root.find(".//I_Transmission")
        if node is not None:
            return node.attrib.get("STATUS", "UNKNOWN")
    except Exception as e:
        print("DBXML parse error:", e)

    return "UNKNOWN"
