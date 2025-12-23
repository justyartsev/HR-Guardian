from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(DATABASE_URL)

# При каждом подключении явно устанавливаем UTF-8
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    with dbapi_conn.cursor() as cur:
        cur.execute("SET client_encoding TO 'utf8'")
    dbapi_conn.commit()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
