
import kuzu
from database import get_db_connection

def debug():
    db, conn = get_db_connection()
    print("\n--- Testing Relationship Insert with Dynamic Logic ---")
    
    # Setup dummies
    try:
        conn.execute("CREATE (p:Person {name: 'TestA', id: 888})")
        conn.execute("CREATE (p:Person {name: 'TestB', id: 889})")
    except:
        pass # might exist

    # Logic mimicking relationships.py
    id1 = 888
    id2 = 889
    start_date = None
    end_date = None

    props = []
    params = {"id1": id1, "id2": id2}
    
    if start_date:
        props.append("start_date: $start")
        params["start"] = start_date
        
    if end_date:
        props.append("end_date: $end")
        params["end"] = end_date
        
    props_str = ", ".join(props)
    rel_token = f"[:MARRIED_TO {{{props_str}}}]" if props else "[:MARRIED_TO]"

    query = f"""
        MATCH (p1:Person), (p2:Person)
        WHERE p1.id = $id1 AND p2.id = $id2
        CREATE (p1)-{rel_token}->(p2)
        RETURN p1.id
    """
    
    print("Generated Query:", query)
    print("Params:", params)

    try:
        result = conn.execute(query, parameters=params)
        if result.has_next():
             print("Success:", result.get_next())
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    debug()
