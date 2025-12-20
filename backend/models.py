
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

# --- Auth Models ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    username: str
    role: str = "viewer"

class UserCreate(User):
    password: str

class UserInDB(User):
    password_hash: str

# --- Domain Models ---

class PersonBase(BaseModel):
    name: str
    gender: Optional[str] = None
    birth_date: Optional[str] = None   # Changed to str
    birth_place: Optional[str] = None
    death_date: Optional[str] = None   # Changed to str
    death_place: Optional[str] = None
    bio: Optional[str] = None
    maiden_name: Optional[str] = None

class PersonCreate(PersonBase):
    pass

class PersonResponse(PersonBase):
    id: int # Serial ID from Kuzu

class EventBase(BaseModel):
    type: str # 'BIRTH', 'MARRIAGE', 'GRADUATION', 'MILITARY_SERVICE', 'AWARD', 'OTHER'
    event_date: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None

class EventCreate(EventBase):
    participant_ids: Optional[List[int]] = None  # People to link on creation

class EventResponse(EventBase):
    id: int

class ParticipantLink(BaseModel):
    person_id: int
    role: Optional[str] = None  # e.g., 'bride', 'groom', 'graduate', etc.

# --- Place Models ---

class PlaceBase(BaseModel):
    name: str
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None

class PlaceCreate(PlaceBase):
    pass

class PlaceResponse(PlaceBase):
    id: int

class ResidenceLink(BaseModel):
    person_id: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    residence_type: Optional[str] = None  # 'primary', 'vacation', 'work', etc.

# --- Media Models ---

class MediaBase(BaseModel):
    filename: str
    file_type: Optional[str] = None
    caption: Optional[str] = None

class MediaResponse(MediaBase):
    id: int
    file_path: str
    upload_date: Optional[str] = None

