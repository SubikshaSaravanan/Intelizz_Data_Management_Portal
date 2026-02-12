import requests
import json

try:
    resp = requests.get("http://localhost:5000/api/dashboard/modules")
    print(f"Status Code: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print("Master Data Count:", len(data.get("MASTER", [])))
        print("Transaction Data Count:", len(data.get("TRANSACTION", [])))
        print("Power Data Count:", len(data.get("POWER", [])))
        print("\nFull Response (first few items of each):")
        for cat in data:
            print(f"{cat}: {[item['title'] for item in data[cat][:2]]}")
except Exception as e:
    print(f"Error: {e}")
