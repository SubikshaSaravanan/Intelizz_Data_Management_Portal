from database import db
from datetime import datetime

class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    invoice_xid = db.Column(db.String(50), nullable=False)
    invoice_num = db.Column(db.String(50), nullable=False)
    transmission_no = db.Column(db.String(50))
    status = db.Column(db.String(20))
    request_xml = db.Column(db.Text)
    response_xml = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
