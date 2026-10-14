import os
import mysql.connector
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()


def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=int(os.getenv("DB_PORT", 3306))
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}", flush=True)
        return None


def save_scrape_results(url, data, user_id=1):
    conn = get_db_connection()
    if not conn:
        return False, "Database connection failed"

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM websites WHERE url = %s", (url,))
        website = cursor.fetchone()
        if website:
            web_id = website[0]
            cursor.execute("UPDATE websites SET last_scraped_at = NOW() WHERE id = %s", (web_id,))
        else:
            cursor.execute(
                "INSERT INTO websites (url, name, description, status, created_by, last_scraped_at) VALUES (%s, %s, %s, %s, %s, NOW())",
                (url, "Auto-Added Website", "Scraped by System", "active", user_id)
            )
            web_id = cursor.lastrowid
            if user_id:
                cursor.execute(
                    "INSERT IGNORE INTO user_websites (user_id, website_id) VALUES (%s, %s)",
                    (user_id, web_id)
                )

        run_query = "INSERT INTO scrape_runs (website_id, status) VALUES (%s, %s)"
        cursor.execute(run_query, (web_id, "completed"))
        run_id = cursor.lastrowid

        tag_query = """
            INSERT INTO scraped_tags (
                scrape_run_id, page_url, tag_name, tag_type, attributes, content
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """

        if data.get("title"):
            cursor.execute(tag_query, (run_id, url, "title", "title", None, data["title"]))

        if data.get("meta_title"):
            cursor.execute(tag_query, (run_id, url, "meta_title", "meta", None, data["meta_title"]))

        if data.get("meta_description"):
            cursor.execute(tag_query, (run_id, url, "meta_description", "meta", None, data["meta_description"]))

        if data.get("meta_keywords"):
            cursor.execute(tag_query, (run_id, url, "meta_keywords", "meta", None, data["meta_keywords"]))

        headings = data.get("headings", {})
        for tag_type, text_list in headings.items():
            for text in text_list:
                cursor.execute(tag_query, (run_id, url, tag_type, "heading", None, text))

        conn.commit()
        return True, "Data saved successfully"

    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Error saving data: {err}", flush=True)
        return False, f"Error saving data: {err}"
    finally:
        cursor.close()
        conn.close()


def get_scrape_history():
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT sr.id, w.url, sr.status, sr.started_at 
            FROM scrape_runs sr 
            JOIN websites w ON sr.website_id = w.id 
            ORDER BY sr.started_at DESC LIMIT 10
        """
        cursor.execute(query)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_scrape_details(run_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT w.id as website_id, w.url, sr.started_at, sr.status 
            FROM scrape_runs sr 
            JOIN websites w ON sr.website_id = w.id 
            WHERE sr.id = %s
        """, (run_id,))
        run_info = cursor.fetchone()
        if not run_info:
            return None

        cursor.execute("SELECT tag_name, content FROM scraped_tags WHERE scrape_run_id = %s", (run_id,))
        tags = cursor.fetchall()
        results = {
            'run_id': run_id,
            'website_id': run_info['website_id'],
            'url': run_info['url'],
            'title': next((t['content'] for t in tags if t['tag_name'] == 'title'), None) or run_info['url'],
            'meta_title': next((t['content'] for t in tags if t['tag_name'] == 'meta_title'), None),
            'meta_description': next((t['content'] for t in tags if t['tag_name'] == 'meta_description'), None),
            'meta_keywords': next((t['content'] for t in tags if t['tag_name'] == 'meta_keywords'), None),
            'headings': {'h1': [t['content'] for t in tags if t['tag_name'] == 'h1']},
            'started_at': run_info['started_at']
        }
        return results
    finally:
        cursor.close()
        conn.close()


def get_all_users():
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id, u.name, u.email, u.role_id, r.name as role, u.created_at 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            ORDER BY u.created_at DESC
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def create_new_user(email, password, role_id=3, name=None):
    conn = get_db_connection()
    if not conn:
        return False, "Database error"
    try:
        cursor = conn.cursor()
        hashed_password = generate_password_hash(password)
        user_name = name or email.split('@')[0]
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES (%s, %s, %s, %s, 1)",
            (user_name, email, hashed_password, role_id)
        )
        conn.commit()
        return True, "User created successfully"
    except mysql.connector.Error as err:
        return False, f"Failed to create user: {err}"
    finally:
        cursor.close()
        conn.close()


def delete_user_by_id(user_id):
    conn = get_db_connection()
    if not conn:
        return False, "Database error"
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return True, "User deleted successfully"
    except mysql.connector.Error as err:
        return False, f"Failed to delete user: {str(err)}"
    finally:
        cursor.close()
        conn.close()


def get_unique_sites(user_id=None, role_id=None):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        # If standard user (role 3), filter to assigned or created sites
        if role_id == 3 and user_id:
            cursor.execute("""
                SELECT DISTINCT w.* FROM websites w 
                LEFT JOIN user_websites uw ON w.id = uw.website_id 
                WHERE uw.user_id = %s OR w.created_by = %s 
                ORDER BY w.created_at DESC
            """, (user_id, user_id))
        else:
            cursor.execute("SELECT * FROM websites ORDER BY created_at DESC")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def can_user_access_site(user_id, role_id, website_id):
    # Super admins and Admins have global access
    if role_id in (1, 2):
        return True
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 1 FROM websites w
            LEFT JOIN user_websites uw ON w.id = uw.website_id AND uw.user_id = %s
            WHERE w.id = %s AND (uw.user_id IS NOT NULL OR w.created_by = %s)
            LIMIT 1
        """, (user_id, website_id, user_id))
        return cursor.fetchone() is not None
    finally:
        cursor.close()
        conn.close()


def get_scrapes_for_site(website_id):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, status, started_at FROM scrape_runs WHERE website_id = %s ORDER BY started_at DESC",
            (website_id,)
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def delete_site_by_id(website_id):
    conn = get_db_connection()
    if not conn:
        return False, "Database error"
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM websites WHERE id = %s", (website_id,))
        conn.commit()
        return True, "Site deleted successfully"
    except mysql.connector.Error as err:
        return False, f"Failed to delete site: {err}"
    finally:
        cursor.close()
        conn.close()


def check_if_data_changed(url, new_data):
    conn = get_db_connection()
    if not conn:
        return True
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT sr.id FROM scrape_runs sr 
            JOIN websites w ON sr.website_id = w.id 
            WHERE w.url = %s ORDER BY sr.started_at DESC LIMIT 1
        """, (url,))
        latest_run = cursor.fetchone()
        if not latest_run:
            return True
        run_id = latest_run['id']
        cursor.execute("SELECT tag_name, content FROM scraped_tags WHERE scrape_run_id = %s", (run_id,))
        tags = cursor.fetchall()
        old_data = {
            'title': next((t['content'] for t in tags if t['tag_name'] == 'title'), None),
            'meta_title': next((t['content'] for t in tags if t['tag_name'] == 'meta_title'), None),
            'meta_description': next((t['content'] for t in tags if t['tag_name'] == 'meta_description'), None),
            'meta_keywords': next((t['content'] for t in tags if t['tag_name'] == 'meta_keywords'), None),
            'headings': {'h1': [t['content'] for t in tags if t['tag_name'] == 'h1']}
        }

        if old_data['title'] != new_data.get('title'):
            return True
        if old_data['meta_title'] != new_data.get('meta_title'):
            return True
        if old_data['meta_description'] != new_data.get('meta_description'):
            return True
        if old_data['meta_keywords'] != new_data.get('meta_keywords'):
            return True

        old_h1s = old_data['headings'].get('h1', [])
        new_h1s = new_data.get('headings', {}).get('h1', [])
        if sorted(old_h1s) != sorted(new_h1s):
            return True

        return False
    finally:
        cursor.close()
        conn.close()


def update_user_password(user_id, new_password):
    conn = get_db_connection()
    if not conn:
        return False, "Database error"
    try:
        cursor = conn.cursor()
        hashed_password = generate_password_hash(new_password)
        cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hashed_password, user_id))
        conn.commit()
        return True, "Password updated successfully"
    except mysql.connector.Error as err:
        return False, f"Failed to update password: {err}"
    finally:
        cursor.close()
        conn.close()


def get_user_assigned_site_ids(user_id):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT website_id FROM user_websites WHERE user_id = %s", (user_id,))
        return [row[0] for row in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()


def assign_user_sites(user_id, site_ids):
    conn = get_db_connection()
    if not conn:
        return False, "Database error"
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_websites WHERE user_id = %s", (user_id,))
        for sid in site_ids:
            cursor.execute("INSERT INTO user_websites (user_id, website_id) VALUES (%s, %s)", (user_id, sid))
        conn.commit()
        return True, "Assigned sites updated successfully"
    except mysql.connector.Error as err:
        conn.rollback()
        return False, str(err)
    finally:
        cursor.close()
        conn.close()