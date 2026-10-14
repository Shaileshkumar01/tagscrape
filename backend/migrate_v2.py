"""
Phase 1 schema migration (v2).

Adds:
  - websites.cron_interval_hours / last_scraped_at / next_scrape_at  (per-site scheduling, used in Phase 2)
  - user_websites table                                               (which users can see which sites)

Safe to run multiple times: every change is checked against information_schema first.
Nothing is dropped or deleted.
"""
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("DB_NAME")


def column_exists(cursor, table, column):
    cursor.execute(
        """
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        (DB_NAME, table, column),
    )
    return cursor.fetchone()[0] > 0


def add_column(cursor, table, column, definition):
    if column_exists(cursor, table, column):
        print(f"  = {table}.{column} already exists, skipping")
        return
    cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `{column}` {definition}")
    print(f"  + added {table}.{column}")


def migrate():
    print("Connecting to database...")
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=DB_NAME,
        port=int(os.getenv("DB_PORT", 3306)),
    )
    cursor = conn.cursor()

    print("Updating websites table (per-site scheduling)...")
    add_column(cursor, "websites", "cron_interval_hours", "INT NULL")
    add_column(cursor, "websites", "last_scraped_at", "TIMESTAMP NULL")
    add_column(cursor, "websites", "next_scrape_at", "TIMESTAMP NULL")

    print("Creating user_websites table (site assignment)...")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_websites (
            user_id    INT NOT NULL,
            website_id INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, website_id),
            FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
            FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
        )
        """
    )
    print("  = user_websites ready")

    # Backfill last_scraped_at from existing history so the column isn't empty for old sites
    cursor.execute(
        """
        UPDATE websites w
        SET w.last_scraped_at = (
            SELECT MAX(sr.started_at) FROM scrape_runs sr WHERE sr.website_id = w.id
        )
        WHERE w.last_scraped_at IS NULL
        """
    )
    print(f"  ~ backfilled last_scraped_at for {cursor.rowcount} site(s)")

    conn.commit()
    cursor.close()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    migrate()
