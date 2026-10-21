import os
import mysql.connector
from dotenv import load_dotenv
from urllib.parse import urlparse
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


def save_scrape_results(url, data, user_id=1, cron_interval_hours=None):
    conn = get_db_connection()
    if not conn:
        return False, "Database connection failed"

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, cron_interval_hours FROM websites WHERE url = %s", (url,))
        website = cursor.fetchone()
        hours = int(cron_interval_hours) if cron_interval_hours and int(cron_interval_hours) > 0 else None

        if website:
            web_id = website[0]
            existing_hours = website[1]
            effective_hours = hours if cron_interval_hours is not None else existing_hours
            if effective_hours and effective_hours > 0:
                cursor.execute("""
                    UPDATE websites 
                    SET last_scraped_at = NOW(), 
                        cron_interval_hours = %s,
                        next_scrape_at = DATE_ADD(NOW(), INTERVAL %s HOUR) 
                    WHERE id = %s
                """, (effective_hours, effective_hours, web_id))
            else:
                cursor.execute("""
                    UPDATE websites 
                    SET last_scraped_at = NOW() 
                    WHERE id = %s
                """, (web_id,))
        else:
            if hours and hours > 0:
                cursor.execute(
                    """INSERT INTO websites 
                       (url, name, description, status, created_by, last_scraped_at, cron_interval_hours, next_scrape_at) 
                       VALUES (%s, %s, %s, %s, %s, NOW(), %s, DATE_ADD(NOW(), INTERVAL %s HOUR))""",
                    (url, "Auto-Added Website", "Scraped by System", "active", user_id, hours, hours)
                )
            else:
                cursor.execute(
                    """INSERT INTO websites 
                       (url, name, description, status, created_by, last_scraped_at, cron_interval_hours, next_scrape_at) 
                       VALUES (%s, %s, %s, %s, %s, NOW(), NULL, NULL)""",
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

        cursor.execute("SELECT tag_name, tag_type, content FROM scraped_tags WHERE scrape_run_id = %s ORDER BY id ASC", (run_id,))
        tags = cursor.fetchall()

        headings = {}
        for i in range(1, 7):
            tag_key = f"h{i}"
            headings[tag_key] = [t['content'] for t in tags if t['tag_name'] == tag_key]

        results = {
            'run_id': run_id,
            'website_id': run_info['website_id'],
            'url': run_info['url'],
            'title': next((t['content'] for t in tags if t['tag_name'] == 'title'), None),
            'meta_title': next((t['content'] for t in tags if t['tag_name'] == 'meta_title'), None),
            'meta_description': next((t['content'] for t in tags if t['tag_name'] == 'meta_description'), None),
            'meta_keywords': next((t['content'] for t in tags if t['tag_name'] == 'meta_keywords'), None),
            'headings': headings,
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


def get_latest_chatbot_site_snapshots():
    conn = get_db_connection()
    if not conn:
        return None

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                w.id AS website_id,
                w.url AS website_url,
                sr.id AS scrape_run_id,
                sr.started_at AS scraped_at,
                st.page_url,
                st.tag_name,
                st.tag_type,
                st.content
            FROM websites w
            JOIN (
                SELECT website_id, MAX(id) AS latest_run_id
                FROM scrape_runs
                WHERE status = 'completed'
                GROUP BY website_id
            ) latest ON latest.website_id = w.id
            JOIN scrape_runs sr ON sr.id = latest.latest_run_id
            LEFT JOIN scraped_tags st ON st.scrape_run_id = sr.id
            ORDER BY w.id ASC, st.id ASC
        """)

        sites_by_id = {}
        for row in cursor.fetchall():
            website_url = row["website_url"]
            hostname = (urlparse(website_url).hostname or "").lower()
            if hostname != "hlpnow.com" and not hostname.endswith(".hlpnow.com"):
                continue

            website_id = row["website_id"]
            if website_id not in sites_by_id:
                scraped_at = row["scraped_at"]
                sites_by_id[website_id] = {
                    "website_id": website_id,
                    "url": website_url,
                    "scrape_run_id": row["scrape_run_id"],
                    "scraped_at": scraped_at.isoformat() if scraped_at else None,
                    "tags": [],
                }

            if row["tag_name"] and row["content"]:
                sites_by_id[website_id]["tags"].append({
                    "page_url": row["page_url"],
                    "tag_name": row["tag_name"],
                    "tag_type": row["tag_type"],
                    "content": row["content"],
                })

        return list(sites_by_id.values())
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

        # Check remaining sites
        cursor.execute("SELECT COUNT(*), COALESCE(MAX(id), 0) FROM websites")
        count, max_id = cursor.fetchone()
        if count == 0:
            # If all websites are deleted, reset AUTO_INCREMENT to 1
            cursor.execute("ALTER TABLE websites AUTO_INCREMENT = 1")
            cursor.execute("ALTER TABLE scrape_runs AUTO_INCREMENT = 1")
            cursor.execute("ALTER TABLE scraped_tags AUTO_INCREMENT = 1")
        else:
            cursor.execute(f"ALTER TABLE websites AUTO_INCREMENT = {max_id + 1}")

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
            'headings': {
                f"h{i}": [t['content'] for t in tags if t['tag_name'] == f"h{i}"]
                for i in range(1, 7)
            }
        }

        if old_data['title'] != new_data.get('title'):
            return True
        if old_data['meta_title'] != new_data.get('meta_title'):
            return True
        if old_data['meta_description'] != new_data.get('meta_description'):
            return True
        if old_data['meta_keywords'] != new_data.get('meta_keywords'):
            return True

        new_headings = new_data.get('headings', {})
        for i in range(1, 7):
            level = f"h{i}"
            old_list = old_data['headings'].get(level, [])
            new_list = new_headings.get(level, [])
            if sorted(old_list) != sorted(new_list):
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


def get_due_sites():
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, url, name, cron_interval_hours, last_scraped_at, next_scrape_at 
            FROM websites 
            WHERE status = 'active' 
              AND cron_interval_hours IS NOT NULL 
              AND cron_interval_hours > 0 
              AND (next_scrape_at IS NULL OR next_scrape_at <= NOW())
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def update_site_schedule(website_id, cron_interval_hours):
    conn = get_db_connection()
    if not conn:
        return False, "Database error"
    try:
        cursor = conn.cursor()
        hours = int(cron_interval_hours) if cron_interval_hours and int(cron_interval_hours) > 0 else None
        if hours:
            cursor.execute("""
                UPDATE websites 
                SET cron_interval_hours = %s, 
                    next_scrape_at = DATE_ADD(NOW(), INTERVAL %s HOUR) 
                WHERE id = %s
            """, (hours, hours, website_id))
        else:
            cursor.execute("""
                UPDATE websites 
                SET cron_interval_hours = NULL, 
                    next_scrape_at = NULL 
                WHERE id = %s
            """, (website_id,))
        conn.commit()
        return True, "Schedule updated successfully"
    except mysql.connector.Error as err:
        return False, f"Failed to update schedule: {err}"
    finally:
        cursor.close()
        conn.close()


def record_site_scraped(website_id):
    conn = get_db_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE websites 
            SET last_scraped_at = NOW(),
                next_scrape_at = CASE 
                    WHEN cron_interval_hours > 0 THEN DATE_ADD(NOW(), INTERVAL cron_interval_hours HOUR) 
                    ELSE next_scrape_at 
                END 
            WHERE id = %s
        """, (website_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def get_site_by_id(website_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM websites WHERE id = %s", (website_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def update_user_profile(user_id, name=None, email=None, role_id=None, password=None):
    conn = get_db_connection()
    if not conn:
        return False, "Database error"
    try:
        cursor = conn.cursor()
        updates = []
        params = []
        if name is not None:
            updates.append("name = %s")
            params.append(name.strip())
        if email is not None:
            updates.append("email = %s")
            params.append(email.strip())
        if role_id is not None:
            if user_id == 1 and int(role_id) != 1:
                return False, "Primary Super Admin role cannot be modified"
            updates.append("role_id = %s")
            params.append(int(role_id))
        if password:
            updates.append("password_hash = %s")
            params.append(generate_password_hash(password))

        if not updates:
            return True, "No changes requested"

        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        cursor.execute(query, tuple(params))
        conn.commit()
        return True, "User updated successfully"
    except mysql.connector.Error as err:
        return False, f"Failed to update user: {err}"
    finally:
        cursor.close()
        conn.close()


def get_report_data(run_id=None, website_id=None, user_id=None, role_id=None):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT 
                sr.id AS run_id,
                w.url AS website_url,
                sr.started_at,
                sr.status AS run_status,
                st.tag_type,
                st.tag_name,
                st.content
            FROM scraped_tags st
            JOIN scrape_runs sr ON st.scrape_run_id = sr.id
            JOIN websites w ON sr.website_id = w.id
        """
        conditions = []
        params = []

        if run_id:
            conditions.append("sr.id = %s")
            params.append(run_id)

        if website_id:
            conditions.append("w.id = %s")
            params.append(website_id)

        if role_id == 3 and user_id:
            conditions.append("""
                (w.created_by = %s OR w.id IN (SELECT website_id FROM user_websites WHERE user_id = %s))
            """)
            params.extend([user_id, user_id])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY sr.started_at DESC, st.id ASC"
        cursor.execute(query, tuple(params))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
