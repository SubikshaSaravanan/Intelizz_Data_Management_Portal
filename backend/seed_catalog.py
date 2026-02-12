import json
from app import create_app
from database import db
from models import OtmObjectMetadata

app = create_app()

def seed_catalog():
    with open('otm_catalog.json', 'r') as f:
        catalog = json.load(f)

    with app.app_context():
        total_added = 0
        for category, items in catalog.items():
            for item in items:
                # power data app ones are handled statically in routes often, 
                # but we can seed them too for consistency if needed.
                # However, the user wants OTM objects mainly.
                
                existing = OtmObjectMetadata.query.filter_by(object_name=item['name']).first()
                if not existing:
                    meta = OtmObjectMetadata(
                        object_name=item['name'],
                        classification=category
                    )
                    db.session.add(meta)
                    total_added += 1
                else:
                    # Update classification if it changed in catalog
                    existing.classification = category
        
        db.session.commit()
        print(f"Catalog seeding complete. Added {total_added} new objects.")

if __name__ == "__main__":
    seed_catalog()
