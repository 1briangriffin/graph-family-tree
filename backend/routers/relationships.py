
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import date
from database import get_db_connection

router = APIRouter()

class ParentRelation(BaseModel):
    parent_id: int
    child_id: int
    relationship_type: Optional[str] = "biological"
    adoption_date: Optional[str] = None

class SpouseRelation(BaseModel):
    spouse1_id: int
    spouse2_id: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@router.post("/parent", status_code=status.HTTP_201_CREATED)
def add_parent(relation: ParentRelation):
    db, conn = get_db_connection()
    
    # Check for self-loop
    if relation.parent_id == relation.child_id:
        raise HTTPException(status_code=400, detail="Cannot be parent of self")

    # Determine Edge Type and Properties
    if relation.relationship_type == "adopted":
        query = """
            MATCH (p:Person), (c:Person)
            WHERE p.id = $pid AND c.id = $cid
            CREATE (p)-[:ADOPTED_BY {adoption_date: $ad_date}]->(c)
            RETURN p.id, c.id
        """
        params = {
            "pid": relation.parent_id, 
            "cid": relation.child_id,
            "ad_date": relation.adoption_date
        }
    else:
        # Default: Biological
        query = """
            MATCH (p:Person), (c:Person)
            WHERE p.id = $pid AND c.id = $cid
            CREATE (p)-[:PARENT_OF]->(c)
            RETURN p.id, c.id
        """
        params = {"pid": relation.parent_id, "cid": relation.child_id}
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=404, detail="One or both persons not found")
    except Exception as e:
        # If ADOPTED_BY table missing, this will fail. We need the migration.
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Parent relationship created"}

@router.post("/spouse", status_code=status.HTTP_201_CREATED)
def add_spouse(relation: SpouseRelation):
    db, conn = get_db_connection()
    
    if relation.spouse1_id == relation.spouse2_id:
        raise HTTPException(status_code=400, detail="Cannot marry self")

    # Treat as undirected in concept, but we store one direction or both?
    # Usually easier to query if we enforce one direction canonical or just store double.
    # For now, store single direction: MARRIED_TO
    
    
    # 3. Dynamic definition of properties to handle NULLs safely if Kuzu acts up
    props = []
    params = {"id1": relation.spouse1_id, "id2": relation.spouse2_id}
    
    if relation.start_date:
        props.append("start_date: $start")
        params["start"] = relation.start_date
        
    if relation.end_date:
        props.append("end_date: $end")
        params["end"] = relation.end_date
        
    props_str = ", ".join(props)
    rel_token = f"[:MARRIED_TO {{{props_str}}}]" if props else "[:MARRIED_TO]"

    query = f"""
        MATCH (p1:Person), (p2:Person)
        WHERE p1.id = $id1 AND p2.id = $id2
        CREATE (p1)-{rel_token}->(p2)
        RETURN p1.id
    """
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
             raise HTTPException(status_code=404, detail="Persons not found")
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
         
@router.get("/graph")
def get_whole_graph():
    db, conn = get_db_connection()
    
    # 1. Get all people
    # Returning basic info needed for visualization
    nodes_query = "MATCH (p:Person) RETURN p.id, p.name, p.gender, p.birth_date"
    nodes_result = conn.execute(nodes_query)
    
    nodes = []
    while nodes_result.has_next():
        row = nodes_result.get_next()
        nodes.append({
            "id": row[0],
            "name": row[1],
            "gender": row[2],
            "birth_date": row[3]
        })
        
    # 2. Get all edges
    # PARENT_OF
    edges = []
    # PARENT_OF and ADOPTED_BY
    edges = []
    # We can match both types of edges
    parent_query = """
        MATCH (p:Person)-[r:PARENT_OF|ADOPTED_BY]->(c:Person) 
        RETURN p.id, c.id, label(r)
    """
    parent_result = conn.execute(parent_query)
    while parent_result.has_next():
        row = parent_result.get_next()
        edges.append({
            "source": row[0],
            "target": row[1],
            "type": row[2] # "PARENT_OF" or "ADOPTED_BY"
        })

    # MARRIED_TO
    spouse_query = "MATCH (p1:Person)-[r:MARRIED_TO]->(p2:Person) RETURN p1.id, p2.id"
    spouse_result = conn.execute(spouse_query)
    while spouse_result.has_next():
        row = spouse_result.get_next()
        edges.append({
            "source": row[0],
            "target": row[1],
            "type": "MARRIED_TO"
        })
        
    return {"nodes": nodes, "edges": edges}

@router.delete("/parent")
def remove_parent(relation: ParentRelation):
    db, conn = get_db_connection()
    
    query = """
        MATCH (p:Person)-[r:PARENT_OF|ADOPTED_BY]->(c:Person)
        WHERE p.id = $pid AND c.id = $cid
        DELETE r
    """
    params = {"pid": relation.parent_id, "cid": relation.child_id}
    
    try:
        conn.execute(query, parameters=params)
        # We can't easily check if it deleted anything without a prior match or checking result stats (if kuzu provides)
        # For now, just assume success if no error.
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Parent relationship removed"}

@router.put("/parent")
def update_parent(relation: ParentRelation):
    """
    Update parent relationship metadata and type.
    If type changes (Bio <-> Adopted), delete old edge and create new one.
    """
    db, conn = get_db_connection()
    
    # 1. Check existing relationship type
    check_query = """
        MATCH (p:Person)-[r]->(c:Person)
        WHERE p.id = $pid AND c.id = $cid
        RETURN label(r)
    """
    params = {
        "pid": relation.parent_id, 
        "cid": relation.child_id
    }
    
    result = conn.execute(check_query, parameters=params)
    if not result.has_next():
        raise HTTPException(status_code=404, detail="Relationship not found")
        
    current_type_label = result.get_next()[0] # "PARENT_OF" or "ADOPTED_BY"
    
    target_type_label = "ADOPTED_BY" if relation.relationship_type == "adopted" else "PARENT_OF"
    
    if current_type_label != target_type_label:
        # Type Changed: Delete and Re-create
        delete_query = f"""
            MATCH (p:Person)-[r:{current_type_label}]->(c:Person)
            WHERE p.id = $pid AND c.id = $cid
            DELETE r
        """
        conn.execute(delete_query, parameters=params)
        
        # Create new
        if target_type_label == "ADOPTED_BY":
             create_query = """
                MATCH (p:Person), (c:Person)
                WHERE p.id = $pid AND c.id = $cid
                CREATE (p)-[:ADOPTED_BY {adoption_date: $ad_date}]->(c)
            """
             create_params = {**params, "ad_date": relation.adoption_date}
             conn.execute(create_query, parameters=create_params)
        else:
             create_query = """
                MATCH (p:Person), (c:Person)
                WHERE p.id = $pid AND c.id = $cid
                CREATE (p)-[:PARENT_OF]->(c)
            """
             conn.execute(create_query, parameters=params)
             
    else:
        # Same Type: Just Update Props
        if target_type_label == "ADOPTED_BY":
             query = """
                MATCH (p:Person)-[r:ADOPTED_BY]->(c:Person)
                WHERE p.id = $pid AND c.id = $cid
                SET r.adoption_date = $ad_date
            """
             conn.execute(query, parameters={**params, "ad_date": relation.adoption_date})
             
    return {"message": "Relationship updated"}

@router.put("/spouse")
def update_spouse(relation: SpouseRelation):
    """
    Update spouse relationship metadata (start_date, end_date).
    """
    db, conn = get_db_connection()
    
    # Kuzu requires non-null for SET usually, or dynamic query.
    # We'll use simple dynamic construction.
    
    set_clauses = []
    params = {"id1": relation.spouse1_id, "id2": relation.spouse2_id}
    
    if relation.start_date is not None:
        set_clauses.append("r.start_date = $start")
        params["start"] = relation.start_date
        
    if relation.end_date is not None:
        set_clauses.append("r.end_date = $end")
        params["end"] = relation.end_date
        
    if not set_clauses:
        return {"message": "No changes"}
        
    set_str = ", ".join(set_clauses)
    
    query = f"""
        MATCH (p1:Person)-[r:MARRIED_TO]-(p2:Person)
        WHERE p1.id = $id1 AND p2.id = $id2
        SET {set_str}
        RETURN p1.id
    """
    
    try:
        conn.execute(query, parameters=params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Spouse relationship updated"}

