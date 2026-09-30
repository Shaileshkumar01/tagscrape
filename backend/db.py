from os import truncate
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
            port=os.getenv("DB_PORT")
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

def save_scrape_results(url,data):
    conn=get_db_connection()
    if not conn:
     return False, "Database connection failed"

    try:
        cursor=conn.cursor()
        cursor.execute("SELECT id FROM websites WHERE url=%s",(url,))
        website = cursor.fetchone()
        if website:
            web_id=website[0]
        else:
            cursor.execute("INSERT INTO websites (url, name, description, status, created_by) VALUES (%s, %s, %s, %s, %s)", (url,"Auto-Added Website", "Scraped by System", "active", 1))
            web_id=cursor.lastrowid
        
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

        headings=data.get("headings",{})
        for tag_type, text_list in headings.items():
            for text in text_list:
                cursor.execute(tag_query, (run_id, url, tag_type, "heading", None, text))
        
        conn.commit()
        return True, "Data saved successfully"
        
    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Error saving data: {err}")
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
        SELECT sr.id, w.url, sr.status, sr.started_at FROM scrape_runs sr JOIN websites w ON sr.website_id= w.id ORDER BY sr.started_at DESC LIMIT 10
        """
        cursor.execute(query)
        result = cursor.fetchall()
        return result
    finally:
        cursor.close()
        conn.close()



def get_scrape_details(run_id):
    conn=get_db_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT w.url FROM scrape_runs sr JOIN websites w ON sr.website_id = w.id WHERE sr.id = %s", (run_id,))
        run_info=cursor.fetchone()
        if not run_info:
            return None

        cursor.execute("SELECT tag_name, content FROM scraped_tags WHERE scrape_run_id = %s", (run_id,))
        tags=cursor.fetchall()
        results={
            'title':run_info['url'],
        
            'meta_title':next((t['content'] for t in tags if t['tag_name'] =='meta_title'),None),
            'meta_description':next((t['content'] for t in tags if t['tag_name'] =='meta_description'),None),
            'meta_keywords':next((t['content'] for t in tags if t['tag_name'] =='meta_keywords'),None),
            'headings':{'h1':[t['content'] for t in tags if t['tag_name']=='h1']}
            
        }
        return results
    finally:
        cursor.close()
        conn.close()



def get_all_users():
    conn =get_db_connection()
    if not conn:
        return[]
    try:
        cursor=conn.cursor(dictionary=True)
        cursor.execute("SELECT u.id, u.email, r.name as role, u.created_at FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()



def create_new_user(email, password, role_id=3):
    conn = get_db_connection()
    if not conn:
        return False, "database error"
    try:
        cursor=conn.cursor()
        hashed_password = generate_password_hash(password)
        name_part = email.split('@')[0]
        cursor.execute("INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES (%s, %s, %s, %s, 1)",(name_part, email, hashed_password, role_id))
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
        return False, "database error"
    try:
        cursor=conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return True, "uer deleted successfully"
    except mysql.connector.Error as err:
        return False, f"failes to delete user: {str(err)}"
    finally:
        cursor.close()
        conn.close()


def get_unique_sites():
    conn = get_db_connection()
    if not conn: return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM websites ORDER BY created_at DESC")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def get_scrapes_for_site(website_id):
    conn = get_db_connection()
    if not conn: return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, status, started_at FROM scrape_runs WHERE website_id = %s ORDER BY started_at DESC", (website_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def delete_site_by_id(website_id):
    conn = get_db_connection()
    if not conn: return False, "Database error"
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