
import kuzu
import os

DB_PATH = "kuzu_db"

# Singleton instance
_db_instance = None

def get_db_instance():
    global _db_instance
    if _db_instance is None:
        if not os.path.exists(DB_PATH):
            os.makedirs(DB_PATH)
        # 1GB buffer pool size default is usually fine, can increase if needed
        # _db_instance = kuzu.Database(DB_PATH, buffer_pool_size=1024**3)
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
