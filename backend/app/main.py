from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine, SessionLocal
from . import models
from .routers import auth, profiles, admin

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    for name in ["creator", "agency", "marketing", "admin"]:
        if not db.query(models.Role).filter_by(name=name).first():
            db.add(models.Role(name=name))
    db.commit()

app = FastAPI(title="CreatorIQ API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(admin.router)