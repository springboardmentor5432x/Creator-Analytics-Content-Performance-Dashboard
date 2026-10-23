
from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


# Public users can register only with these roles.
# Administrator accounts must be created securely.
PublicRole = Literal["creator", "agency", "marketing_team","administrator"]

UserRole = Literal[
    "creator",
    "agency",
    "marketing_team",
    "administrator",
]


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: PublicRole = "creator"

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())

        if len(value) < 2:
            raise ValueError("Please enter your full name.")

        return value


class UserPublic(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    bio: str | None = None
    social_links: str | None = None
    theme_preference: str = "system"
    email_notifications: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    bio: str | None = Field(default=None, max_length=1000)
    social_links: str | None = Field(default=None, max_length=2000)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())

        if len(value) < 2:
            raise ValueError("Please enter your full name.")

        return value


class AccountSettingsUpdate(BaseModel):
    theme_preference: Literal["system", "light", "dark"] = "system"
    email_notifications: bool = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# Admin response schemas

class AdminUserUpdate(BaseModel):
    is_active: bool


class AdminUserPublic(UserPublic):
    """User information returned by administrator APIs."""

    pass


class AdminUserList(BaseModel):
    users: list[AdminUserPublic]
    total: int
