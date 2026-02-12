from flask import Flask
from flask_cors import CORS

from database import db, migrate
from config import Config

# ✅ SINGLE SOURCE OF TRUTH FOR INVOICES
from routes import bp

from auth import auth_bp
# from invoice_config_routes import invoice_config_bp
from routes import bp



def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Disable alphabetical sorting of JSON keys to preserve OTM field order
    app.json.sort_keys = False

    # =============================
    # Enable CORS
    # =============================
    CORS(app)

    # =============================
    # Init DB & migrations
    # =============================
    db.init_app(app)
    migrate.init_app(app, db)

    # =============================
    # Register Blueprints
    # =============================
    app.register_blueprint(bp, url_prefix="/api")          # ✅ ONLY ONCE
    app.register_blueprint(auth_bp, url_prefix="/api/auth")


    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
