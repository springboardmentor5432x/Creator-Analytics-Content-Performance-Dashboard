"""User Management: register, login (JWT/OAuth2), profile, settings, RBAC admin."""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field

from ..config import ROLES
from ..database import db, q, q1
from ..security import (hash_password, verify_password, create_token, current_user,
                        require_roles, MANAGER_ROLES)
from ..services import connectors

router = APIRouter(prefix="/api", tags=["auth"])


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=72)
    role: str = "creator"
    company: str = ""
    demo_data: bool = True


class LoginIn(BaseModel):
    email: str
    password: str


class ProfileIn(BaseModel):
    name: str | None = None
    bio: str | None = None
    niche: str | None = None
    company: str | None = None
    settings: dict | None = None


class PasswordIn(BaseModel):
    current: str
    new: str = Field(min_length=6, max_length=72)


def public(u: dict) -> dict:
    d = {k: u[k] for k in ("id", "name", "email", "role", "bio", "niche", "company", "created_at")}
    d["settings"] = json.loads(u.get("settings") or "{}")
    return d


def _login(email: str, password: str):
    with db() as c:
        u = q1(c, "SELECT * FROM users WHERE lower(email)=lower(?)", (email.strip(),))
    if not u or not verify_password(password, u["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token": create_token(u), "token_type": "bearer", "user": public(u)}


@router.post("/auth/register", status_code=201)
def register(body: RegisterIn):
    if body.role not in ("creator", "agency", "marketing"):
        raise HTTPException(400, "Role must be creator, agency or marketing")
    with db() as c:
        if q1(c, "SELECT id FROM users WHERE lower(email)=lower(?)", (body.email,)):
            raise HTTPException(409, "An account with this email already exists")
        cur = c.execute("INSERT INTO users(name,email,password_hash,role,company,settings) VALUES(?,?,?,?,?,?)",
                        (body.name.strip(), body.email.strip(), hash_password(body.password), body.role, body.company,
                         json.dumps({"weekly_report": True, "email_alerts": True, "revenue_alerts": True})))
        uid = cur.lastrowid
        connectors.notify(c, uid, "success", "Welcome to CreatorIQ 🎉", "Connect your social accounts to start tracking performance.")
        if body.demo_data and body.role == "creator":
            for plat in ("YouTube", "Instagram", "TikTok"):
                cur = c.execute("INSERT INTO accounts(user_id,platform,handle) VALUES(?,?,?)",
                                (uid, plat, "@" + body.name.lower().replace(" ", "")))
                connectors.sync_account(c, q1(c, "SELECT * FROM accounts WHERE id=?", (cur.lastrowid,)))
    return _login(body.email, body.password)


@router.post("/auth/login")
def login(body: LoginIn):
    return _login(body.email, body.password)


@router.post("/auth/token")  # OAuth2 password flow (used by Swagger "Authorize")
def token(form: OAuth2PasswordRequestForm = Depends()):
    return _login(form.username, form.password)


@router.get("/auth/me")
def me(user=Depends(current_user)):
    return public(user)


@router.put("/auth/me")
def update_me(body: ProfileIn, user=Depends(current_user)):
    with db() as c:
        settings = json.loads(user.get("settings") or "{}")
        if body.settings:
            settings.update(body.settings)
        c.execute("UPDATE users SET name=?, bio=?, niche=?, company=?, settings=? WHERE id=?",
                  (body.name or user["name"], body.bio if body.bio is not None else user["bio"],
                   body.niche if body.niche is not None else user["niche"],
                   body.company if body.company is not None else user["company"], json.dumps(settings), user["id"]))
        return public(q1(c, "SELECT * FROM users WHERE id=?", (user["id"],)))


@router.post("/auth/password")
def change_password(body: PasswordIn, user=Depends(current_user)):
    if not verify_password(body.current, user["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    with db() as c:
        c.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_password(body.new), user["id"]))
    return {"ok": True}


@router.get("/creators")
def creators(user=Depends(require_roles(*MANAGER_ROLES))):
    """Agency / marketing / admin: list creators they can analyse."""
    with db() as c:
        return q(c, """SELECT u.id, u.name, u.email, u.niche,
                       COALESCE((SELECT SUM(followers) FROM audience_daily a WHERE a.user_id=u.id
                                 AND a.date=(SELECT MAX(date) FROM audience_daily WHERE user_id=u.id AND platform=a.platform)),0) followers,
                       (SELECT COUNT(*) FROM accounts WHERE user_id=u.id) platforms
                       FROM users u WHERE u.role='creator' ORDER BY followers DESC""")


@router.get("/admin/users")
def admin_users(user=Depends(require_roles("admin"))):
    with db() as c:
        return q(c, "SELECT id,name,email,role,company,created_at FROM users ORDER BY id")


@router.put("/admin/users/{uid}/role")
def set_role(uid: int, role: str, user=Depends(require_roles("admin"))):
    if role not in ROLES:
        raise HTTPException(400, "Unknown role")
    with db() as c:
        c.execute("UPDATE users SET role=? WHERE id=?", (role, uid))
    return {"ok": True}


@router.delete("/admin/users/{uid}")
def delete_user(uid: int, user=Depends(require_roles("admin"))):
    if uid == user["id"]:
        raise HTTPException(400, "You cannot delete yourself")
    with db() as c:
        c.execute("DELETE FROM users WHERE id=?", (uid,))
    return {"ok": True}
