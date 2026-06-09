# backend/models.py
from ..database import db
from datetime import datetime

# ✅ Use the 'db' instance you already have in database.py
# ❌ Remove: Base = declarative_base()

class OTMFieldRegistry(db.Model):
    __tablename__ = "otm_field_registry"
    
    id = db.Column(db.Integer, primary_key=True, index=True)
    display_name = db.Column(db.String, nullable=False) # e.g., "Order Configuration"
    otm_db_path = db.Column(db.String, unique=True)    # e.g., "releaseMethodGid"
    
    # Categorization for nested JSON mapping
    field_group = db.Column(db.String, default="header") 
    
    # Validation and formatting
    data_type = db.Column(db.String, default="string") 
    is_required = db.Column(db.Boolean, default=False)
    default_value = db.Column(db.String, nullable=True)

class UserFieldPreference(db.Model):
    __tablename__ = "user_field_preferences"
    
    id = db.Column(db.Integer, primary_key=True, index=True)
    user_id = db.Column(db.String, index=True)
    
    # Stores an ordered list of strings
    selected_fields = db.Column(db.JSON, nullable=False)
    
    # Domain Name for pre-filling the JSON
    preferred_domain = db.Column(db.String, default="SKYMFG/DEMO")