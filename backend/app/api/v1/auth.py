from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User, UserRole, CreatorProfile, AgencyProfile, UserSettings
from app.schemas.auth import UserRegister, UserLogin, Token
from app.schemas.user import UserRead
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.rbac import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user and return JWT access token."""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize default settings
    user_settings = UserSettings(user_id=user.id)
    db.add(user_settings)

    # If role is Creator or Agency, initialize profile
    if user.role == UserRole.CREATOR:
        creator_prof = CreatorProfile(user_id=user.id, handle=f"@{user.full_name.lower().replace(' ', '')}")
        db.add(creator_prof)
    elif user.role == UserRole.AGENCY:
        agency_prof = AgencyProfile(user_id=user.id, agency_name=f"{user.full_name}'s Agency")
        db.add(agency_prof)

    db.commit()

    # Generate JWT token
    access_token = create_access_token(subject=user.id, role=user.role.value)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value
    }

@router.post("/login", response_model=Token)
def login_user(user_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user credentials and issue JWT token."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled.")

    access_token = create_access_token(subject=user.id, role=user.role.value)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value
    }

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """Get authenticated user details, role, and active profile."""
    return current_user
