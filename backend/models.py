from database import db
import datetime
from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True)
    password_hash = db.Column(db.String(200))
    role = db.Column(db.String(20), default="user")

    def set_password(self, pwd):
        self.password_hash = generate_password_hash(pwd)

    def check_password(self, pwd):
        return check_password_hash(self.password_hash, pwd)


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)

    invoice_xid = db.Column(db.String(100))
    invoice_num = db.Column(db.String(100))

    status = db.Column(db.String(30))

    transmission_no = db.Column(db.String(50))

    request_xml = db.Column(db.Text)
    response_xml = db.Column(db.Text)

    request_json = db.Column(db.JSON)
    response_json = db.Column(db.JSON)

    error_message = db.Column(db.Text)

    # 🔥 THIS WILL DRIVE UI LOGIC
    # Values:
    #   "XML"  -> Excel → XML → OTM
    #   "JSON" -> Excel → JSON → OTM OR Raw JSON Upload
    source_type = db.Column(db.String(20))

    created_at = db.Column(db.DateTime, default=db.func.now())

class InvoiceFieldConfig(db.Model):
    __tablename__ = "invoice_field_config"

    id = db.Column(db.Integer, primary_key=True)
    field_name = db.Column(db.String(120), unique=True)
    display_text = db.Column(db.String(200))
    default_value = db.Column(db.String(200))

    visible = db.Column(db.Boolean, default=True)
    disabled = db.Column(db.Boolean, default=False)

    data_type = db.Column(db.String(30))


class InvoiceJson(db.Model):

    __tablename__ = "invoice_json"

    id = db.Column(db.Integer, primary_key=True)

    invoice_xid = db.Column(db.String(100))
    invoice_number = db.Column(db.String(100))
    invoice_gid = db.Column(db.String(200))

    request_json = db.Column(db.JSON)
    response_json = db.Column(db.JSON)

    status = db.Column(db.String(50))
    error_message = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


class OtmObjectMetadata(db.Model):
    __tablename__ = "otm_object_metadata"

    id = db.Column(db.Integer, primary_key=True)
    object_name = db.Column(db.String(100), unique=True, nullable=False)
    classification = db.Column(db.String(20), nullable=False)  # MASTER / TRANSACTION / POWER
    last_synced = db.Column(db.DateTime, default=datetime.utcnow)

    fields = db.relationship('MetadataField', backref='object_metadata', lazy=True, cascade="all, delete-orphan")


class MetadataField(db.Model):
    __tablename__ = "metadata_fields"

    id = db.Column(db.Integer, primary_key=True)
    metadata_id = db.Column(db.Integer, db.ForeignKey('otm_object_metadata.id'), nullable=False)
    field_name = db.Column(db.String(100), nullable=False)
    path = db.Column(db.String(255))
    data_type = db.Column(db.String(50))
    is_required = db.Column(db.Boolean, default=False)
