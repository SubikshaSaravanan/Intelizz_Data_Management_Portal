from flask import Blueprint, request, jsonify
from models import User
from database import db
from werkzeug.security import check_password_hash
import jwt
import datetime
from config import Config

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# -------------------------------
# LOGIN
# -------------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"msg": "Missing credentials"}), 400

    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"msg": "Invalid username or password"}), 401

    if not user.check_password(password):
        return jsonify({"msg": "Invalid username or password"}), 401

    token = jwt.encode(
        {
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
        },
        Config.JWT_SECRET,
        algorithm="HS256"
    )

    return jsonify({
        "token": token,
        "username": user.username,
        "role": user.role
    })
