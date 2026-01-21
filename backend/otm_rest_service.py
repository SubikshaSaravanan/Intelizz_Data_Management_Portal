import requests
from config import Config


def post_invoice_json_to_otm(payload):
    """
    Sends JSON invoice to OTM REST API
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
