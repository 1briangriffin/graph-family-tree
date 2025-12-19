
from database import get_db_connection

def migrate():
    print("Migrating schema...")
    db, conn = get_db_connection()
    
    # 1. Add birth_place
    try:
        conn.execute("ALTER TABLE Person ADD birth_place STRING")
        print("Added birth_place column.")
    except Exception as e:
        print(f"birth_place exists or error: {e}")

    # 2. Add death_place
    try:
        conn.execute("ALTER TABLE Person ADD death_place STRING")
        print("Added death_place column.")
    except Exception as e:
        print(f"death_place exists or error: {e}")

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
