"""Notification module: alerts and engagement notifications."""
from fastapi import APIRouter, Depends

from ..database import db, q
from ..security import current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user=Depends(current_user)):
    with db() as c:
        return q(c, "SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100", (user["id"],))


@router.post("/read-all")
def read_all(user=Depends(current_user)):
    with db() as c:
        c.execute("UPDATE notifications SET is_read=1 WHERE user_id=?", (user["id"],))
    return {"ok": True}


@router.post("/{nid}/read")
def read_one(nid: int, user=Depends(current_user)):
    with db() as c:
        c.execute("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", (nid, user["id"]))
    return {"ok": True}


@router.delete("/{nid}")
def delete_one(nid: int, user=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM notifications WHERE id=? AND user_id=?", (nid, user["id"]))
    return {"ok": True}
