"""Create demo accounts + DEMO DATA:  python -m app.seed"""
from .database import Base, engine, SessionLocal, init_db
from .models import User
from .security import hash_password
from .services import load_demo
from .config import settings

ACCOUNTS = [("admin@creatoriq.demo", "Ava Admin", "admin"), ("creator@creatoriq.demo", "Casey Creator", "creator"),
            ("agency@creatoriq.demo", "Alex Agency", "agency"), ("marketing@creatoriq.demo", "Maya Marketing", "marketing")]

if __name__ == "__main__":
    init_db(engine)
    db = SessionLocal()
    for email, name, role in ACCOUNTS:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(email=email, full_name=name, role=role, hashed_password=hash_password(settings.DEMO_PASSWORD))
            db.add(u)
            db.flush()
        load_demo(db, u.id)
    db.commit()
    print("Seeded demo accounts (password = DEMO_PASSWORD from .env):")
    for email, _, role in ACCOUNTS:
        print(f"  {role:10s} {email}")
