
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

class PersonCreate(PersonBase):
    pass

class PersonResponse(PersonBase):
    id: int # Serial ID from Kuzu

class EventBase(BaseModel):
    type: str # 'BIRTH', 'MARRIAGE', 'DEATH', etc
    event_date: Optional[str] = None   # Changed to str
    description: Optional[str] = None
    location: Optional[str] = None

class EventCreate(EventBase):
    pass
