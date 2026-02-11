from sqlalchemy import (
    Column, Integer, DateTime, String, func, 
    UniqueConstraint, Index, select
)
from sqlalchemy import (
    Column, Integer, DateTime, String, func, 
    UniqueConstraint, Index, Boolean
)
from sqlalchemy.dialects.postgresql import JSONB
from database import db

class Item(db.Model):
    __tablename__ = "items"

    __table_args__ = (
        UniqueConstraint("item_gid", name="uq_item_gid"),
        UniqueConstraint("domain_name", "item_xid", name="uq_domain_xid"),
        Index("ix_item_sync_status", "otm_sync_status"),
    )

    id = Column(Integer, primary_key=True)
    payload = Column(JSONB, nullable=False) # Stores dynamic UI fields

    # Searchable core fields formatted for OTM
    item_gid = Column(String(255), nullable=False, index=True)
    item_xid = Column(String(255), nullable=False, index=True)
    item_name = Column(String(255), index=True)
    domain_name = Column(String(255), nullable=False, index=True)

    otm_sync_status = Column(String(20), nullable=False, default="PENDING")
    otm_error = Column(JSONB)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
# --- TEMPLATE LIBRARY (Moved out of Item class) ---
# class Template(db.Model):
#     __tablename__ = "templates"

#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(100), unique=True, nullable=False)
#     config_json = db.Column(db.JSON, nullable=False) # Stores the field array

#     def to_dict(self):
#         return {
#             "id": self.id,
#             "name": self.name,
#             "data": self.config_json
#         }

class FieldConfig(db.Model):
    """Controls the Item Field Mapping UI dynamically"""
    __tablename__ = "field_configs"

    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False) 
    label = Column(String(100), nullable=False)
    display = Column(Boolean, default=True) # Ensure Boolean is imported
    disabled = Column(Boolean, default=False)
    mandatory = Column(Boolean, default=False)
    default_value = Column(String(255), nullable=True) # New Column
    section = Column(String(50), default="core")

    def to_dict(self):
        return {
            "key": self.key,
            "label": self.label,
            "display": self.display,
            "disabled": self.disabled,
            "mandatory": self.mandatory,
            "defaultValue": self.default_value, # Maps DB snake_case to Frontend camelCase
            "section": self.section
        }