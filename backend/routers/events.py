
from fastapi import APIRouter, HTTPException, status
from typing import Optional, List
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()

# Event Types (Birth/Marriage/Death are handled by Person fields and relationship dates)
EVENT_TYPES = ['GRADUATION', 'MILITARY_SERVICE', 'AWARD', 'IMMIGRATION', 'RETIREMENT', 'OTHER']

class EventCreate(BaseModel):
    type: str
    event_date: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    participant_ids: Optional[List[int]] = None

class EventUpdate(BaseModel):
    type: Optional[str] = None
    event_date: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None

class ParticipantLink(BaseModel):
    person_id: int
    role: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate):
    """Create a new event, optionally linking participants."""
    db, conn = get_db_connection()
    
    # Validate event type
    if event.type not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid event type. Must be one of: {EVENT_TYPES}")
    
    # Create the event node
    query = """
        CREATE (e:Event {
            type: $type,
            event_date: $event_date,
            description: $description,
            location: $location
        })
        RETURN e.id
    """
    params = {
        "type": event.type,
        "event_date": event.event_date,
        "description": event.description,
        "location": event.location
    }
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=500, detail="Failed to create event")
        event_id = result.get_next()[0]
        
        # Link participants if provided
        if event.participant_ids:
            for pid in event.participant_ids:
                link_query = """
                    MATCH (p:Person), (e:Event)
                    WHERE p.id = $pid AND e.id = $eid
                    CREATE (p)-[:PARTICIPATED_IN]->(e)
                """
                conn.execute(link_query, parameters={"pid": pid, "eid": event_id})
        
        return {"id": event_id, "message": "Event created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_events(event_type: Optional[str] = None):
    """List all events, optionally filtered by type."""
    db, conn = get_db_connection()
    
    if event_type:
        query = """
            MATCH (e:Event)
            WHERE e.type = $type
            RETURN e.id, e.type, e.event_date, e.description, e.location
            ORDER BY e.event_date DESC
        """
        result = conn.execute(query, parameters={"type": event_type})
    else:
        query = """
            MATCH (e:Event)
            RETURN e.id, e.type, e.event_date, e.description, e.location
            ORDER BY e.event_date DESC
        """
        result = conn.execute(query)
    
    events = []
    while result.has_next():
        row = result.get_next()
        events.append({
            "id": row[0],
            "type": row[1],
            "event_date": row[2],
            "description": row[3],
            "location": row[4]
        })
    
    return events


@router.get("/types")
def get_event_types():
    """Return list of valid event types."""
    return EVENT_TYPES


@router.get("/{event_id}")
def get_event(event_id: int):
    """Get event details with participants."""
    db, conn = get_db_connection()
    
    # Get event
    event_query = """
        MATCH (e:Event)
        WHERE e.id = $eid
        RETURN e.id, e.type, e.event_date, e.description, e.location
    """
    result = conn.execute(event_query, parameters={"eid": event_id})
    
    if not result.has_next():
        raise HTTPException(status_code=404, detail="Event not found")
    
    row = result.get_next()
    event = {
        "id": row[0],
        "type": row[1],
        "event_date": row[2],
        "description": row[3],
        "location": row[4],
        "participants": []
    }
    
    # Get participants
    participants_query = """
        MATCH (p:Person)-[r:PARTICIPATED_IN]->(e:Event)
        WHERE e.id = $eid
        RETURN p.id, p.name, r.role
    """
    part_result = conn.execute(participants_query, parameters={"eid": event_id})
    
    while part_result.has_next():
        prow = part_result.get_next()
        event["participants"].append({
            "id": prow[0],
            "name": prow[1],
            "role": prow[2]
        })
    
    return event


@router.put("/{event_id}")
def update_event(event_id: int, event: EventUpdate):
    """Update event details."""
    db, conn = get_db_connection()
    
    # Build dynamic SET clause
    set_parts = []
    params = {"eid": event_id}
    
    if event.type is not None:
        if event.type not in EVENT_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid event type")
        set_parts.append("e.type = $type")
        params["type"] = event.type
    
    if event.event_date is not None:
        set_parts.append("e.event_date = $event_date")
        params["event_date"] = event.event_date
    
    if event.description is not None:
        set_parts.append("e.description = $description")
        params["description"] = event.description
    
    if event.location is not None:
        set_parts.append("e.location = $location")
        params["location"] = event.location
    
    if not set_parts:
        return {"message": "No changes"}
    
    query = f"""
        MATCH (e:Event)
        WHERE e.id = $eid
        SET {", ".join(set_parts)}
        RETURN e.id
    """
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Event not found")
        return {"message": "Event updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{event_id}")
def delete_event(event_id: int):
    """Delete an event and its participant links."""
    db, conn = get_db_connection()
    
    # Delete participant edges first, then the event node
    query = """
        MATCH (e:Event)
        WHERE e.id = $eid
        DETACH DELETE e
    """
    
    try:
        conn.execute(query, parameters={"eid": event_id})
        return {"message": "Event deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{event_id}/participants")
def add_participant(event_id: int, link: ParticipantLink):
    """Add a participant to an event."""
    db, conn = get_db_connection()
    
    # Check if link already exists
    check_query = """
        MATCH (p:Person)-[r:PARTICIPATED_IN]->(e:Event)
        WHERE p.id = $pid AND e.id = $eid
        RETURN r
    """
    result = conn.execute(check_query, parameters={"pid": link.person_id, "eid": event_id})
    if result.has_next():
        raise HTTPException(status_code=400, detail="Person already participates in this event")
    
    # Create link
    if link.role:
        query = """
            MATCH (p:Person), (e:Event)
            WHERE p.id = $pid AND e.id = $eid
            CREATE (p)-[:PARTICIPATED_IN {role: $role}]->(e)
            RETURN p.id
        """
        params = {"pid": link.person_id, "eid": event_id, "role": link.role}
    else:
        query = """
            MATCH (p:Person), (e:Event)
            WHERE p.id = $pid AND e.id = $eid
            CREATE (p)-[:PARTICIPATED_IN]->(e)
            RETURN p.id
        """
        params = {"pid": link.person_id, "eid": event_id}
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Person or Event not found")
        return {"message": "Participant added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{event_id}/participants/{person_id}")
def remove_participant(event_id: int, person_id: int):
    """Remove a participant from an event."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (p:Person)-[r:PARTICIPATED_IN]->(e:Event)
        WHERE p.id = $pid AND e.id = $eid
        DELETE r
    """
    
    try:
        conn.execute(query, parameters={"pid": person_id, "eid": event_id})
        return {"message": "Participant removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/person/{person_id}")
def get_person_events(person_id: int):
    """Get all events a person participated in."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (p:Person)-[r:PARTICIPATED_IN]->(e:Event)
        WHERE p.id = $pid
        RETURN e.id, e.type, e.event_date, e.description, e.location, r.role
        ORDER BY e.event_date DESC
    """
    
    result = conn.execute(query, parameters={"pid": person_id})
    
    events = []
    while result.has_next():
        row = result.get_next()
        events.append({
            "id": row[0],
            "type": row[1],
            "event_date": row[2],
            "description": row[3],
            "location": row[4],
            "role": row[5]
        })
    
    return events
