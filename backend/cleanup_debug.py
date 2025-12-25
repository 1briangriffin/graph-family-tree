
import kuzu
from database import get_db_connection

def cleanup():
    db, conn = get_db_connection()
    print("Cleaning up debug nodes...")
    
    # Names of debug nodes I likely created
    debug_names = ['TestA', 'TestB', 'Test1', 'Test2']
    
    try:
        # Get IDs first
        for name in debug_names:
            result = conn.execute("MATCH (p:Person) WHERE p.name = $name RETURN p.id", parameters={'name': name})
            while result.has_next():
                pid = result.get_next()[0]
                print(f"Deleting {name} (ID: {pid})")
                # Detach delete logic (manual until Kuzu supports DETACH DELETE fully in all contexts or just to be safe)
                conn.execute("MATCH (p:Person)-[r]->() WHERE p.id = $id DELETE r", parameters={'id': pid})
                conn.execute("MATCH ()-[r]->(p:Person) WHERE p.id = $id DELETE r", parameters={'id': pid})
                conn.execute("MATCH (p:Person) WHERE p.id = $id DELETE p", parameters={'id': pid})

        print("Cleanup complete.")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    cleanup()
