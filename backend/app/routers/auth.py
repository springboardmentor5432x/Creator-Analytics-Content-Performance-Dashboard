from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..security import hash_password, verify_password, create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

# All four roles are available in the registration form.
# IMPORTANT: For production, Admin registration should be invitation/approval-only.
PUBLIC_ROLES = {"creator", "agency", "marketing", "admin"}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    role_name = data.role.strip().lower()

    if role_name not in PUBLIC_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Choose creator, agency, marketing, or admin.",
        )

    existing_user = db.query(models.User).filter(
        models.User.email == email
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    role = db.query(models.Role).filter(
        models.Role.name == role_name
    ).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role '{role_name}' is missing. Make sure all four roles are seeded in the database.",
        )

    user = models.User(
        email=email,
        full_name=data.full_name.strip(),
        password_hash=hash_password(data.password),
        role_id=role.id,
    )

    try:
        db.add(user)
        db.flush()

        if role_name == "creator":
            db.add(models.CreatorProfile(user_id=user.id))
        elif role_name == "agency":
            db.add(models.AgencyProfile(user_id=user.id))

        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    # Deliberately do not create a token here. The user must sign in separately.
    return {
        "message": "Registered successfully. Please sign in.",
        "user_id": user.id,
        "role": role_name,
    }


@router.post("/login", response_model=schemas.TokenOut)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form.username.strip().lower()
    user = db.query(models.User).filter(
        models.User.email == email
    ).first()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive. Please contact support.",
        )

    return {
        "access_token": create_access_token(user.id, user.role.name),
        "token_type": "bearer",
        "role": user.role.name,
    }


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.name,
    }


@router.put("/change-password")
def change_password(
    data: schemas.PasswordChangeIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is wrong",
        )

    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated"}
