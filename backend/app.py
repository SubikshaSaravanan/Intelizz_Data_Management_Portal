from flask import Flask
from flask_cors import CORS
from database import db, migrate
from config import Config
from routes import bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(bp, url_prefix="/api")
    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
