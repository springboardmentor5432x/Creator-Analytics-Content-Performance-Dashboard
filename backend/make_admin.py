from app import SessionLocal, User, select

db = SessionLocal()

try:
    email = input("Enter the registered email address: ").strip().lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user:
        print("User not found. Register an account first.")
    else:
        user.role = "admin"
        user.is_active = True
        user.email_verified = True

        db.commit()

        print("\nAdmin account successfully created!")
        print("Name:", user.name)
        print("Email:", user.email)
        print("Role:", user.role)

finally:
    db.close()
