from flask import Flask
from flask_cors import CORS
 
from .database import db, migrate
from .config import Config
 
# ✅ SINGLE SOURCE OF TRUTH FOR INVOICES
from .routes import bp
from .auth import auth_bp
from .item_modules.item_routes import item_bp
from .OrderBase_modules.order_base_routes import order_bp
from .OrderRelease_modules.order_release_routes import order_release_bp
 
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
 
    # Disable alphabetical sorting of JSON keys to preserve OTM field order
    app.json.sort_keys = False
 
    # =============================
    # Enable CORS
    CORS(app)
 
    # =============================
    # Init DB & migrations
    db.init_app(app)
    migrate.init_app(app, db)
 
    # =============================
    # Register Blueprints
    # =============================
    app.register_blueprint(bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(item_bp, url_prefix="/api/items")
    app.register_blueprint(order_bp, url_prefix="/api/orderbase")
    app.register_blueprint(order_release_bp, url_prefix="/api/order-release")
    return app
 
 
# Initialize the app instance
app = create_app()
 
with app.app_context():
    print("\n" + "=" * 50)
    print("SEARCHING FOR SYNC-FIELDS ROUTE...")
    found = False
    for rule in app.url_map.iter_rules():
        if "sync-fields" in rule.rule:
            print(f"MATCH FOUND: {rule.endpoint} -> {rule.rule} [{rule.methods}]")
            found = True
    if not found:
        print("CRITICAL ERROR: /sync-fields NOT REGISTERED IN FLASK")
    print("=" * 50 + "\n")
 
if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000)