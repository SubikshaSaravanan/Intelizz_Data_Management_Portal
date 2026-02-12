from app import create_app
from models import OtmObjectMetadata, MetadataField
import json

app = create_app()

def check_db():
    with app.app_context():
        objs = OtmObjectMetadata.query.all()
        print(f"Total Objects in DB: {len(objs)}")
        for o in objs:
            print(f"- {o.object_name} ({o.classification})")
        
        # Check catalog loading too
        import os
        catalog_path = os.path.join(os.path.dirname(__file__), "otm_catalog.json")
        print(f"Catalog Path: {catalog_path}")
        print(f"Catalog Exists: {os.path.exists(catalog_path)}")
        if os.path.exists(catalog_path):
            with open(catalog_path, 'r') as f:
                cat = json.load(f)
                print("Catalog Categories:", cat.keys())
                for k in cat:
                    print(f"  {k}: {len(cat[k])} items")

if __name__ == "__main__":
    check_db()
