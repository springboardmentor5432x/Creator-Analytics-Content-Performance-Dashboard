"""Demo users so every role can be tried without manual setup (development only)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Agency, AgencyCreator, Creator, User
from .roles import ADMIN, AGENCY, CREATOR, MARKETING_TEAM
from .security import hash_password

DEMO_PASSWORD = "Demo@1234"
DEMO_USERS = [
    ("Demo Creator", "creator@creatoriq.com", CREATOR),
    ("Demo Agency", "agency@creatoriq.com", AGENCY),
    ("Demo Marketing", "marketing@creatoriq.com", MARKETING_TEAM),
    ("Demo Admin", "admin@creatoriq.com", ADMIN),
]


def seed_demo_users(db: Session) -> None:
    for name, email, role in DEMO_USERS:
        if db.scalar(select(User).where(User.email == email)):
            continue
        user = User(name=name, email=email, password_hash=hash_password(DEMO_PASSWORD), role=role)
        if role == CREATOR:
            user.creator = Creator(creator_name=name, location="India")
        elif role == AGENCY:
            user.agency = Agency(agency_name="Demo Agency Co.", location="India")
        db.add(user)
    db.commit()

    # link the demo agency to the demo creator so agency access rules can be tried
    agency = db.scalar(select(Agency).join(User).where(User.email == "agency@creatoriq.com"))
    creator = db.scalar(select(Creator).join(User).where(User.email == "creator@creatoriq.com"))
    if agency and creator and not db.get(AgencyCreator, (agency.agency_id, creator.creator_id)):
        db.add(AgencyCreator(agency_id=agency.agency_id, creator_id=creator.creator_id))
        db.commit()
