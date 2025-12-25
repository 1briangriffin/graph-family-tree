
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
            maiden_name STRING,
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

    # 5. Place Table
    exec_safe("""
        CREATE NODE TABLE Place(
            id SERIAL,
            name STRING,
            street STRING,
            city STRING,
            state STRING,
            country STRING,
            geo_lat DOUBLE,
            geo_lng DOUBLE,
            PRIMARY KEY (id)
        )
    """)

    # Residence: Person -> Place
    exec_safe("""
        CREATE REL TABLE LIVED_AT(
            FROM Person TO Place,
            start_date STRING,
            end_date STRING,
            residence_type STRING
        )
    """)

    # 6. Media Table
    exec_safe("""
        CREATE NODE TABLE Media(
            id SERIAL,
            filename STRING,
            file_path STRING,
            file_type STRING,
            caption STRING,
            upload_date STRING,
            PRIMARY KEY (id)
        )
    """)

    # Media relationships
    exec_safe("CREATE REL TABLE HAS_MEDIA(FROM Person TO Media)")
    exec_safe("CREATE REL TABLE EVENT_HAS_MEDIA(FROM Event TO Media)")

    # 7. Occupation Table
    exec_safe("""
        CREATE NODE TABLE Occupation(
            id SERIAL,
            title STRING,
            description STRING,
            start_date STRING,
            end_date STRING,
            location STRING,
            PRIMARY KEY (id)
        )
    """)

    # 8. Organization Table
    exec_safe("""
        CREATE NODE TABLE Organization(
            id SERIAL,
            name STRING,
            type STRING,
            location STRING,
            PRIMARY KEY (id)
        )
    """)

    # Occupation relationships
    exec_safe("CREATE REL TABLE WORKED_AS(FROM Person TO Occupation)")
    exec_safe("CREATE REL TABLE EMPLOYED_BY(FROM Occupation TO Organization)")

    print("Schema initialization complete.")

if __name__ == "__main__":
    create_schema()
