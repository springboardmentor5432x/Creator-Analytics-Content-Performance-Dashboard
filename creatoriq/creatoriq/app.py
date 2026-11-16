"""
CreatorIQ — Creator Analytics & Content Performance Dashboard (lite edition)

Run:   pip install -r requirements.txt
       python app.py
Open:  http://127.0.0.1:8000        (API docs: http://127.0.0.1:8000/docs)

Demo logins (created automatically on first run):
  creator  demo@creatoriq.com    / demo123
  agency   agency@creatoriq.com  / demo123
  admin    admin@creatoriq.com   / admin123
"""
import asyncio, json, webbrowser
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import FRONTEND_DIR
from backend.database import init_db, db, q1
from backend.routes import auth, dashboard, content, audience, growth, revenue, integrations, notifications, reports
from backend.security import hash_password
from backend.services import connectors, scheduler


def seed_demo_users():
    """Create demo accounts + simulated platform data on first run."""
    demo = [("Demo Creator", "demo@creatoriq.com", "demo123", "creator", "Tech & productivity creator", "Tech"),
            ("Aarav Vlogs", "aarav@creatoriq.com", "demo123", "creator", "Travel and lifestyle", "Lifestyle"),
            ("Pixel Agency", "agency@creatoriq.com", "demo123", "agency", "", ""),
            ("Growth Team", "marketing@creatoriq.com", "demo123", "marketing", "", ""),
            ("Site Admin", "admin@creatoriq.com", "admin123", "admin", "", "")]
    with db() as c:
        for name, email, pw, role, bio, niche in demo:
            if q1(c, "SELECT id FROM users WHERE email=?", (email,)):
                continue
            cur = c.execute("INSERT INTO users(name,email,password_hash,role,bio,niche,settings) VALUES(?,?,?,?,?,?,?)",
                            (name, email, hash_password(pw), role, bio, niche, json.dumps({"weekly_report": True, "email_alerts": True, "revenue_alerts": True})))
            if role == "creator":
                plats = ["YouTube", "Instagram", "TikTok", "X"] if email.startswith("demo") else ["Instagram", "YouTube"]
                for p in plats:
                    a = c.execute("INSERT INTO accounts(user_id,platform,handle) VALUES(?,?,?)", (cur.lastrowid, p, "@" + name.lower().replace(" ", "")))
                    connectors.sync_account(c, q1(c, "SELECT * FROM accounts WHERE id=?", (a.lastrowid,)))
                connectors.notify(c, cur.lastrowid, "info", "Your analytics workspace is ready", "Demo data has been imported from the simulated platform APIs.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await asyncio.get_running_loop().run_in_executor(None, seed_demo_users)
    task = asyncio.create_task(scheduler.run())
    yield
    task.cancel()


app = FastAPI(title="CreatorIQ", version="1.0", description="Creator Analytics & Content Performance Dashboard", lifespan=lifespan)
for module in (auth, dashboard, content, audience, growth, revenue, integrations, notifications, reports):
    app.include_router(module.router)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "app": "CreatorIQ"}


if __name__ == "__main__":
    print("\n  CreatorIQ running →  http://127.0.0.1:8000\n")
    try:
        webbrowser.open("http://127.0.0.1:8000")
    except Exception:
        pass
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
