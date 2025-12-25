
import kuzu
from database import get_db_connection
import datetime

def debug():
    db, conn = get_db_connection()
    print("\n--- Verbose Graph Query ---")
    
    try:
        # 1. Nodes
        print("Fetching Nodes...")
        nodes_query = "MATCH (p:Person) RETURN p.id, p.name, p.gender, p.birth_date"
        nodes_result = conn.execute(nodes_query)
        while nodes_result.has_next():
            row = nodes_result.get_next()
            print(f"Node: {row} Types: {[type(x) for x in row]}")

        # 2. Edges - Parent
        print("Fetching Parent Edges...")
        parent_query = "MATCH (p:Person)-[r:PARENT_OF]->(c:Person) RETURN p.id, c.id"
        parent_result = conn.execute(parent_query)
        while parent_result.has_next():
            row = parent_result.get_next()
            print(f"Parent Edge: {row} Types: {[type(x) for x in row]}")

        # 3. Edges - Spouse
        print("Fetching Spouse Edges...")
        spouse_query = "MATCH (p1:Person)-[r:MARRIED_TO]->(p2:Person) RETURN p1.id, p2.id"
        spouse_result = conn.execute(spouse_query)
        while spouse_result.has_next():
            row = spouse_result.get_next()
            print(f"Spouse Edge: {row} Types: {[type(x) for x in row]}")

    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    debug()
