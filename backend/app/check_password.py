from app.database import SessionLocal
from app.models import User
from app.security import verify_password

db = SessionLocal()

try:
    email = input("Enter registered email: ").strip().lower()
    password = input("Enter registered password: ")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        print("USER NOT FOUND")
    else:
        print("USER FOUND")
        print("PASSWORD MATCH:", verify_password(password, user.password_hash))
finally:
    db.close()