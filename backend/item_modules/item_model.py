from sqlalchemy import (
    Column, Integer, DateTime, String, func, 
    UniqueConstraint, Index, select
)
from sqlalchemy import (
    Column, Integer, DateTime, String, func, 
    UniqueConstraint, Index, Boolean
)
from sqlalchemy.dialects.postgresql import JSONB
from ..database import db

class Item(db.Model):
    __tablename__ = "items"

    __table_args__ = (
        UniqueConstraint("item_gid", name="uq_item_gid"),
        UniqueConstraint("domain_name", "item_xid", name="uq_domain_xid"),
        Index("ix_item_sync_status", "otm_sync_status"),
    )

    id = Column(Integer, primary_key=True)
    # This stores all your 'itemShipUnit.weight' etc. from Excel
    payload = Column(JSONB, nullable=False) 

    item_gid = Column(String(255), nullable=False, index=True)
    item_xid = Column(String(255), nullable=False, index=True)
    item_name = Column(String(255), index=True)
    domain_name = Column(String(255), nullable=False, index=True)

    otm_sync_status = Column(String(20), nullable=False, default="PENDING")
    otm_error = Column(JSONB)
    
    # NEW: Track how many times we tried to push to OTM
    sync_attempts = Column(Integer, default=0) 

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class FieldConfig(db.Model):
    """Controls the Item Field Mapping UI dynamically"""
    __tablename__ = "field_configs"

    id = Column(Integer, primary_key=True)
    # INCREASE TO 255 to support deep OTM child resource paths
    key = Column(String(255), unique=True, nullable=False) 
    label = Column(String(255), nullable=False)
    display = Column(Boolean, default=True)
    disabled = Column(Boolean, default=False)
    mandatory = Column(Boolean, default=False)
    default_value = Column(String(255), nullable=True) 
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