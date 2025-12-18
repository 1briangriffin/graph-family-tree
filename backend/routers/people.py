
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from database import get_db_connection
from models import PersonCreate, PersonResponse

router = APIRouter()

@router.post("/", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
def create_person(person: PersonCreate):
    db, conn = get_db_connection()
    
    # Create Person in Kuzu
    # Note: Kuzu Python API requires careful type handling for params.
    # We use f-strings for simplicity in MVP where param binding might be fussy, 
    # but ideally we should use parameters={"name": person.name} if supported by installed version.
    
    # Using parameters (safer):
    query = """
        CREATE (p:Person {
            name: $name, 
            gender: $gender, 
            birth_date: $birth_date,
            death_date: $death_date,
            bio: $bio
        })
        RETURN p.id, p.name, p.gender, p.birth_date, p.death_date, p.bio
    """
    
    params = {
        "name": person.name,
        # Handle optionals - Kuzu might need explict NULL or empty string?
        # Typically passing None works for standard drivers, assuming Kuzu handles Python None -> NULL.
        "gender": person.gender,
        "birth_date": person.birth_date,
        "death_date": person.death_date,
        "bio": person.bio
    }
    
    try:
        result = conn.execute(query, parameters=params)
        if result.has_next():
            row = result.get_next()
            # Construct response
            return PersonResponse(
                id=row[0],
                name=row[1],
                gender=row[2],
                birth_date=row[3],
                death_date=row[4],
                bio=row[5]
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create person")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/", response_model=List[PersonResponse])
def list_people(limit: int = 50, skip: int = 0):
    db, conn = get_db_connection()
    # Pagination in Cypher: SKIP x LIMIT y
    query = f"""
        MATCH (p:Person)
        RETURN p.id, p.name, p.gender, p.birth_date, p.death_date, p.bio
        SKIP {skip} LIMIT {limit}
    """
    
    result = conn.execute(query)
    people = []
    while result.has_next():
        row = result.get_next()
        people.append(PersonResponse(
            id=row[0],
            name=row[1],
            gender=row[2],
            birth_date=row[3], # Kuzu returns Python date objects for DATE type
            death_date=row[4],
            bio=row[5]
        ))
    return people

@router.get("/{person_id}", response_model=PersonResponse)
def get_person(person_id: int):
    db, conn = get_db_connection()
    query = """
        MATCH (p:Person)
        WHERE p.id = $id
        RETURN p.id, p.name, p.gender, p.birth_date, p.death_date, p.bio
    """
    result = conn.execute(query, parameters={"id": person_id})
    if result.has_next():
        row = result.get_next()
        return PersonResponse(
            id=row[0],
            name=row[1],
            gender=row[2],
            birth_date=row[3],
            death_date=row[4],
            bio=row[5]
        )
    raise HTTPException(status_code=404, detail="Person not found")

@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: int):
    db, conn = get_db_connection()
    # DETACH DELETE to remove relationships too
    query = "MATCH (p:Person) WHERE p.id = $id DETACH DELETE p"
    conn.execute(query, parameters={"id": person_id})
    return None
