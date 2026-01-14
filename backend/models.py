from database import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default="user")

    def set_password(self, pwd):
        self.password_hash = generate_password_hash(pwd)

    def check_password(self, pwd):
        return check_password_hash(self.password_hash, pwd)


class Invoice(db.Model):
    __tablename__ = "invoices"
    id = db.Column(db.Integer, primary_key=True)
    invoice_xid = db.Column(db.String(50))
    invoice_num = db.Column(db.String(50))
    transmission_no = db.Column(db.String(50))
    status = db.Column(db.String(20))
    request_xml = db.Column(db.Text)
    response_xml = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
