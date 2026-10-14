from functools import wraps
import os
from datetime import datetime, timedelta
import jwt
from flask import g, jsonify, request
from werkzeug.security import check_password_hash
from db import get_db_connection


def login_user(email, password):
    conn = get_db_connection()
    if not conn:
        return None, "Database error"
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()
        if user:
            is_valid = False
            # Check hashed password
            if user['password_hash'].startswith('scrypt:') or user['password_hash'].startswith('pbkdf2:'):
                is_valid = check_password_hash(user['password_hash'], password)
            else:
                # Fallback for old manually created users
                is_valid = (user['password_hash'] == password)

            if is_valid:
                payload = {
                    'user_id': user['id'],
                    'role_id': user['role_id'],
                    'email': user['email'],
                    'name': user.get('name') or user['email'].split('@')[0],
                    'exp': datetime.now() + timedelta(hours=24)
                }

                secret_key = os.getenv('JWT_SECRET', 'change_this_later')
                token = jwt.encode(payload, secret_key, algorithm="HS256")
                return token, None
            else:
                return None, "Invalid email or password"
        else:
            return None, "Invalid email or password"
    except Exception as e:
        print(f"login error: {e}", flush=True)
        return None, "An error occurred during login"
    finally:
        cursor.close()
        conn.close()


def require_auth(roles=None):
    """
    Decorator to protect routes with JWT token verification.
    Optionally accepts a list of allowed role_ids:
      role 1: super_admin
      role 2: admin
      role 3: user
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"message": "Authorization token required"}), 401

            token = auth_header.split(" ", 1)[1].strip()
            secret_key = os.getenv("JWT_SECRET", "change_this_later")
            try:
                payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return jsonify({"message": "Token expired, please log in again"}), 401
            except Exception as e:
                return jsonify({"message": "Invalid token"}), 401

            g.user = payload
            g.user_id = payload.get("user_id")
            g.role_id = payload.get("role_id")
            g.email = payload.get("email")

            if roles is not None and g.role_id not in roles:
                return jsonify({"message": "Access denied: insufficient permissions"}), 403

            return f(*args, **kwargs)
        return decorated
    return decorator