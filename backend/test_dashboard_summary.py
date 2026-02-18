import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_dashboard_summary():
    try:
        response = requests.get(f"{BASE_URL}/dashboard/modules")
        if response.status_code == 200:
            data = response.json()
            print("🔍 All transactional modules:")
            for item in data.get("TRANSACTION", []):
                print(f" - {item['name']} (summary: {'present' if 'summary' in item else 'missing'})")
            
            # Look for invoices module in TRANSACTION
            invoices_module = next((item for item in data.get("TRANSACTION", []) if item["name"] == "invoices"), None)
            
            if invoices_module and "summary" in invoices_module:
                print("\n✅ Success: Dashboard summary found for invoices module.")
                print(json.dumps(invoices_module["summary"], indent=2))
            elif invoices_module:
                print("\n❌ Failure: Summary component MISSING in invoices module object.")
                print("Module object:", json.dumps(invoices_module, indent=2))
            else:
                print("\n❌ Failure: 'invoices' module NOT FOUND in TRANSACTION category.")
        else:
            print(f"❌ Failure: API returned status code {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_dashboard_summary()
