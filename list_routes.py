
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app import app
    
    with open('routes.txt', 'w') as f:
        for rule in app.url_map.iter_rules():
            f.write(f"{rule.endpoint}: {rule}\n")
            
    print("Routes written to routes.txt")

except Exception as e:
    print(f"Error: {e}")
