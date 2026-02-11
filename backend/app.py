from flask import Flask
from flask_cors import CORS
from database import db, migrate
from config import Config
from routes import bp
from auth import auth_bp
from invoice_config_routes import invoice_config_bp
from item_modules.item_routes import item_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # 1. Disable strict_slashes (Fixes the 308 Redirect/CORS loop)
    app.url_map.strict_slashes = False

    # 2. Relax CORS to allow common headers
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    db.init_app(app)
    migrate.init_app(app, db)

    # Register Blueprints
    app.register_blueprint(bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(invoice_config_bp, url_prefix="/api/invoice-config")
    app.register_blueprint(item_bp, url_prefix="/api/items")

    return app

# Initialize the app instance
app = create_app()

with app.app_context():
    print("\n" + "="*50)
    print("SEARCHING FOR SYNC-FIELDS ROUTE...")
    found = False
    for rule in app.url_map.iter_rules():
        if "sync-fields" in rule.rule:
            print(f"MATCH FOUND: {rule.endpoint} -> {rule.rule} [{rule.methods}]")
            found = True
    if not found:
        print("CRITICAL ERROR: /sync-fields NOT REGISTERED IN FLASK")
    print("="*50 + "\n")

if __name__ == "__main__":
    app.run(debug=True, port=5000)