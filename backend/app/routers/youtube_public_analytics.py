
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.public_analytics import (
    public_youtube_content_analytics,
    public_youtube_audience,
    public_youtube_growth,
)

router = APIRouter(
    prefix="/analytics/youtube-public",
    tags=["YouTube Public Analytics"],
)


@router.get("/content")
def get_youtube_public_content(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return public_youtube_content_analytics(
        db=db,
        user=user,
        mode="live",
    )


@router.get("/audience")
def get_youtube_public_audience(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return public_youtube_audience(
        db=db,
        user=user,
        mode="live",
    )


@router.get("/growth")
def get_youtube_public_growth(
    days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return public_youtube_growth(
        db=db,
        user=user,
        days=days,
        mode="live",
    )
