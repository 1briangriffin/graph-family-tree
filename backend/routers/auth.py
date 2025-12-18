
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from database import get_db_connection
from auth import verify_password, create_access_token, get_password_hash
from models import Token, UserCreate

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db, conn = get_db_connection()
    # Query user from Kuzu
    # Note: Strings in Kuzu Cypher must be quoted
    query = f"MATCH (u:User) WHERE u.username = '{form_data.username}' RETURN u.username, u.password_hash, u.role"
    result = conn.execute(query)
    
    user_row = None
    if result.has_next():
        user_row = result.get_next()
        
    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Kuzu returns values in order of RETURN clause
    username = user_row[0]
    password_hash = user_row[1]
    role = user_row[2] # "admin", "editor", "viewer"

    if not verify_password(form_data.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": username, "role": role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    db, conn = get_db_connection()
    
    # Check if exists
    check_query = f"MATCH (u:User) WHERE u.username = '{user.username}' RETURN u"
    if conn.execute(check_query).has_next():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pwd = get_password_hash(user.password)
    
    # Insert new user
    # Cypher injection risk: In prod, use parameters. Kuzu python API supports params in execute().
    # For MVP we will use f-strings carefully or switch to params if Kuzu version allows.
    # Current Kuzu Python: conn.execute(query, parameters={"a": 1})
    
    insert_query = "CREATE (u:User {username: $username, password_hash: $pwd, role: $role}) RETURN u"
    params = {
        "username": user.username,
        "pwd": hashed_pwd,
        "role": user.role
    }
    conn.execute(insert_query, parameters=params)
    
    return {"message": "User created successfully"}
