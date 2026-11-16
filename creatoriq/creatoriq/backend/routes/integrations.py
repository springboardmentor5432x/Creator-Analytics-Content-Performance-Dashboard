"""Social Media Integration module: connect accounts, sync, multi-platform status."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import cache
from ..config import PLATFORMS
from ..database import db, q, q1
from ..security import current_user
from ..services import connectors

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


class ConnectIn(BaseModel):
    platform: str
    handle: str


@router.get("")
def list_integrations(user=Depends(current_user)):
    with db() as c:
        accs = {a["platform"]: a for a in q(c, "SELECT * FROM accounts WHERE user_id=?", (user["id"],))}
        out = []
        for p in PLATFORMS:
            a = accs.get(p)
            f = q1(c, "SELECT followers FROM audience_daily WHERE user_id=? AND platform=? ORDER BY date DESC LIMIT 1", (user["id"], p)) if a else None
            n = q1(c, "SELECT COUNT(*) n FROM content WHERE user_id=? AND platform=?", (user["id"], p))["n"] if a else 0
            out.append({"platform": p, "connected": bool(a), "id": a["id"] if a else None, "handle": a["handle"] if a else "",
                        "last_sync": a["last_sync"] if a else None, "followers": f["followers"] if f else 0, "posts": n})
    return out


@router.post("/connect", status_code=201)
def connect(body: ConnectIn, user=Depends(current_user)):
    if body.platform not in PLATFORMS:
        raise HTTPException(400, "Unsupported platform")
    handle = body.handle.strip() or "@" + user["name"].lower().replace(" ", "")
    with db() as c:
        if q1(c, "SELECT id FROM accounts WHERE user_id=? AND platform=?", (user["id"], body.platform)):
            raise HTTPException(409, f"{body.platform} is already connected")
        cur = c.execute("INSERT INTO accounts(user_id,platform,handle) VALUES(?,?,?)", (user["id"], body.platform, handle))
        n = connectors.sync_account(c, q1(c, "SELECT * FROM accounts WHERE id=?", (cur.lastrowid,)))
    cache.clear_user(user["id"])
    return {"ok": True, "imported_posts": n}


@router.post("/sync")
def sync_all(user=Depends(current_user)):
    with db() as c:
        n = connectors.sync_user(c, user["id"])
    cache.clear_user(user["id"])
    return {"ok": True, "new_posts": n}


@router.delete("/{aid}")
def disconnect(aid: int, user=Depends(current_user)):
    with db() as c:
        a = q1(c, "SELECT * FROM accounts WHERE id=? AND user_id=?", (aid, user["id"]))
        if not a:
            raise HTTPException(404, "Account not found")
        for t in ("content", "audience_daily"):
            c.execute(f"DELETE FROM {t} WHERE user_id=? AND platform=?", (user["id"], a["platform"]))
        c.execute("DELETE FROM accounts WHERE id=?", (aid,))
    cache.clear_user(user["id"])
    return {"ok": True}
