from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..services import load_demo, clear_demo, log

router = APIRouter(prefix="/api/demo", tags=["Demo Data"])


@router.post("/load")
def load(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate sample data for the signed-in user. All rows are flagged is_demo=True and shown as DEMO DATA."""
    load_demo(db, user.id)
    log(db, user.id, "demo", "Loaded DEMO DATA")
    db.commit()
    return {"message": "DEMO DATA loaded. It is sample data, not real platform data."}


@router.delete("")
def clear(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    clear_demo(db, user.id)
    log(db, user.id, "demo", "Removed DEMO DATA")
    db.commit()
    return {"message": "DEMO DATA removed."}
