from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.security import hash_password
from app.seed_demo import seed_demo_data


@pytest.fixture(scope="session")
def test_engine():
    # One isolated in-memory database for this test session.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    with TestingSessionLocal() as db:
        seed_demo_data(db)
        if not db.query(User).filter(User.email == "inactive@creatoriq.dev").first():
            db.add(User(
                email="inactive@creatoriq.dev",
                full_name="Inactive User",
                hashed_password=hash_password("Inactive@123"),
                role="creator",
                is_active=False,
            ))
            db.commit()
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client(test_engine):
    TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Do not enter TestClient as a context manager: the test DB fixture owns schema setup.
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def login(client: TestClient, email: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture()
def creator_token(client: TestClient) -> str:
    return login(client, "demo@creatoriq.dev", "CreatorIQ@123")


@pytest.fixture()
def admin_token(client: TestClient) -> str:
    return login(client, "admin@creatoriq.dev", "CreatorIQAdmin@123")
