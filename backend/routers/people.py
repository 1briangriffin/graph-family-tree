
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from database import get_db_connection
from models import PersonCreate, PersonResponse

router = APIRouter()

@router.post("/", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
def create_person(person: PersonCreate):
    db, conn = get_db_connection()
    
    # Helper to convert empty strings to None
    def empty_to_none(value):
        return None if value == "" else value
    
    # Create Person in Kuzu
    query = """
        CREATE (p:Person {
            name: $name, 
            gender: $gender, 
            birth_date: $bdate, 
            birth_place: $bplace,
            death_date: $ddate, 
            death_place: $dplace,
            bio: $bio,
            maiden_name: $maiden
        })
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio, p.maiden_name
    """
    params = {
        "name": person.name,
        "gender": empty_to_none(person.gender),
        "bdate": empty_to_none(person.birth_date),
        "bplace": empty_to_none(person.birth_place),
        "ddate": empty_to_none(person.death_date),
        "dplace": empty_to_none(person.death_place),
        "bio": empty_to_none(person.bio),
        "maiden": empty_to_none(person.maiden_name)
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
                birth_place=row[4],
                death_date=row[5],
                death_place=row[6],
                bio=row[7],
                maiden_name=row[8]
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create person")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/", response_model=List[PersonResponse])
def list_people(
    search: Optional[str] = None,
    birth_year: Optional[int] = None,
    location: Optional[str] = None,
    alive: Optional[bool] = None
):
    """List all people with optional search and filters."""
    db, conn = get_db_connection()
    
    # Build WHERE clauses dynamically
    where_clauses = []
    params = {}
    
    if search:
        where_clauses.append("p.name CONTAINS $search")
        params["search"] = search
    
    if birth_year:
        where_clauses.append("p.birth_date CONTAINS $birth_year")
        params["birth_year"] = str(birth_year)
    
    if location:
        where_clauses.append("(p.birth_place CONTAINS $location OR p.death_place CONTAINS $location)")
        params["location"] = location
    
    if alive is not None:
        if alive:
            where_clauses.append("p.death_date IS NULL")
        else:
            where_clauses.append("p.death_date IS NOT NULL")
    
    # Construct query
    where_str = " AND ".join(where_clauses) if where_clauses else "TRUE"
    query = f"""
        MATCH (p:Person)
        WHERE {where_str}
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio, p.maiden_name
        ORDER BY p.name
        LIMIT 100
    """
    
    result = conn.execute(query, parameters=params)
    people = []
    while result.has_next():
        row = result.get_next()
        people.append(PersonResponse(
            id=row[0],
            name=row[1],
            gender=row[2],
            birth_date=row[3],
            birth_place=row[4],
            death_date=row[5],
            death_place=row[6],
            bio=row[7],
            maiden_name=row[8]
        ))
    return people

@router.get("/{person_id}", response_model=PersonResponse)
def get_person(person_id: int):
    db, conn = get_db_connection()
    query = """
        MATCH (p:Person)
        WHERE p.id = $id
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio, p.maiden_name
    """
    result = conn.execute(query, parameters={"id": person_id})
    if result.has_next():
        row = result.get_next()
        return PersonResponse(
            id=row[0],
            name=row[1],
            gender=row[2],
            birth_date=row[3],
            birth_place=row[4],
            death_date=row[5],
            death_place=row[6],
            bio=row[7],
            maiden_name=row[8]
        )
    raise HTTPException(status_code=404, detail="Person not found")

@router.put("/{person_id}", response_model=PersonResponse)
def update_person(person_id: int, person: PersonCreate):
    db, conn = get_db_connection()
    
    # 1. Update properties
    query = """
        MATCH (p:Person)
        WHERE p.id = $id
        SET p.name = $name,
            p.gender = $gender,
            p.birth_date = $birth_date,
            p.birth_place = $birth_place,
            p.death_date = $death_date,
            p.death_place = $death_place,
            p.bio = $bio,
            p.maiden_name = $maiden
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio, p.maiden_name
    """
    
    params = {
        "id": person_id,
        "name": person.name,
        "gender": person.gender,
        "birth_date": person.birth_date,
        "birth_place": person.birth_place,
        "death_date": person.death_date,
        "death_place": person.death_place,
        "bio": person.bio,
        "maiden": person.maiden_name
    }
    
    try:
        result = conn.execute(query, parameters=params)
        if result.has_next():
            row = result.get_next()
            return PersonResponse(
                id=row[0],
                name=row[1],
                gender=row[2],
                birth_date=row[3],
                birth_place=row[4],
                death_date=row[5],
                death_place=row[6],
                bio=row[7],
                maiden_name=row[8]
            )
        else:
             raise HTTPException(status_code=404, detail="Person not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: int):
    db, conn = get_db_connection()
    # DETACH DELETE to remove relationships too
    query = "MATCH (p:Person) WHERE p.id = $id DETACH DELETE p"
    conn.execute(query, parameters={"id": person_id})
    return None

@router.get("/{person_id}/relationships")
def get_person_relationships(person_id: int):
    """
    Returns a dictionary of relationships for the given person.
    """
    db, conn = get_db_connection()
    
    # Helper to build dict since we can't reuse PersonResponse easily without full fields sometimes
    # Actually we can just return what we have.
    
    # 1. Parents
    parents_query = """
        MATCH (parent:Person)-[r:PARENT_OF|ADOPTED_BY]->(p:Person)
        WHERE p.id = $id
        RETURN parent.id, parent.name, parent.gender, parent.birth_date, parent.death_date, parent.bio, label(r), r.adoption_date
    """
    parents_res = conn.execute(parents_query, parameters={"id": person_id})
    parents = []
    while parents_res.has_next():
        row = parents_res.get_next()
        # label(r) returns "PARENT_OF" or "ADOPTED_BY"
        rel_type = row[6]
        adoption_date = row[7] if rel_type == "ADOPTED_BY" else None
        
        parents.append({
            "id": row[0],
            "name": row[1],
            "gender": row[2],
            "birth_date": row[3],
            "death_date": row[4],
            "bio": row[5],
            "relationship_type": "adopted" if rel_type == "ADOPTED_BY" else "biological",
            "adoption_date": adoption_date
        })

    # 2. Children
    children_query = """
        MATCH (p:Person)-[r:PARENT_OF|ADOPTED_BY]->(child:Person)
        WHERE p.id = $id
        RETURN child.id, child.name, child.gender, child.birth_date, child.death_date, child.bio, label(r), r.adoption_date
    """
    children_res = conn.execute(children_query, parameters={"id": person_id})
    children = []
    while children_res.has_next():
        row = children_res.get_next()
        rel_type = row[6]
        adoption_date = row[7] if rel_type == "ADOPTED_BY" else None

        children.append({
            "id": row[0],
            "name": row[1],
            "gender": row[2],
            "birth_date": row[3],
            "death_date": row[4],
            "bio": row[5],
            "relationship_type": "adopted" if rel_type == "ADOPTED_BY" else "biological",
            "adoption_date": adoption_date
        })

    # 3. Spouses
    spouses_query = """
        MATCH (p:Person)-[r:MARRIED_TO]-(spouse:Person)
        WHERE p.id = $id
        RETURN spouse.id, spouse.name, spouse.gender, spouse.birth_date, spouse.death_date, spouse.bio, r.start_date, r.end_date
    """
    spouses_res = conn.execute(spouses_query, parameters={"id": person_id})
    spouses = []
    while spouses_res.has_next():
        row = spouses_res.get_next()
        spouses.append({
            "id": row[0],
            "name": row[1],
            "gender": row[2],
            "birth_date": row[3],
            "death_date": row[4],
            "bio": row[5],
            "start_date": row[6],
            "end_date": row[7]
        })

    # 4. Siblings (Inferred)
    # Share at least one parent (PARENT_OF or ADOPTED_BY)
    # distinct to avoid double counting if checking both parents
    siblings_query = """
        MATCH (p:Person)<-[:PARENT_OF|ADOPTED_BY]-(parent:Person)-[:PARENT_OF|ADOPTED_BY]->(sibling:Person)
        WHERE p.id = $id AND sibling.id <> $id
        RETURN DISTINCT sibling.id, sibling.name, sibling.gender, sibling.birth_date, sibling.death_date, sibling.bio
    """
    siblings_res = conn.execute(siblings_query, parameters={"id": person_id})
    siblings = []
    while siblings_res.has_next():
        row = siblings_res.get_next()
        siblings.append({
            "id": row[0],
            "name": row[1],
            "gender": row[2],
            "birth_date": row[3],
            "death_date": row[4],
            "bio": row[5]
        })

    return {
        "parents": parents,
        "children": children,
        "spouses": spouses,
        "siblings": siblings
    }
