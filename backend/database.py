
import kuzu
import os
from contextlib import contextmanager

DB_PATH = "kuzu_db"

def get_db_connection():
    # Kuzu runs in-process. 
    # Helper to get a database instance and connection.
    try:
        db = kuzu.Database(DB_PATH)
        conn = kuzu.Connection(db)
        return db, conn
    except Exception as e:
        # If directory missing, it might be first run
        if not os.path.exists(DB_PATH):
           os.makedirs(DB_PATH)
        db = kuzu.Database(DB_PATH)
        conn = kuzu.Connection(db)
        return db, conn
