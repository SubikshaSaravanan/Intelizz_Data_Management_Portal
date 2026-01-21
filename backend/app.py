from flask import Flask
from flask_cors import CORS
from database import db, migrate
from config import Config
from routes import bp
from auth import auth_bp
from invoice_config_routes import invoice_config_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for React frontend
    CORS(app)

    # Init database & migrations
    db.init_app(app)
    migrate.init_app(app, db)

    # Register Blueprints
    app.register_blueprint(bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(invoice_config_bp)
    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
