
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional
from pydantic import BaseModel
from database import get_db_connection
from datetime import datetime
import os
import uuid

router = APIRouter()

# Media storage directory (relative to backend folder)
MEDIA_DIR = "media_uploads"
os.makedirs(MEDIA_DIR, exist_ok=True)


class MediaLink(BaseModel):
    entity_id: int


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None)
):
    """Upload a media file."""
    db, conn = get_db_connection()
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(MEDIA_DIR, unique_filename)
    
    # Determine file type
    content_type = file.content_type or "application/octet-stream"
    if content_type.startswith("image/"):
        file_type = "image"
    elif content_type.startswith("video/"):
        file_type = "video"
    elif content_type in ["application/pdf"]:
        file_type = "document"
    else:
        file_type = "other"
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create Media node
    upload_date = datetime.now().strftime("%Y-%m-%d")
    query = """
        CREATE (m:Media {
            filename: $filename,
            file_path: $file_path,
            file_type: $file_type,
            caption: $caption,
            upload_date: $upload_date
        })
        RETURN m.id
    """
    params = {
        "filename": file.filename or unique_filename,
        "file_path": file_path,
        "file_type": file_type,
        "caption": caption,
        "upload_date": upload_date
    }
    
    try:
        result = conn.execute(query, parameters=params)
        if not result.has_next():
            raise HTTPException(status_code=500, detail="Failed to create media record")
        media_id = result.get_next()[0]
        return {
            "id": media_id,
            "filename": file.filename,
            "file_type": file_type,
            "message": "Media uploaded successfully"
        }
    except Exception as e:
        # Clean up file if DB insert fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_media(file_type: Optional[str] = None):
    """List all media, optionally filtered by type."""
    db, conn = get_db_connection()
    
    if file_type:
        query = """
            MATCH (m:Media)
            WHERE m.file_type = $ftype
            RETURN m.id, m.filename, m.file_path, m.file_type, m.caption, m.upload_date
            ORDER BY m.upload_date DESC
        """
        result = conn.execute(query, parameters={"ftype": file_type})
    else:
        query = """
            MATCH (m:Media)
            RETURN m.id, m.filename, m.file_path, m.file_type, m.caption, m.upload_date
            ORDER BY m.upload_date DESC
        """
        result = conn.execute(query)
    
    media_list = []
    while result.has_next():
        row = result.get_next()
        media_list.append({
            "id": row[0],
            "filename": row[1],
            "file_path": row[2],
            "file_type": row[3],
            "caption": row[4],
            "upload_date": row[5]
        })
    
    return media_list


@router.get("/{media_id}")
def get_media(media_id: int):
    """Get media metadata."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (m:Media)
        WHERE m.id = $mid
        RETURN m.id, m.filename, m.file_path, m.file_type, m.caption, m.upload_date
    """
    result = conn.execute(query, parameters={"mid": media_id})
    
    if not result.has_next():
        raise HTTPException(status_code=404, detail="Media not found")
    
    row = result.get_next()
    return {
        "id": row[0],
        "filename": row[1],
        "file_path": row[2],
        "file_type": row[3],
        "caption": row[4],
        "upload_date": row[5]
    }


@router.get("/{media_id}/file")
def get_media_file(media_id: int):
    """Serve the actual media file."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (m:Media)
        WHERE m.id = $mid
        RETURN m.file_path, m.filename
    """
    result = conn.execute(query, parameters={"mid": media_id})
    
    if not result.has_next():
        raise HTTPException(status_code=404, detail="Media not found")
    
    row = result.get_next()
    file_path = row[0]
    filename = row[1]
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(file_path, filename=filename)


@router.delete("/{media_id}")
def delete_media(media_id: int):
    """Delete a media item and its file."""
    db, conn = get_db_connection()
    
    # Get file path first
    get_query = """
        MATCH (m:Media)
        WHERE m.id = $mid
        RETURN m.file_path
    """
    result = conn.execute(get_query, parameters={"mid": media_id})
    
    if not result.has_next():
        raise HTTPException(status_code=404, detail="Media not found")
    
    file_path = result.get_next()[0]
    
    # Delete node and relationships
    delete_query = """
        MATCH (m:Media)
        WHERE m.id = $mid
        DETACH DELETE m
    """
    
    try:
        conn.execute(delete_query, parameters={"mid": media_id})
        
        # Delete actual file
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        
        return {"message": "Media deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{media_id}/link/person/{person_id}")
def link_media_to_person(media_id: int, person_id: int):
    """Link a media item to a person."""
    db, conn = get_db_connection()
    
    # Check if link already exists
    check_query = """
        MATCH (p:Person)-[r:HAS_MEDIA]->(m:Media)
        WHERE p.id = $pid AND m.id = $mid
        RETURN r
    """
    result = conn.execute(check_query, parameters={"pid": person_id, "mid": media_id})
    if result.has_next():
        return {"message": "Link already exists"}
    
    # Create link
    query = """
        MATCH (p:Person), (m:Media)
        WHERE p.id = $pid AND m.id = $mid
        CREATE (p)-[:HAS_MEDIA]->(m)
        RETURN p.id
    """
    
    try:
        result = conn.execute(query, parameters={"pid": person_id, "mid": media_id})
        if not result.has_next():
            raise HTTPException(status_code=404, detail="Person or Media not found")
        return {"message": "Media linked to person"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{media_id}/link/person/{person_id}")
def unlink_media_from_person(media_id: int, person_id: int):
    """Remove link between media and person."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (p:Person)-[r:HAS_MEDIA]->(m:Media)
        WHERE p.id = $pid AND m.id = $mid
        DELETE r
    """
    
    try:
        conn.execute(query, parameters={"pid": person_id, "mid": media_id})
        return {"message": "Link removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/person/{person_id}")
def get_person_media(person_id: int):
    """Get all media linked to a person."""
    db, conn = get_db_connection()
    
    query = """
        MATCH (p:Person)-[:HAS_MEDIA]->(m:Media)
        WHERE p.id = $pid
        RETURN m.id, m.filename, m.file_path, m.file_type, m.caption, m.upload_date
        ORDER BY m.upload_date DESC
    """
    
    result = conn.execute(query, parameters={"pid": person_id})
    
    media_list = []
    while result.has_next():
        row = result.get_next()
        media_list.append({
            "id": row[0],
            "filename": row[1],
            "file_path": row[2],
            "file_type": row[3],
            "caption": row[4],
            "upload_date": row[5]
        })
    
    return media_list
