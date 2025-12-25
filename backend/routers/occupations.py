
from fastapi import APIRouter, HTTPException, status
from typing import Optional
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()


class OccupationCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    person_id: int
    organization_id: Optional[int] = None


class OccupationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_occupation(occupation: OccupationCreate):
    """Create a new occupation and link to person."""
    db, conn = get_db_connection()
    
    # Create occupation node
    query = """
        CREATE (o:Occupation {
            title: $title,
            description: $description,
            start_date: $start_date,
            end_date: $end_date,
            location: $location
        })
        RETURN o.id
    """
    params = {
        "title": occupation.title,
        "description": occupation.description,
        "start_date": occupation.start_date,
        "end_date": occupation.end_date,
        "location": occupation.location
    }
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=500, detail="Failed to create occupation")
        occupation_id = result.get_next()[0]
        
        # Link to person
        link_query = """
            MATCH (p:Person), (o:Occupation)
            WHERE p.id = $pid AND o.id = $oid
            CREATE (p)-[:WORKED_AS]->(o)
            RETURN p.id
        """
        result = conn.execute(link_query, parameters={"pid": occupation.person_id, "oid": occupation_id})
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Person not found")
        
        # Link to organization if provided
        if occupation.organization_id:
            org_query = """
                MATCH (o:Occupation), (org:Organization)
                WHERE o.id = $oid AND org.id = $orgid
                CREATE (o)-[:EMPLOYED_BY]->(org)
            """
            conn.execute(org_query, parameters={"oid": occupation_id, "orgid": occupation.organization_id})
        
        return {"id": occupation_id, "message": "Occupation created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_occupations():
    """List all occupations."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (o:Occupation)
        RETURN o.id, o.title, o.description, o.start_date, o.end_date, o.location
        ORDER BY o.start_date DESC
    """
    result = conn.execute(query)
    
    occupations = []
    while result.has_next():
        row = result.get_next()
        occupations.append({
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "start_date": row[3],
            "end_date": row[4],
            "location": row[5]
        })
    
    return occupations


@router.get("/{occupation_id}")
def get_occupation(occupation_id: int):
    """Get occupation details with person and organization."""
    db, conn = get_db_connection()
    
    # Get occupation
    query = """
        MATCH (o:Occupation)
        WHERE o.id = $oid
        RETURN o.id, o.title, o.description, o.start_date, o.end_date, o.location
    """
    result = conn.execute(query, parameters={"oid": occupation_id})
    
    if not result.has_next():
        raise HTTPException(status_code=404, detail="Occupation not found")
    
    row = result.get_next()
    occupation = {
        "id": row[0],
        "title": row[1],
        "description": row[2],
        "start_date": row[3],
        "end_date": row[4],
        "location": row[5],
        "organization": None
    }
    
    # Get organization if linked
    org_query = """
        MATCH (o:Occupation)-[:EMPLOYED_BY]->(org:Organization)
        WHERE o.id = $oid
        RETURN org.id, org.name, org.type, org.location
    """
    org_result = conn.execute(org_query, parameters={"oid": occupation_id})
    if org_result.has_next():
        orgrow = org_result.get_next()
        occupation["organization"] = {
            "id": orgrow[0],
            "name": orgrow[1],
            "type": orgrow[2],
            "location": orgrow[3]
        }
    
    return occupation


@router.put("/{occupation_id}")
def update_occupation(occupation_id: int, occupation: OccupationUpdate):
    """Update occupation details."""
    db, conn = get_db_connection()
    
    # Build dynamic SET clause
    set_parts = []
    params = {"oid": occupation_id}
    
    for field in ["title", "description", "start_date", "end_date", "location"]:
        value = getattr(occupation, field)
        if value is not None:
            set_parts.append(f"o.{field} = ${field}")
            params[field] = value
    
    if not set_parts:
        return {"message": "No changes"}
    
    query = f"""
        MATCH (o:Occupation)
        WHERE o.id = $oid
        SET {", ".join(set_parts)}
        RETURN o.id
    """
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Occupation not found")
        return {"message": "Occupation updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{occupation_id}")
def delete_occupation(occupation_id: int):
    """Delete an occupation."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (o:Occupation)
        WHERE o.id = $oid
        DETACH DELETE o
    """
    
    try:
        conn.execute(query, parameters={"oid": occupation_id})
        return {"message": "Occupation deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/person/{person_id}")
def get_person_occupations(person_id: int):
    """Get all occupations for a person with organization details."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (p:Person)-[:WORKED_AS]->(o:Occupation)
        WHERE p.id = $pid
        OPTIONAL MATCH (o)-[:EMPLOYED_BY]->(org:Organization)
        RETURN o.id, o.title, o.description, o.start_date, o.end_date, o.location,
               org.id, org.name, org.type, org.location
        ORDER BY o.start_date DESC
    """
    
    result = conn.execute(query, parameters={"pid": person_id})
    
    occupations = []
    while result.has_next():
        row = result.get_next()
        occ = {
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "start_date": row[3],
            "end_date": row[4],
            "location": row[5],
            "organization": None
        }
        
        if row[6] is not None:  # organization exists
            occ["organization"] = {
                "id": row[6],
                "name": row[7],
                "type": row[8],
                "location": row[9]
            }
        
        occupations.append(occ)
    
    return occupations


@router.post("/{occupation_id}/organization/{organization_id}")
def link_occupation_to_organization(occupation_id: int, organization_id: int):
    """Link an occupation to an organization."""
    db, conn = get_db_connection()
    
    # Check if link already exists
    check_query = """
        MATCH (o:Occupation)-[r:EMPLOYED_BY]->(org:Organization)
        WHERE o.id = $oid AND org.id = $orgid
        RETURN r
    """
    result = conn.execute(check_query, parameters={"oid": occupation_id, "orgid": organization_id})
    if result.has_next():
        return {"message": "Link already exists"}
    
    # Create link
    query = """
        MATCH (o:Occupation), (org:Organization)
        WHERE o.id = $oid AND org.id = $orgid
        CREATE (o)-[:EMPLOYED_BY]->(org)
        RETURN o.id
    """
    
    try:
        result = conn.execute(query, parameters={"oid": occupation_id, "orgid": organization_id})
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Occupation or Organization not found")
        return {"message": "Occupation linked to organization"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{occupation_id}/organization/{organization_id}")
def unlink_occupation_from_organization(occupation_id: int, organization_id: int):
    """Remove organization link from occupation."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (o:Occupation)-[r:EMPLOYED_BY]->(org:Organization)
        WHERE o.id = $oid AND org.id = $orgid
        DELETE r
    """
    
    try:
        conn.execute(query, parameters={"oid": occupation_id, "orgid": organization_id})
        return {"message": "Organization link removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
