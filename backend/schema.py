
from database import get_db_connection

def create_schema():
    db, conn = get_db_connection()
    
    # helper to ignore "table exists" errors
    def exec_safe(query):
        try:
            conn.execute(query)
            print(f"Executed: {query.splitlines()[0]}...")
        except Exception as e:
            if "exists" in str(e).lower():
                pass # skip if already exists
            else:
                print(f"Error executing {query}: {e}")

    # 1. User Table
    exec_safe("""
        CREATE NODE TABLE User(
            username STRING, 
            password_hash STRING, 
            role STRING, 
            PRIMARY KEY (username)
        )
    """)

    # 2. Person Table
    # Using serial ID for simplicity, or we could use UUID string
    # 2. Person Table
    # Using serial ID for simplicity, or we could use UUID string
    exec_safe("""
        CREATE NODE TABLE Person(
            id SERIAL,
            name STRING,
            gender STRING,
            birth_date STRING,
            birth_place STRING,
            death_date STRING,
            death_place STRING,
            bio STRING,
            PRIMARY KEY (id)
        )
    """)

    # 3. Event Table
    exec_safe("""
        CREATE NODE TABLE Event(
            id SERIAL,
            type STRING,
            event_date STRING,
            description STRING,
            location STRING,
            PRIMARY KEY (id)
        )
    """)
    
    # 4. RELATIONSHIP TABLES
    
    # Parentage: Person -> Person
    exec_safe("CREATE REL TABLE PARENT_OF(FROM Person TO Person)")
    
    # Spouses: Person <-> Person (Undirected conceptually, but directed in graph DBs often represented as pair or directed req)
    # Kuzu supports recursive queries, but typically we define directed. 
    # For now: MARRIED_TO
    exec_safe("""
        CREATE REL TABLE MARRIED_TO(
            FROM Person TO Person,
            start_date STRING,
            end_date STRING
        )
    """)
    
    # Participation: Person -> Event
    exec_safe("""
        CREATE REL TABLE PARTICIPATED_IN(
            FROM Person TO Event,
            role STRING
        )
    """)

    print("Schema initialization complete.")

if __name__ == "__main__":
    create_schema()
