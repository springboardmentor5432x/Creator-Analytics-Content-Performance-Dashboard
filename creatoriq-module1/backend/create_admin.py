"""Run once:  python create_admin.py
Creates an Administrator account (admins cannot self-register on the website)."""
from app.database import Base, engine, SessionLocal
from app import models
from app.security import hash_password

EMAIL = "adminmain1@gmail.com"
PASSWORD = "Adminmain1"      # change this!

Base.metadata.create_all(bind=engine)
db = SessionLocal()
for name in ["creator", "agency", "marketing_team", "admin"]:
    if not db.query(models.Role).filter_by(name=name).first():
        db.add(models.Role(name=name))
db.commit()

if db.query(models.User).filter_by(email=EMAIL).first():
    print("Admin already exists:", EMAIL)
else:
    role = db.query(models.Role).filter_by(name="admin").first()
    db.add(models.User(full_name="Administrator", email=EMAIL,
                       hashed_password=hash_password(PASSWORD), role_id=role.id))
    db.commit()
    print("Admin created ->", EMAIL, "/", PASSWORD)
db.close()
