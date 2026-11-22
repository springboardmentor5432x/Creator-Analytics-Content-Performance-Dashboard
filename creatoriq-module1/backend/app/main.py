from fastapi import FastAPI, Depends, HTTPException, status
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import models, schemas, analytics
from .database import Base, engine, get_db, SessionLocal
from .security import (hash_password, verify_password, create_access_token,
                       get_current_user, require_roles)

Base.metadata.create_all(bind=engine)  # creates tables (later: use Alembic migrations)

app = FastAPI(title="CreatorIQ API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[  # only needed if the frontend is opened from another port (e.g. VS Code Live Server)
        "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5173",
    ],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


app.include_router(analytics.router)


@app.on_event("startup")
def seed_roles():
    db = SessionLocal()
    for name in ["creator", "agency", "marketing_team", "admin"]:
        if not db.query(models.Role).filter_by(name=name).first():
            db.add(models.Role(name=name))
    db.commit()
    db.close()


@app.post("/auth/register", response_model=schemas.UserOut, status_code=201)
def register(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email.lower()).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    role = db.query(models.Role).filter_by(name=data.role.value).first()
    user = models.User(full_name=data.full_name, email=data.email.lower(),
                       hashed_password=hash_password(data.password), role_id=role.id)
    db.add(user)
    db.commit()
    db.refresh(user)
    # Auto-create an empty profile depending on role
    if role.name == "creator":
        db.add(models.CreatorProfile(user_id=user.id, display_name=user.full_name))
    elif role.name == "agency":
        db.add(models.AgencyProfile(user_id=user.id))
    db.commit()
    return schemas.UserOut(id=user.id, full_name=user.full_name, email=user.email, role=role.name)


# OAuth2 password flow: expects form fields "username" (= email) and "password"
@app.post("/auth/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username.lower()).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    return schemas.TokenOut(access_token=create_access_token(user),
                            role=user.role.name, full_name=user.full_name)


@app.get("/users/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return schemas.UserOut(id=user.id, full_name=user.full_name, email=user.email, role=user.role.name)


# Example of RBAC - only admin can call this
@app.get("/admin/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_roles("admin"))):
    return [schemas.UserOut(id=u.id, full_name=u.full_name, email=u.email, role=u.role.name)
            for u in db.query(models.User).all()]


# Serve the frontend (index.html, dashboard.html) from the same server -> http://localhost:8000
# IMPORTANT: keep this at the END so it does not override the API routes above.
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
