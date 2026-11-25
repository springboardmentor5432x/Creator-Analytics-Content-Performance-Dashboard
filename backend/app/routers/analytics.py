
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from ..database import get_db
from .. import models
from ..deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_user_accounts_query(db: Session, user_id: int, platform: str = None):
    query = db.query(models.SocialAccount).filter(
        models.SocialAccount.user_id == user_id
    )

    if platform and platform.lower() != "all platforms":
        query = query.filter(
            func.lower(models.SocialAccount.platform) == platform.lower()
        )

    return query


@router.get("/health")
def analytics_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "success",
            "message": "Analytics database connection is working",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Analytics database is unavailable",
        ) from exc


@router.get("/overview")
def analytics_overview(
    platform: str = Query(default="All Platforms"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    accounts_query = get_user_accounts_query(db, user.id, platform)

    account_ids = [
        row.id
        for row in accounts_query.with_entities(models.SocialAccount.id).all()
    ]

    if not account_ids:
        return {
            "user_id": user.id,
            "social_accounts": 0,
            "total_posts": 0,
            "total_views": 0,
            "total_likes": 0,
            "total_comments": 0,
            "total_shares": 0,
            "total_reach": 0,
            "total_subscribers": 0,
        }

    latest_post_metrics = (
        db.query(
            models.PostAnalytics.post_id.label("post_id"),
            func.max(models.PostAnalytics.recorded_at).label("latest_time"),
        )
        .join(
            models.Post,
            models.Post.id == models.PostAnalytics.post_id,
        )
        .filter(models.Post.social_account_id.in_(account_ids))
        .group_by(models.PostAnalytics.post_id)
        .subquery()
    )

    metrics = (
        db.query(
            func.coalesce(func.sum(models.PostAnalytics.views), 0),
            func.coalesce(func.sum(models.PostAnalytics.likes), 0),
            func.coalesce(func.sum(models.PostAnalytics.comments), 0),
            func.coalesce(func.sum(models.PostAnalytics.shares), 0),
            func.coalesce(func.sum(models.PostAnalytics.reach), 0),
        )
        .join(
            latest_post_metrics,
            (models.PostAnalytics.post_id == latest_post_metrics.c.post_id)
            & (
                models.PostAnalytics.recorded_at
                == latest_post_metrics.c.latest_time
            ),
        )
        .join(
            models.Post,
            models.Post.id == models.PostAnalytics.post_id,
        )
        .filter(models.Post.social_account_id.in_(account_ids))
        .first()
    )

    posts_count = (
        db.query(func.count(models.Post.id))
        .filter(models.Post.social_account_id.in_(account_ids))
        .scalar()
    )

    latest_audience = (
        db.query(
            models.AudienceAnalytics.social_account_id.label("account_id"),
            func.max(models.AudienceAnalytics.recorded_at).label("latest_time"),
        )
        .filter(
            models.AudienceAnalytics.social_account_id.in_(account_ids)
        )
        .group_by(models.AudienceAnalytics.social_account_id)
        .subquery()
    )

    subscribers = (
        db.query(
            func.coalesce(
                func.sum(models.AudienceAnalytics.subscriber_count), 0
            )
        )
        .join(
            latest_audience,
            (
                models.AudienceAnalytics.social_account_id
                == latest_audience.c.account_id
            )
            & (
                models.AudienceAnalytics.recorded_at
                == latest_audience.c.latest_time
            ),
        )
        .scalar()
    )

    return {
        "user_id": user.id,
        "social_accounts": len(account_ids),
        "total_posts": int(posts_count or 0),
        "total_views": int(metrics[0] or 0),
        "total_likes": int(metrics[1] or 0),
        "total_comments": int(metrics[2] or 0),
        "total_shares": int(metrics[3] or 0),
        "total_reach": int(metrics[4] or 0),
        "total_subscribers": int(subscribers or 0),
    }


@router.get("/accounts")
def list_social_accounts(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    accounts = (
        db.query(models.SocialAccount)
        .filter(models.SocialAccount.user_id == user.id)
        .order_by(models.SocialAccount.connected_at.desc())
        .all()
    )

    return [
        {
            "id": account.id,
            "platform": account.platform,
            "platform_account_id": account.platform_account_id,
            "account_name": account.account_name,
            "connected_at": account.connected_at,
            "updated_at": account.updated_at,
        }
        for account in accounts
    ]


@router.delete("/accounts/{account_id}")
def disconnect_social_account(
    account_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    account = (
        db.query(models.SocialAccount)
        .filter(
            models.SocialAccount.id == account_id,
            models.SocialAccount.user_id == user.id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found",
        )

    post_ids = (
        db.query(models.Post.id)
        .filter(models.Post.social_account_id == account.id)
        .subquery()
    )

    db.query(models.PostAnalytics).filter(
        models.PostAnalytics.post_id.in_(post_ids)
    ).delete(synchronize_session=False)

    db.query(models.Post).filter(
        models.Post.social_account_id == account.id
    ).delete(synchronize_session=False)

    db.query(models.AudienceAnalytics).filter(
        models.AudienceAnalytics.social_account_id == account.id
    ).delete(synchronize_session=False)

    db.delete(account)
    db.commit()

    return {
        "status": "success",
        "message": "Social account disconnected successfully",
        "account_id": account_id,
    }


@router.get("/posts")
def list_posts(
    platform: str = Query(default="All Platforms"),
    search: str = Query(default=""),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    accounts_query = get_user_accounts_query(db, user.id, platform)

    account_ids = [
        row.id
        for row in accounts_query.with_entities(models.SocialAccount.id).all()
    ]

    if not account_ids:
        return []

    latest_metrics = (
        db.query(
            models.PostAnalytics.post_id.label("post_id"),
            func.max(models.PostAnalytics.recorded_at).label("latest_time"),
        )
        .group_by(models.PostAnalytics.post_id)
        .subquery()
    )

    query = (
        db.query(
            models.Post,
            models.SocialAccount.platform,
            models.SocialAccount.account_name,
            models.PostAnalytics.views,
            models.PostAnalytics.likes,
            models.PostAnalytics.comments,
            models.PostAnalytics.shares,
            models.PostAnalytics.reach,
        )
        .join(
            models.SocialAccount,
            models.SocialAccount.id == models.Post.social_account_id,
        )
        .outerjoin(
            latest_metrics,
            latest_metrics.c.post_id == models.Post.id,
        )
        .outerjoin(
            models.PostAnalytics,
            (models.PostAnalytics.post_id == models.Post.id)
            & (
                models.PostAnalytics.recorded_at
                == latest_metrics.c.latest_time
            ),
        )
        .filter(models.Post.social_account_id.in_(account_ids))
    )

    if search.strip():
        query = query.filter(
            models.Post.title.ilike(f"%{search.strip()}%")
        )

    rows = (
        query.order_by(models.Post.published_at.desc().nullslast())
        .limit(limit)
        .all()
    )

    results = []

    for row in rows:
        post = row[0]
        views = int(row[3] or 0)
        likes = int(row[4] or 0)
        comments = int(row[5] or 0)
        shares = int(row[6] or 0)
        reach = int(row[7] or 0)

        engagement_rate = (
            ((likes + comments + shares) / reach) * 100
            if reach > 0
            else 0
        )

        results.append(
            {
                "id": post.id,
                "title": post.title or "Untitled post",
                "platform": row[1],
                "account_name": row[2],
                "platform_post_id": post.platform_post_id,
                "published_at": post.published_at,
                "views": views,
                "likes": likes,
                "comments": comments,
                "shares": shares,
                "reach": reach,
                "engagement_rate": round(engagement_rate, 2),
            }
        )

    return results
