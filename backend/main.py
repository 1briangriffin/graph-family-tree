
from fastapi import FastAPI
from contextlib import asynccontextmanager
from schema import create_schema
from routers import auth, people, relationships, events, places, media

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Init DB schema
    print("Initializing Database Schema...")
    create_schema()
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, tags=["auth"])
app.include_router(people.router, prefix="/people", tags=["people"])
app.include_router(relationships.router, prefix="/relationships", tags=["relationships"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(places.router, prefix="/places", tags=["places"])
app.include_router(media.router, prefix="/media", tags=["media"])

@app.get("/")
def read_root():
    return {"message": "Graph Family Tree Backend is running"}

