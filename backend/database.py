
import kuzu
import os

DB_PATH = "kuzu_db"

# Singleton instance
_db_instance = None

def get_db_instance():
    global _db_instance
    if _db_instance is None:
        # Kuzu will create the database directory structure automatically
        _db_instance = kuzu.Database(DB_PATH)
    return _db_instance

def get_db_connection():
    # Reuse the same Database instance
    db = get_db_instance()
    # Connections are cheap and thread-safe? Kuzu docs say:
    # "Connection is not thread-safe. You should create a separate connection for each thread."
    # So creating a new connection per request is correct, but from the SAME database instance.
    conn = kuzu.Connection(db)
    return db, conn
