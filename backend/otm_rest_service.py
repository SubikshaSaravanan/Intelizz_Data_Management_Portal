import requests
from config import Config


def post_invoice_json_to_otm(payload):
    """
    Sends JSON invoice to OTM REST API
    (Generic JSON endpoint – application/json)
    """

    url = (
        Config.OTM_REST_URL
        + "/logisticsRestApi/resources/v2/invoices"
    )

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        auth=(
            Config.OTM_USERNAME,
            Config.OTM_PASSWORD
        ),
        timeout=120
    )

    try:
        return response.status_code, response.json()
    except Exception:
        return response.status_code, {
            "error": "Invalid JSON response",
            "raw": response.text
        }


def post_json_to_otm(payload):
    """
    Sends JSON invoice to OTM REST API
    (Oracle REST Resource – recommended for invoices)
    """

    url = f"{Config.OTM_REST_URL}/invoices"

    headers = {
        "Content-Type": "application/vnd.oracle.resource+json;type=singular",
        "Accept": "application/vnd.oracle.resource+json"
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        auth=(
            Config.OTM_USERNAME,
            Config.OTM_PASSWORD
        ),
        timeout=120
    )

    return response
def post_excel_json_invoice_to_otm(payload):
    """
    Sends Excel-derived JSON invoice to OTM
    (Safe wrapper for Excel → JSON flow)
    Does NOT interfere with existing logic.
    """

    url = f"{Config.OTM_REST_URL}/invoices"

    headers = {
        "Content-Type": "application/vnd.oracle.resource+json;type=singular",
        "Accept": "application/vnd.oracle.resource+json"
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        auth=(
            Config.OTM_USERNAME,
            Config.OTM_PASSWORD
        ),
        timeout=120
    )

    if response.status_code not in (200, 201):
        raise Exception(
            f"OTM JSON invoice failed ({response.status_code}): {response.text}"
        )

    return response.json()


def get_otm_metadata(object_name):
    """
    Fetches raw metadata (field names, schema, structure) for an OTM object.
    URL: /logisticsRestApi/resources-int/v2/metadata-catalog/{objectName}
    """
    url = f"{Config.OTM_REST_URL}/metadata-catalog/{object_name}"

    headers = {
        "Accept": "application/json"
    }

    response = requests.get(
        url,
        headers=headers,
        auth=(
            Config.OTM_USERNAME,
            Config.OTM_PASSWORD
        ),
        timeout=60
    )

    if response.status_code != 200:
        return response.status_code, {"error": f"Failed to fetch metadata for {object_name}", "raw": response.text}

    return response.status_code, response.json()
