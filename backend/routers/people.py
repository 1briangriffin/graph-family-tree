
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
            birth_place: $birth_place,
            death_date: $death_date,
            death_place: $death_place,
            bio: $bio
        })
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio
    """
    
    params = {
        "name": person.name,
        "gender": person.gender,
        "birth_date": person.birth_date,
        "birth_place": person.birth_place,
        "death_date": person.death_date,
        "death_place": person.death_place,
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
                birth_place=row[4],
                death_date=row[5],
                death_place=row[6],
                bio=row[7]
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create person")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/search", response_model=List[PersonResponse])
def search_people(q: str):
    db, conn = get_db_connection()
    # Case insensitive search using regular expression or similar if Kuzu supports it.
    # Kuzu supports `contains(string, search)`
    query = """
        MATCH (p:Person)
        WHERE p.name CONTAINS $q
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio
        LIMIT 20
    """
    
    result = conn.execute(query, parameters={"q": q})
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
            bio=row[7]
        ))
    return people

@router.get("/", response_model=List[PersonResponse])
def list_people(limit: int = 50, skip: int = 0):
    db, conn = get_db_connection()
    # Pagination in Cypher: SKIP x LIMIT y
    query = f"""
        MATCH (p:Person)
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio
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
            birth_date=row[3],
            birth_place=row[4],
            death_date=row[5],
            death_place=row[6],
            bio=row[7]
        ))
    return people

@router.get("/{person_id}", response_model=PersonResponse)
def get_person(person_id: int):
    db, conn = get_db_connection()
    query = """
        MATCH (p:Person)
        WHERE p.id = $id
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio
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
            bio=row[7]
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
            p.bio = $bio
        RETURN p.id, p.name, p.gender, p.birth_date, p.birth_place, p.death_date, p.death_place, p.bio
    """
    
    params = {
        "id": person_id,
        "name": person.name,
        "gender": person.gender,
        "birth_date": person.birth_date,
        "birth_place": person.birth_place,
        "death_date": person.death_date,
        "death_place": person.death_place,
        "bio": person.bio
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
                bio=row[7]
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
