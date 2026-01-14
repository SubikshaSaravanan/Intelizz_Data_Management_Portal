from app import create_app
from database import db
from models import User

app = create_app()

with app.app_context():

    # Check if admin already exists
    existing = User.query.filter_by(username="admin").first()

    if existing:
        print("Admin user already exists")
    else:
        admin = User(
            username="admin",
            role="admin"
        )
        admin.set_password("admin123")   # 🔐 Login password

        db.session.add(admin)
        db.session.commit()

        print("Admin user created successfully")
        print("Username: admin")
        print("Password: admin123")
