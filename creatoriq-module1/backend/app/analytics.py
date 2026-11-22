from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from . import models
from .analytics_service import (PLATFORMS, generate_demo_data, build_dashboard,
                                generate_agency_demo, build_agency_dashboard,
                                generate_marketing_demo, build_marketing_dashboard,
                                build_admin_overview)
from .database import get_db
from .security import get_current_user, require_roles

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _has_data(db: Session, user_id: int) -> bool:
    return db.query(models.DailyMetric.id).filter_by(user_id=user_id).first() is not None


@router.get("/dashboard")
def dashboard(days: int = Query(30), platform: str = Query("all"),
              db: Session = Depends(get_db), user: models.User = Depends(require_roles("creator"))):
    if days not in (7, 30, 90):
        raise HTTPException(400, "days must be 7, 30 or 90")
    if platform != "all" and platform not in PLATFORMS:
        raise HTTPException(400, "Unknown platform")

    uid = user.id
    data = build_dashboard(
        metrics=db.query(models.DailyMetric).filter_by(user_id=uid).all(),
        posts=db.query(models.Post).filter_by(user_id=uid).all(),
        audience=db.query(models.AudienceStat).filter_by(user_id=uid).all(),
        revenue=db.query(models.RevenueEntry).filter_by(user_id=uid).all(),
        accounts=db.query(models.SocialAccount).filter_by(user_id=uid).all(),
        days=days, platform=platform,
    )
    data["can_load_demo"] = user.role.name == "creator"
    data["platforms"] = PLATFORMS
    return data


# Only creators can load demo data, and only into their OWN account
@router.post("/demo-data", status_code=201)
def load_demo_data(db: Session = Depends(get_db), user: models.User = Depends(require_roles("creator"))):
    if _has_data(db, user.id):
        raise HTTPException(409, "Demo data is already loaded")
    demo = generate_demo_data(user.id, user.full_name)
    db.add_all([models.SocialAccount(user_id=user.id, **a) for a in demo["accounts"]])
    db.add_all([models.DailyMetric(user_id=user.id, **m) for m in demo["metrics"]])
    db.add_all([models.Post(user_id=user.id, **p) for p in demo["posts"]])
    db.add_all([models.AudienceStat(user_id=user.id, **a) for a in demo["audience"]])
    db.add_all([models.RevenueEntry(user_id=user.id, **r) for r in demo["revenue"]])
    db.commit()
    return {"status": "loaded"}


@router.delete("/demo-data")
def clear_demo_data(db: Session = Depends(get_db), user: models.User = Depends(require_roles("creator"))):
    for model in (models.SocialAccount, models.DailyMetric, models.Post, models.AudienceStat, models.RevenueEntry):
        db.query(model).filter_by(user_id=user.id).delete()
    db.commit()
    return {"status": "cleared"}


# ======================= AGENCY (agency role only) =======================
@router.get("/agency")
def agency_dashboard(db: Session = Depends(get_db), user: models.User = Depends(require_roles("agency"))):
    rows = db.query(models.ManagedCreator).filter_by(user_id=user.id).all()
    data = build_agency_dashboard(rows)
    data["can_load_demo"] = True
    return data


@router.post("/agency/demo-data", status_code=201)
def load_agency_demo(db: Session = Depends(get_db), user: models.User = Depends(require_roles("agency"))):
    if db.query(models.ManagedCreator.id).filter_by(user_id=user.id).first():
        raise HTTPException(409, "Demo data is already loaded")
    db.add_all([models.ManagedCreator(user_id=user.id, **c) for c in generate_agency_demo(user.id)])
    db.commit()
    return {"status": "loaded"}


@router.delete("/agency/demo-data")
def clear_agency_demo(db: Session = Depends(get_db), user: models.User = Depends(require_roles("agency"))):
    db.query(models.ManagedCreator).filter_by(user_id=user.id).delete()
    db.commit()
    return {"status": "cleared"}


# ================= MARKETING TEAM (marketing_team role only) =================
@router.get("/marketing")
def marketing_dashboard(db: Session = Depends(get_db), user: models.User = Depends(require_roles("marketing_team"))):
    rows = db.query(models.Campaign).filter_by(user_id=user.id).all()
    data = build_marketing_dashboard(rows)
    data["can_load_demo"] = True
    return data


@router.post("/marketing/demo-data", status_code=201)
def load_marketing_demo(db: Session = Depends(get_db), user: models.User = Depends(require_roles("marketing_team"))):
    if db.query(models.Campaign.id).filter_by(user_id=user.id).first():
        raise HTTPException(409, "Demo data is already loaded")
    db.add_all([models.Campaign(user_id=user.id, **c) for c in generate_marketing_demo(user.id)])
    db.commit()
    return {"status": "loaded"}


@router.delete("/marketing/demo-data")
def clear_marketing_demo(db: Session = Depends(get_db), user: models.User = Depends(require_roles("marketing_team"))):
    db.query(models.Campaign).filter_by(user_id=user.id).delete()
    db.commit()
    return {"status": "cleared"}


# ======================= ADMIN (admin role only, REAL data) =======================
@router.get("/admin")
def admin_overview(db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin"))):
    users = db.query(models.User).all()
    with_data = db.query(models.DailyMetric.user_id).distinct().count()

    # followers of each creator on their latest day, summed over platforms
    latest = (db.query(models.DailyMetric.user_id.label("uid"), func.max(models.DailyMetric.date).label("d"))
              .group_by(models.DailyMetric.user_id).subquery())
    total = func.sum(models.DailyMetric.followers)
    rows = (db.query(models.DailyMetric.user_id, total)
            .join(latest, and_(models.DailyMetric.user_id == latest.c.uid, models.DailyMetric.date == latest.c.d))
            .group_by(models.DailyMetric.user_id).order_by(total.desc()).limit(5).all())
    names = {u.id: u for u in users}
    top = [{"name": names[uid].full_name, "email": names[uid].email, "followers": int(f)}
           for uid, f in rows if uid in names]
    return build_admin_overview(users, creators_with_data=with_data, top_creators=top)