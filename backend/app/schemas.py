import re
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

Platform = Literal["youtube", "instagram", "tiktok", "facebook", "x", "linkedin"]
PLATFORMS = ["youtube", "instagram", "tiktok", "facebook", "x", "linkedin"]
Role = Literal["creator", "agency", "marketing", "admin", "administrator"]
SelfRole = Literal["creator", "agency", "marketing"]  # public self-assigned roles


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    role: Role = "creator"

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, v):
        return v.strip()

    @field_validator("password")
    @classmethod
    def strong(cls, v):
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain at least one letter and one number")
        return v

    @field_validator("role")
    @classmethod
    def validate_role_security(cls, v):
        from .config import settings
        if v in ("admin", "administrator"):
            if not settings.ALLOW_DEV_ADMIN_REGISTRATION:
                raise ValueError(
                    "Administrator accounts cannot be self-registered in production for security reasons. "
                    "Administrator accounts must be provisioned by an existing administrator."
                )
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=64)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    role: Role
    bio: Optional[str] = None
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=500)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=64)

    @field_validator("new_password")
    @classmethod
    def strong(cls, v):
        return RegisterIn.strong(v)


class AdminUserUpdate(BaseModel):
    role: Optional[Role] = None
    is_active: Optional[bool] = None


class ContentIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    platform: Platform
    published_at: date
    views: int = Field(default=0, ge=0, le=10**10)
    likes: int = Field(default=0, ge=0, le=10**10)
    comments: int = Field(default=0, ge=0, le=10**10)
    shares: int = Field(default=0, ge=0, le=10**10)
    saves: int = Field(default=0, ge=0, le=10**10)
    reach: int = Field(default=0, ge=0, le=10**10)
    watch_time_minutes: float = Field(default=0, ge=0, le=10**9)


class ContentOut(ContentIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_demo: bool
    engagement_rate: float


class ConnectionIn(BaseModel):
    account_name: Optional[str] = Field(default=None, max_length=120)


class CampaignIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    client_name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    status: str = Field(default="active", pattern="^(planning|active|completed|paused)$")
    platform: str = Field(default="all", max_length=30)
    budget: float = Field(default=0.0, ge=0)
    spent: float = Field(default=0.0, ge=0)
    target_reach: int = Field(default=0, ge=0)
    actual_reach: int = Field(default=0, ge=0)
    target_engagement: int = Field(default=0, ge=0)
    actual_engagement: int = Field(default=0, ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    client_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    status: Optional[str] = Field(default=None, pattern="^(planning|active|completed|paused)$")
    platform: Optional[str] = Field(default=None, max_length=30)
    budget: Optional[float] = Field(default=None, ge=0)
    spent: Optional[float] = Field(default=None, ge=0)
    target_reach: Optional[int] = Field(default=None, ge=0)
    actual_reach: Optional[int] = Field(default=None, ge=0)
    target_engagement: Optional[int] = Field(default=None, ge=0)
    actual_engagement: Optional[int] = Field(default=None, ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class CampaignOut(CampaignIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_demo: bool
    created_at: datetime
    roi_pct: Optional[float] = 0.0


class AdminCreateUserIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    role: Role = "creator"
    bio: Optional[str] = Field(default=None, max_length=500)

    @field_validator("password")
    @classmethod
    def strong(cls, v):
        return RegisterIn.strong(v)


class AgencyCreatorLinkIn(BaseModel):
    contract_type: Optional[str] = Field(default="Exclusive", max_length=50)
    commission_pct: Optional[float] = Field(default=15.0, ge=0, le=100)
