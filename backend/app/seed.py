from app.database import SessionLocal
from app.models.role import Role


roles = [
    {
        "name": "creator",
        "description": "Content creator user"
    },
    {
        "name": "agency",
        "description": "Creator or influencer agency"
    },
    {
        "name": "marketing_team",
        "description": "Marketing team user"
    },
    {
        "name": "administrator",
        "description": "System administrator"
    }
]


def seed_roles():

    db = SessionLocal()

    try:

        for role_data in roles:

            existing = db.query(Role).filter(
                Role.name == role_data["name"]
            ).first()

            if existing is None:

                db.add(
                    Role(**role_data)
                )

        db.commit()

        print("Roles seeded successfully.")

    finally:

        db.close()


if __name__ == "__main__":

    seed_roles()