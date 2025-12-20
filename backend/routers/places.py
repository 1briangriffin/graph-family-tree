
from fastapi import APIRouter, HTTPException, status
from typing import Optional
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()


class PlaceCreate(BaseModel):
    name: str
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None


class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None


class ResidenceLink(BaseModel):
    person_id: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    residence_type: Optional[str] = None  # 'primary', 'vacation', 'work', etc.


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_place(place: PlaceCreate):
    """Create a new place."""
    db, conn = get_db_connection()
    
    query = """
        CREATE (p:Place {
            name: $name,
            street: $street,
            city: $city,
            state: $state,
            country: $country,
            geo_lat: $geo_lat,
            geo_lng: $geo_lng
        })
        RETURN p.id
    """
    params = {
        "name": place.name,
        "street": place.street,
        "city": place.city,
        "state": place.state,
        "country": place.country,
        "geo_lat": place.geo_lat,
        "geo_lng": place.geo_lng
    }
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=500, detail="Failed to create place")
        place_id = result.get_next()[0]
        return {"id": place_id, "message": "Place created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_places(search: Optional[str] = None):
    """List all places, optionally filtered by name/city search."""
    db, conn = get_db_connection()
    
    if search:
        query = """
            MATCH (p:Place)
            WHERE p.name CONTAINS $search OR p.city CONTAINS $search OR p.state CONTAINS $search
            RETURN p.id, p.name, p.street, p.city, p.state, p.country, p.geo_lat, p.geo_lng
            ORDER BY p.name
        """
        result = conn.execute(query, parameters={"search": search})
    else:
        query = """
            MATCH (p:Place)
            RETURN p.id, p.name, p.street, p.city, p.state, p.country, p.geo_lat, p.geo_lng
            ORDER BY p.name
        """
        result = conn.execute(query)
    
    places = []
    while result.has_next():
        row = result.get_next()
        places.append({
            "id": row[0],
            "name": row[1],
            "street": row[2],
            "city": row[3],
            "state": row[4],
            "country": row[5],
            "geo_lat": row[6],
            "geo_lng": row[7]
        })
    
    return places


@router.get("/{place_id}")
def get_place(place_id: int):
    """Get place details with residents."""
    db, conn = get_db_connection()
    
    # Get place info
    place_query = """
        MATCH (p:Place)
        WHERE p.id = $pid
        RETURN p.id, p.name, p.street, p.city, p.state, p.country, p.geo_lat, p.geo_lng
    """
    result = conn.execute(place_query, parameters={"pid": place_id})
    
    if not result.has_next():
        raise HTTPException(status_code=404, detail="Place not found")
    
    row = result.get_next()
    place = {
        "id": row[0],
        "name": row[1],
        "street": row[2],
        "city": row[3],
        "state": row[4],
        "country": row[5],
        "geo_lat": row[6],
        "geo_lng": row[7],
        "residents": []
    }
    
    # Get residents
    residents_query = """
        MATCH (person:Person)-[r:LIVED_AT]->(p:Place)
        WHERE p.id = $pid
        RETURN person.id, person.name, r.start_date, r.end_date, r.residence_type
        ORDER BY r.start_date DESC
    """
    res_result = conn.execute(residents_query, parameters={"pid": place_id})
    
    while res_result.has_next():
        resrow = res_result.get_next()
        place["residents"].append({
            "id": resrow[0],
            "name": resrow[1],
            "start_date": resrow[2],
            "end_date": resrow[3],
            "residence_type": resrow[4]
        })
    
    return place


@router.put("/{place_id}")
def update_place(place_id: int, place: PlaceUpdate):
    """Update place details."""
    db, conn = get_db_connection()
    
    # Build dynamic SET clause
    set_parts = []
    params = {"pid": place_id}
    
    for field in ["name", "street", "city", "state", "country", "geo_lat", "geo_lng"]:
        value = getattr(place, field)
        if value is not None:
            set_parts.append(f"p.{field} = ${field}")
            params[field] = value
    
    if not set_parts:
        return {"message": "No changes"}
    
    query = f"""
        MATCH (p:Place)
        WHERE p.id = $pid
        SET {", ".join(set_parts)}
        RETURN p.id
    """
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Place not found")
        return {"message": "Place updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{place_id}")
def delete_place(place_id: int):
    """Delete a place and its residence links."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (p:Place)
        WHERE p.id = $pid
        DETACH DELETE p
    """
    
    try:
        conn.execute(query, parameters={"pid": place_id})
        return {"message": "Place deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{place_id}/residents")
def add_resident(place_id: int, link: ResidenceLink):
    """Add a resident to a place (LIVED_AT relationship)."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (person:Person), (place:Place)
        WHERE person.id = $pid AND place.id = $plid
        CREATE (person)-[:LIVED_AT {
            start_date: $start_date,
            end_date: $end_date,
            residence_type: $res_type
        }]->(place)
        RETURN person.id
    """
    params = {
        "pid": link.person_id,
        "plid": place_id,
        "start_date": link.start_date,
        "end_date": link.end_date,
        "res_type": link.residence_type
    }
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Person or Place not found")
        return {"message": "Resident added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{place_id}/residents/{person_id}")
def remove_resident(place_id: int, person_id: int):
    """Remove a resident from a place."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (person:Person)-[r:LIVED_AT]->(place:Place)
        WHERE person.id = $pid AND place.id = $plid
        DELETE r
    """
    
    try:
        conn.execute(query, parameters={"pid": person_id, "plid": place_id})
        return {"message": "Resident removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/person/{person_id}")
def get_person_residences(person_id: int):
    """Get all places a person has lived."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (person:Person)-[r:LIVED_AT]->(place:Place)
        WHERE person.id = $pid
        RETURN place.id, place.name, place.city, place.state, place.country, 
               r.start_date, r.end_date, r.residence_type
        ORDER BY r.start_date DESC
    """
    
    result = conn.execute(query, parameters={"pid": person_id})
    
    residences = []
    while result.has_next():
        row = result.get_next()
        residences.append({
            "id": row[0],
            "name": row[1],
            "city": row[2],
            "state": row[3],
            "country": row[4],
            "start_date": row[5],
            "end_date": row[6],
            "residence_type": row[7]
        })
    
    return residences
