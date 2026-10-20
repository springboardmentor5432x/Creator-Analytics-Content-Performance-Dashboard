from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Role, User
from schemas import RegisterRequest, LoginRequest, TokenResponse
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


# Initialize database tables and default roles
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        default_roles = [
            "Creator",
            "Agency",
            "Marketing Team",
            "Administrator",
        ]

        for name in default_roles:
            existing_role = db.query(Role).filter_by(
                name=name
            ).first()

            if not existing_role:
                db.add(Role(name=name))

        db.commit()

    yield


# Create FastAPI application
app = FastAPI(
    title="CreatorIQ Authentication API",
    description="CreatorIQ User Management and Analytics API",
    version="1.1.0",
    lifespan=lifespan,
)


# CORS: allow the React/Vite frontend, including port 5181
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{port}"
        for port in range(5173, 5184)
    ] + [
        f"http://127.0.0.1:{port}"
        for port in range(5173, 5184)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


bearer = HTTPBearer()


# Validate access token and return active user
def get_current_user(
    credentials: HTTPAuthorizationCredentials,
    db: Session,
):
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.get(User, user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


# Require Administrator role
def require_admin(user: User, db: Session):
    role = db.get(Role, user.role_id)

    if not role or role.name != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )

    return role


# Root endpoint
@app.get("/")
def home():
    return {
        "message": "CreatorIQ API is running",
        "status": "running",
    }


# Health-check endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "application": "CreatorIQ",
    }


# Register a new user
@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    existing_user = db.query(User).filter_by(
        email=email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    role = db.query(Role).filter_by(name=data.role).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
        )

    # Public registration cannot grant Administrator access.
    if role.name == "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Administrator accounts cannot be created "
                "through public registration"
            ),
        )

    user = User(
        name=data.name,
        email=email,
        password_hash=hash_password(data.password),
        role_id=role.id,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful",
        "user_id": user.id,
        "email": user.email,
        "role": role.name,
    }


# Log in an existing user
@app.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    user = db.query(User).filter_by(email=email).first()

    if not user or not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    role = db.get(Role, user.role_id)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User role not found",
        )

    token = create_access_token(user.id, role.name)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# Get the authenticated user's profile
@app.get("/profile")
def profile(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)
    role = db.get(Role, user.role_id)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User role not found",
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": role.name,
    }


# List registered users (Administrators only)
@app.get("/users", tags=["User Management"])
def list_users(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)
    require_admin(user, db)

    users = db.query(User).order_by(User.id.asc()).all()
    results = []

    for item in users:
        role = db.get(Role, item.role_id)

        results.append({
            "id": item.id,
            "name": item.name,
            "email": item.email,
            "role": role.name if role else "Unknown",
            "is_active": item.is_active,
            "created_at": (
                item.created_at.isoformat()
                if item.created_at
                else None
            ),
        })

    return {
        "total": len(results),
        "users": results,
    }


# Database-backed analytics overview (Administrators only)
@app.get("/analytics/overview", tags=["Analytics"])
def analytics_overview(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)
    require_admin(user, db)

    total_users = db.query(User).count()

    active_users = db.query(User).filter(
        User.is_active.is_(True)
    ).count()

    role_counts = {}

    for role in db.query(Role).order_by(Role.name).all():
        role_counts[role.name] = (
            db.query(User)
            .filter(User.role_id == role.id)
            .count()
        )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "users_by_role": role_counts,
    }
