import os
import mysql.connector
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()

def setup_database():
    print("Connecting to Aiven MySQL database...")
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=int(os.getenv("DB_PORT", 22283))
        )
    except mysql.connector.Error as err:
        print(f"Connection failed: {err}")
        return

    cursor = conn.cursor()
    print("Creating tables...")

    # 1. Roles table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE
        )
    """)

    # 2. Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(120) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role_id INT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles(id)
        )
    """)

    # 3. Websites table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS websites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            url VARCHAR(255) NOT NULL UNIQUE,
            name VARCHAR(120),
            description TEXT,
            status VARCHAR(50) DEFAULT 'active',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # 4. Scrape runs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scrape_runs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            website_id INT NOT NULL,
            status VARCHAR(50) NOT NULL,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP NULL,
            log TEXT,
            FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
        )
    """)

    # 5. Scraped tags table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scraped_tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            scrape_run_id INT NOT NULL,
            page_url VARCHAR(255) NOT NULL,
            tag_name VARCHAR(100),
            tag_type VARCHAR(50) NOT NULL,
            content TEXT,
            attributes JSON,
            scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (scrape_run_id) REFERENCES scrape_runs(id) ON DELETE CASCADE
        )
    """)

    # Insert default roles
    print("Inserting default roles...")
    cursor.execute("INSERT IGNORE INTO roles (id, name) VALUES (1, 'super_admin'), (2, 'admin'), (3, 'user')")

    # Insert Super Admin if not already present
    admin_name = os.getenv("SUPER_ADMIN_NAME", "Super Admin")
    admin_email = os.getenv("SUPER_ADMIN_EMAIL")
    admin_password = os.getenv("SUPER_ADMIN_PASSWORD")

    if admin_email and admin_password:
        print(f"Checking Super Admin ({admin_email})...")
        cursor.execute("SELECT id FROM users WHERE email = %s", (admin_email,))
        existing_admin = cursor.fetchone()
        if not existing_admin:
            admin_pass_hash = generate_password_hash(admin_password)
            cursor.execute(
                "INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES (%s, %s, %s, %s, %s)",
                (admin_name, admin_email, admin_pass_hash, 1, True)
            )
            print("Super Admin created successfully!")
        else:
            print("Super Admin already exists.")
    else:
        print("Warning: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in .env")

    conn.commit()
    cursor.close()
    conn.close()
    print("Database setup complete! All tables created successfully on Aiven.")

if __name__ == '__main__':
    setup_database()