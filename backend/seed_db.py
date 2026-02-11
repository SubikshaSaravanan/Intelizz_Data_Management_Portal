# backend/seed_db.py
from app import app
from database import db
from item_modules.item_model import FieldConfig

def seed():
    with app.app_context():
        print("Creating tables...")
        db.create_all()  # This creates field_configs if it doesn't exist

        # Define standard OTM Item fields
        default_fields = [
            # Key, Label, Section, Mandatory, Default
            ('itemXid', 'Item ID', 'core', True, None),
            ('itemName', 'Item Name', 'core', True, None),
            ('domainName', 'Domain Name', 'core', False, 'INTL'),
            ('description', 'Description', 'core', False, None),
            ('itemPurchasingCode', 'Purchasing Code', 'attributes', False, None),
            ('nmfcCodeGid', 'NMFC Code', 'attributes', False, None),
            ('isHazmat', 'Hazardous Material', 'attributes', False, 'false'),
            ('lastUpdateDate', 'Last Updated', 'dates', False, None),
            ('insertDate', 'Created Date', 'dates', False, None),
        ]

        print("Seeding fields...")
        for key, label, section, mandatory, default in default_fields:
            existing = FieldConfig.query.filter_by(key=key).first()
            if not existing:
                new_field = FieldConfig(
                    key=key,
                    label=label,
                    section=section,
                    mandatory=mandatory,
                    default_value=default,
                    display=True
                )
                db.session.add(new_field)
        
        db.session.commit()
        print("Database synced and seeded successfully!")

if __name__ == "__main__":
    seed()