from sqlalchemy.orm import Session
from database import engine
from models import Role, User

with Session(engine) as db:
    print("Administrator role exists:",
          db.query(Role).filter_by(name="Administrator").first() is not None)

    admins = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.name == "Administrator")
        .all()
    )

    print("Administrator account count:", len(admins))
    for admin in admins:
        print("Email:", admin.email, "| Active:", admin.is_active)
