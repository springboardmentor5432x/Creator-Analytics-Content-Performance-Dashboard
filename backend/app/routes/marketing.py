from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/marketing", tags=["Marketing Dashboard"])


@router.get("/dashboard")
def get_marketing_dashboard(current_user: User = Depends(get_current_user)):
    """Sample figures for the Module 1 UI milestone, not live analytics."""
    role_name = getattr(getattr(current_user, "role", None), "name", None)
    if role_name != "marketing_team":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Marketing Team role required")
    return {"message": "Marketing dashboard data loaded", "role": role_name, "data_mode": "sample", "stats": {"total_campaigns": 8, "active_campaigns": 2, "total_reach": "12.4M", "reach_growth": "25.3%", "total_engagement": "986K", "engagement_growth": "18.7%", "total_spend": "₹4,20,000", "roi": "3.2x", "roi_growth": "12.5%"}}
