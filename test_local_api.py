import requests
import json

url = "http://127.0.0.1:5000/api/invoice-template/otm-metadata"

print(f"Testing local API: {url}")

try:
    response = requests.get(url, timeout=30)
    print(f"Status Code: {response.status_code}")
    print("Response Headers:", response.headers.get('Content-Type'))
    
    body = response.text
    if body.strip().startswith("<!doctype html>") or body.strip().startswith("<html>"):
        print("ALERT: Response is HTML!")
        print("First 200 chars:")
        print(body[:200])
    else:
        try:
            data = response.json()
            print("Response is valid JSON.")
            # print(json.dumps(data, indent=2)[:500])
        except Exception as e:
            print(f"Response is NOT valid JSON: {e}")
            print("First 200 chars:")
            print(body[:200])

except Exception as e:
    print(f"Request failed: {e}")
