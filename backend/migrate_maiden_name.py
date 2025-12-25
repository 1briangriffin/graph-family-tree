
import kuzu
from database import get_db_connection

def migrate():
    db, conn = get_db_connection()
    print("Migrating Schema: Adding maiden_name to Person...")

    try:
        conn.execute("ALTER TABLE Person ADD maiden_name STRING")
        print("Success: Added maiden_name column.")
    except Exception as e:
        if "exists" in str(e).lower():
            print("Column maiden_name likely already exists.")
        else:
            print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
