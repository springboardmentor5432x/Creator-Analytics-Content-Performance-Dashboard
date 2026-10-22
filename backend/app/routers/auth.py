from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..security import hash_password, verify_password, create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])
PUBLIC_ROLES = {"creator", "agency", "marketing"}

@router.post("/register", status_code=201)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    if data.role not in PUBLIC_ROLES:
        raise HTTPException(400, "Invalid role")
    if db.query(models.User).filter_by(email=data.email).first():
        raise HTTPException(409, "Email already registered")
    role = db.query(models.Role).filter_by(name=data.role).first()
    user = models.User(email=data.email, full_name=data.full_name,
                       password_hash=hash_password(data.password), role_id=role.id)
    db.add(user)
    db.flush()
    if data.role == "creator":
        db.add(models.CreatorProfile(user_id=user.id))
    elif data.role == "agency":
        db.add(models.AgencyProfile(user_id=user.id))
    db.commit()
    return {"message": "Registered successfully", "user_id": user.id}

@router.post("/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token": create_access_token(user.id, user.role.name),
            "token_type": "bearer", "role": user.role.name}

@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role.name}

@router.put("/change-password")
def change_password(data: schemas.PasswordChangeIn, user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(400, "Old password is wrong")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated"}