from ..database import db
from datetime import datetime

# 1. DEFINE THE MISSING VARIABLE HERE
OTM_SYNC_STATUS = ["PENDING", "SUCCESS", "FAILED"]

class OrderBase(db.Model):
    __tablename__ = 'order_base'

    id = db.Column(db.Integer, primary_key=True)
    order_base_gid = db.Column(db.String(255), unique=True, nullable=False)
    order_base_xid = db.Column(db.String(255), nullable=False)
    order_base_name = db.Column(db.String(255))
    domain_name = db.Column(db.String(100), default='SKYMFG/DEMO')
    
    # Stores the extra fields from Excel (weight, thugid, locations) as JSON
    payload = db.Column(db.JSON)
    
    otm_sync_status = db.Column(db.String(50), default='PENDING') 
    sync_attempts = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<OrderBase {self.order_base_gid}>'

    # --- ADD THIS METHOD TO FIX THE ERROR ---
    def to_dict(self):
     data = {
        # Ensure the key is 'orderBaseXid' (camelCase) to match the service logic
        "orderBaseXid": self.order_base_xid, 
        "domainName": self.domain_name,
        "otm_sync_status": self.otm_sync_status,
    }
     if self.payload and isinstance(self.payload, dict):
        data.update(self.payload)
     return data

class OrderBaseFieldConfig(db.Model):
    __tablename__ = 'order_base_field_config'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False) 
    label = db.Column(db.String(100)) 
    display = db.Column(db.Boolean, default=True)
    required = db.Column(db.Boolean, default=False) 
    data_type = db.Column(db.String(50), default='String')
    section = db.Column(db.String(50), default='child')