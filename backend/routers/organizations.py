
from fastapi import APIRouter, HTTPException, status
from typing import Optional
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()


class OrganizationCreate(BaseModel):
    name: str
    type: Optional[str] = None  # 'company', 'military', 'school', 'non-profit', 'government'
    location: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    location: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_organization(organization: OrganizationCreate):
    """Create a new organization."""
    db, conn = get_db_connection()
    
    query = """
        CREATE (org:Organization {
            name: $name,
            type: $type,
            location: $location
        })
        RETURN org.id
    """
    params = {
        "name": organization.name,
        "type": organization.type,
        "location": organization.location
    }
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=500, detail="Failed to create organization")
        org_id = result.get_next()[0]
        return {"id": org_id, "message": "Organization created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_organizations(search: Optional[str] = None):
    """List all organizations with optional name search."""
    db, conn = get_db_connection()
    
    if search:
        query = """
            MATCH (org:Organization)
            WHERE org.name CONTAINS $search
            RETURN org.id, org.name, org.type, org.location
            ORDER BY org.name
        """
        result = conn.execute(query, parameters={"search": search})
    else:
        query = """
            MATCH (org:Organization)
            RETURN org.id, org.name, org.type, org.location
            ORDER BY org.name
        """
        result = conn.execute(query)
    
    organizations = []
    while result.has_next():
        row = result.get_next()
        organizations.append({
            "id": row[0],
            "name": row[1],
            "type": row[2],
            "location": row[3]
        })
    
    return organizations


@router.get("/{organization_id}")
def get_organization(organization_id: int):
    """Get organization details with all employees/occupations."""
    db, conn = get_db_connection()
    
    # Get organization
    query = """
        MATCH (org:Organization)
        WHERE org.id = $orgid
        RETURN org.id, org.name, org.type, org.location
    """
    result = conn.execute(query, parameters={"orgid": organization_id})
    
    if not result.has_next():
        raise HTTPException(status_code=404, detail="Organization not found")
    
    row = result.get_next()
    organization = {
        "id": row[0],
        "name": row[1],
        "type": row[2],
        "location": row[3],
        "employees": []
    }
    
    # Get all employees via occupations
    emp_query = """
        MATCH (p:Person)-[:WORKED_AS]->(o:Occupation)-[:EMPLOYED_BY]->(org:Organization)
        WHERE org.id = $orgid
        RETURN p.id, p.first_name, p.last_name, o.title, o.start_date, o.end_date
        ORDER BY o.start_date DESC
    """
    emp_result = conn.execute(emp_query, parameters={"orgid": organization_id})
    
    while emp_result.has_next():
        emp_row = emp_result.get_next()
        organization["employees"].append({
            "person_id": emp_row[0],
            "name": f"{emp_row[1]} {emp_row[2]}",
            "title": emp_row[3],
            "start_date": emp_row[4],
            "end_date": emp_row[5]
        })
    
    return organization


@router.put("/{organization_id}")
def update_organization(organization_id: int, organization: OrganizationUpdate):
    """Update organization details."""
    db, conn = get_db_connection()
    
    # Build dynamic SET clause
    set_parts = []
    params = {"orgid": organization_id}
    
    for field in ["name", "type", "location"]:
        value = getattr(organization, field)
        if value is not None:
            set_parts.append(f"org.{field} = ${field}")
            params[field] = value
    
    if not set_parts:
        return {"message": "No changes"}
    
    query = f"""
        MATCH (org:Organization)
        WHERE org.id = $orgid
        SET {", ".join(set_parts)}
        RETURN org.id
    """
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Organization not found")
        return {"message": "Organization updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{organization_id}")
def delete_organization(organization_id: int):
    """Delete an organization."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (org:Organization)
        WHERE org.id = $orgid
        DETACH DELETE org
    """
    
    try:
        conn.execute(query, parameters={"orgid": organization_id})
        return {"message": "Organization deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
