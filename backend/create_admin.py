
from getpass import getpass

from app.database import SessionLocal
from app.auth.security import hash_password
from app.models.role import Role
from app.models.user import User


def create_admin():
    db = SessionLocal()

    try:
        name = input("Administrator name: ").strip()
        email = input("Administrator email: ").strip().lower()

        if not name or not email:
            print("Name and email are required.")
            return

        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            print("This email is already registered.")
            print("Existing role:", existing_user.role.name)
            print("No account was changed.")
            return

        password = getpass("Create administrator password: ")
        confirm_password = getpass("Confirm password: ")

        if len(password) < 8 or len(password) > 72:
            print("Password must contain 8 to 72 characters.")
            return

        if password != confirm_password:
            print("Passwords do not match.")
            return

        role = (
            db.query(Role)
            .filter(Role.name == "administrator")
            .first()
        )

        if role is None:
            print("Administrator role is missing. Run python -m app.seed first.")
            return

        admin = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role_id=role.id,
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print("Administrator account created successfully.")
        print("Email:", email)
        print("Role: administrator")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
