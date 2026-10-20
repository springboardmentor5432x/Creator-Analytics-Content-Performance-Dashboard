import os
import tempfile

# Must be set before the app is imported.
_db = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db}"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["SEED_DEMO_USERS"] = "false"
os.environ["BCRYPT_ROUNDS"] = "4"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import DEMO_PASSWORD, seed_demo_users  # noqa: E402


@pytest.fixture()
def client():
    """Fresh database with the 4 demo users before every test."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_demo_users(db)
    with TestClient(app) as c:
        yield c


def login(client, email, password=DEMO_PASSWORD):
    return client.post("/api/auth/login", data={"username": email, "password": password})


def auth(client, email, password=DEMO_PASSWORD):
    r = login(client, email, password)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def register(client, **over):
    body = {"name": "Test User", "email": "new@example.com", "password": "Pass1234", "role": "creator"}
    body.update(over)
    return client.post("/api/auth/register", json=body)


@pytest.fixture()
def h(client):
    """Auth headers for each demo role."""
    return {
        "creator": auth(client, "creator@creatoriq.com"),
        "agency": auth(client, "agency@creatoriq.com"),
        "marketing": auth(client, "marketing@creatoriq.com"),
        "admin": auth(client, "admin@creatoriq.com"),
    }
