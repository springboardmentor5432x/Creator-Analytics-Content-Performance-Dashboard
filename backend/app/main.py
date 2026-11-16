import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException
from .config import settings
from .database import Base, engine, init_db
from .routers import (auth, content, audience, dashboard, connections, demo,
                      agency, marketing, admin, revenue, trends, notifications,
                      brands, sponsorships, campaign_creators, campaign_roi, reports,
                      websocket)

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("creatoriq")

# Auto-initialize database schema ONLY when configured and using SQLite (local development).
# In PostgreSQL staging and production environments, migrations are managed exclusively
# via Alembic CLI/jobs before worker startup to eliminate concurrent DDL lock contention.
if settings.AUTO_INIT_DB and settings.DATABASE_URL.startswith("sqlite"):
    init_db(engine)

app = FastAPI(
    title="CreatorIQ API",
    version="1.0.0",
    description="Creator analytics & content performance API. Engagement Rate (%) = (likes + comments + shares + saves) / reach × 100 (0 when reach is 0). "
                "Use **Authorize** with your e-mail as username to call protected endpoints. All sample data is flagged DEMO DATA.",
)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


# Every error has the same shape: {"success": false, "message": str, "errors": [...]}
@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, headers=getattr(exc, "headers", None),
                        content={"success": False, "message": str(exc.detail), "errors": []})


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]),
               "message": e["msg"].replace("Value error, ", "")} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"success": False, "message": errors[0]["message"] if errors else "Invalid input", "errors": errors})


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"success": False, "message": "Something went wrong on our side.", "errors": []})


for r in (auth, content, audience, dashboard, connections, demo, agency, marketing,
          admin, revenue, trends, notifications, brands, sponsorships, campaign_creators, campaign_roi, reports,
          websocket):
    app.include_router(r.router)


@app.get("/api/health", tags=["Health"])
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": engine.dialect.name}
    except Exception as exc:
        logger.error(f"Healthcheck database ping failed: {exc}")
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": engine.dialect.name, "error": str(exc)},
        )
