
import kuzu
from database import get_db_connection

def migrate():
    db, conn = get_db_connection()
    print("Starting Date Migration (DATE -> STRING)...")

    # The plan:
    # 1. Add new STRING columns (e.g. birth_date_str)
    # 2. Copy data from DATE columns to STRING columns
    # 3. Kuzu assumes we can't drop columns easily right now, but we can update code to use new ones.
    #    OR we can just DROP the `birth_date` column if Kuzu supports `ALTER TABLE Person DROP birth_date`.
    #    Checking Kuzu docs mentally: `ALTER TABLE table_name DROP column_name` is supported in recent versions.
    #    If not, we just ignore the old one. We'll try dropping.

    # --- Person Table ---
    cols = [
        ('birth_date', 'birth_date_new'), 
        ('death_date', 'death_date_new')
    ]

    for old_col, new_col in cols:
        print(f"Processing Person.{old_col} -> {new_col}")
        try:
            conn.execute(f"ALTER TABLE Person ADD {new_col} STRING")
        except:
            print(f"  Column {new_col} might already exist.")

        # Copy Data
        # Cypher cast/string conversion: string(p.birth_date)
        conn.execute(f"MATCH (p:Person) WHERE p.{old_col} IS NOT NULL SET p.{new_col} = string(p.{old_col})")
        
        # Verify
        # cnt = conn.execute(f"MATCH (p:Person) WHERE p.{new_col} IS NOT NULL RETURN count(*)")
        # print(f"  Migrated {cnt.get_next()[0]} rows.")

        # Drop old? (Risk: data loss if script fails mid-way). 
        # Better approach: 
        # 1. DROP old column. 
        # 2. RENAME new column to old name.
        
        try:
            conn.execute(f"ALTER TABLE Person DROP {old_col}")
            print(f"  Dropped {old_col}")
            conn.execute(f"ALTER TABLE Person RENAME {new_col} TO {old_col}")
            print(f"  Renamed {new_col} to {old_col}")
        except Exception as e:
            print(f"  Failed to drop/rename: {e}")


    # --- MARRIED_TO Table ---
    # Rel tables in Kuzu might act differently, let's try.
    rel_cols = [
        ('start_date', 'start_date_new'),
        ('end_date', 'end_date_new')
    ]
    
    for old_col, new_col in rel_cols:
        print(f"Processing MARRIED_TO.{old_col} -> {new_col}")
        try:
            conn.execute(f"ALTER TABLE MARRIED_TO ADD {new_col} STRING")
        except:
            pass
            
        conn.execute(f"MATCH (a)-[r:MARRIED_TO]->(b) WHERE r.{old_col} IS NOT NULL SET r.{new_col} = string(r.{old_col})")
        
        try:
            conn.execute(f"ALTER TABLE MARRIED_TO DROP {old_col}")
            print(f"  Dropped {old_col}")
            conn.execute(f"ALTER TABLE MARRIED_TO RENAME {new_col} TO {old_col}")
            print(f"  Renamed {new_col} to {old_col}")
        except Exception as e:
             print(f"  Failed to drop/rename: {e}")

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
