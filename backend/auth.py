import jwt
import os
from datetime import datetime, timedelta
from db import get_db_connection
def login_user(email, password):
    conn =get_db_connection()
    if not conn:
        return None, "Database error"
    try:
        cursor=conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user =cursor.fetchone()
        if user and user['password_hash']==password:
            payload ={
                'user_id':user['id'],
                'role_id':user['role_id'],
                'email':user['email'],
                'exp': datetime.now() + timedelta(hours=24)
            }
                
            secret_key = os.getenv('JWT_SECRET')
            token=jwt.encode(payload, secret_key, algorithm="HS256")
            return token, None

        else:
            return None, "invalid email or password"
    except Exception as e:
       print(f"login error:{e}")
       return None, "An error occurred during login"
    finally:
        cursor.close()
        conn.close()