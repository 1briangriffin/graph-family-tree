
import kuzu
from database import get_db_connection

def migrate():
    db, conn = get_db_connection()
    print("Migrating Schema: Adding ADOPTED_BY relationship...")

    try:
        conn.execute("""
            CREATE REL TABLE ADOPTED_BY(
                FROM Person TO Person,
                adoption_date STRING
            )
        """)
        print("Success: ADOPTED_BY table created.")
    except Exception as e:
        if "exists" in str(e).lower():
            print("ADOPTED_BY table already exists.")
        else:
            print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
