from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.models import User
from app.profile_utils import ensure_role_profile, get_profile_values
from app.schemas import AdminUserCreateRequest, RoleUpdateRequest, UserResponse
from app.security import hash_password

router = APIRouter(prefix="/admin", tags=["Administrator"])


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreateRequest,
    _admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """Create an account with an explicitly assigned role; administrator-only."""
    email = str(payload.email).lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    ensure_role_profile(
        db,
        user,
        payload.profile_name.strip() or payload.full_name.strip(),
        payload.focus_area.strip(),
    )
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserResponse])
def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    _admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """List basic account metadata. Password hashes are never returned."""
    return db.query(User).order_by(User.id.asc()).limit(limit).all()


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    payload: RoleUpdateRequest,
    admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """Change a user's role; only an administrator may call this route."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == admin.id and payload.role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot remove your own administrator role.",
        )
    # Migrate legacy account-profile fields first, then carry them over to the
    # newly selected role without deleting any existing analytics data.
    ensure_role_profile(db, user)
    previous_profile = get_profile_values(db, user)
    user.role = payload.role
    ensure_role_profile(
        db,
        user,
        previous_profile.get("profile_name") or user.full_name,
        previous_profile.get("focus_area") or "General",
        previous_profile.get("bio"),
    )
    db.commit()
    db.refresh(user)
    return user
