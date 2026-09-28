import os
import mysql.connector
from dotenv import load_dotenv

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