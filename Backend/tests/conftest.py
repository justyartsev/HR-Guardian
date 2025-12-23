import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import get_db
from database import Base 

DATABASE_URL = os.getenv("DATABASE_URL_TEST")

engine = create_engine(
    DATABASE_URL,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def create_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    
@pytest.fixture(scope="session")
def db():
    connection = engine.connect()
    transaction = connection.begin()

    session = TestingSessionLocal(bind=connection)
    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
