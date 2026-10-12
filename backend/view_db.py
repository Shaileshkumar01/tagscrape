import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def view_database():
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=int(os.getenv("DB_PORT", 22283))
    )
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SHOW TABLES")
    tables = [list(row.values())[0] for row in cursor.fetchall()]

    print("\n==============================================")
    print(f"DATABASE: {os.getenv('DB_NAME')} on Aiven Cloud")
    print("==============================================")

    for table in tables:
        cursor.execute(f"SELECT COUNT(*) AS total FROM `{table}`")
        count = cursor.fetchone()['total']
        print(f"\nTABLE: {table} ({count} rows)")
        print("-" * 45)

        cursor.execute(f"SELECT * FROM `{table}` LIMIT 5")
        rows = cursor.fetchall()
        if rows:
            for row in rows:
                print(row)
        else:
            print("(empty table)")

    cursor.close()
    conn.close()
    print("\n==============================================\n")

if __name__ == "__main__":
    view_database()
