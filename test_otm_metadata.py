import requests
from requests.auth import HTTPBasicAuth
import json

# Mocking the config for testing
OTM_INVOICE_METADATA_URL = "https://otmgtm-test-hipro.otmgtm.us-phoenix-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/metadata-catalog/invoices"
OTM_USERNAME = "INTL.INT01"
OTM_PASSWORD = "changeme"

print(f"Testing OTM connection to: {OTM_INVOICE_METADATA_URL}")
print(f"Username: {OTM_USERNAME}")

try:
    response = requests.get(
        OTM_INVOICE_METADATA_URL,
        auth=HTTPBasicAuth(OTM_USERNAME, OTM_PASSWORD),
        headers={"Accept": "application/json"},
        timeout=30
    )
    print(f"Status Code: {response.status_code}")
    print("Response Headers:", response.headers.get('Content-Type'))
    
    try:
        data = response.json()
        print("Response is valid JSON.")
        print("Keys in response:", list(data.keys()))
    except Exception as e:
        print(f"Response is NOT valid JSON: {e}")
        print("First 200 chars of response body:")
        print(response.text[:200])

except Exception as e:
    print(f"Request failed: {e}")
