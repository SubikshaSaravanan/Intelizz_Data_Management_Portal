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
# SEND XML TO OTM
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

    root = etree.fromstring(response.text.encode())

    node = root.find(
        ".//otm:ReferenceTransmissionNo",
        namespaces=NS
    )

    transmission_no = node.text.strip()

    print("✅ Transmission number:", transmission_no)
    return transmission_no


# ============================================================
# GET STATUS
# ============================================================
def get_status(trans_no):

    sql = f"""
    <sql2xml>
      <Query>
        <RootName>I_Transmission</RootName>
        <Statement>
          SELECT STATUS
          FROM I_Transmission
          WHERE I_Transmission_No = {trans_no}
        </Statement>
      </Query>
    </sql2xml>
    """

    r = requests.post(
        Config.OTM_DBXML_URL,
        data=sql,
        headers={"Content-Type": "application/xml"},
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=60
    )

    root = etree.fromstring(r.text.encode())
    node = root.find(".//I_Transmission")

    return node.attrib.get("STATUS", "UNKNOWN")


# ============================================================
# FETCH ERROR FROM I_LOG
# ============================================================
def fetch_error(trans_no):

    sql = f"""
    <sql2xml>
      <Query>
        <RootName>I_Transmission</RootName>
        <Statement>
          SELECT
             I_MESSAGE_CODE,
             CAST(I_MESSAGE_TEXT AS VARCHAR(1000)) AS MESSAGE_TEXT
          FROM I_LOG
          WHERE I_TRANSMISSION_NO = {trans_no}
          ORDER BY LOG_ID DESC
        </Statement>
      </Query>
    </sql2xml>
    """

    r = requests.post(
        Config.OTM_DBXML_URL,
        data=sql,
        headers={"Content-Type": "application/xml"},
        auth=(Config.OTM_USERNAME, Config.OTM_PASSWORD),
        timeout=60
    )

    root = etree.fromstring(r.text.encode())

    for node in root.iter():

        code = node.attrib.get("I_MESSAGE_CODE")
        msg = (
            node.attrib.get("MESSAGE_TEXT")
            or node.attrib.get("CAST(I_MESSAGE_TEXTASVARCHAR(1000))")
        )

        if code or msg:
            return f"{code} : {msg}"

    return None


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":

    with open("invoice.xml", "rb") as f:
        xml_data = f.read()

    transmission_no = post_to_otm(xml_data)

    print("\n⏳ Waiting for OTM processing...\n")

    # wait until status becomes ERROR or COMPLETE
    while True:

        status = get_status(transmission_no)
        print("STATUS →", status)

        if status in ("ERROR", "COMPLETE"):
            break

        time.sleep(5)

    # if error → fetch error
    if status == "ERROR":

        print("\n❌ OTM returned ERROR")
        print("Waiting for error log...\n")

        for i in range(60):   # wait max 5 min

            error = fetch_error(transmission_no)

            if error:
                print("🔥 ERROR FOUND FROM OTM:\n")
                print(error)
                break

            print("⏳ error not yet written... retrying")
            time.sleep(5)

    else:
        print("\n✅ Invoice processed successfully")
