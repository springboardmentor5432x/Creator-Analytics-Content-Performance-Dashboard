from datetime import datetime
from typing import Literal
from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    profile_name: str = Field(
        min_length=2, max_length=120,
        validation_alias=AliasChoices("profile_name", "creator_name"),
    )
    focus_area: str = Field(
        default="General", min_length=2, max_length=100,
        validation_alias=AliasChoices("focus_area", "niche"),
    )
    # The public signup form exposes the three standard account types only.
    # Administrator accounts are provisioned by an administrator or local seeding.
    role: Literal["creator", "agency", "marketing_team"] = "creator"


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["creator", "agency", "marketing_team", "administrator"]
    profile_name: str = Field(default="", max_length=120)
    focus_area: str = Field(
        default="General", min_length=2, max_length=100,
        validation_alias=AliasChoices("focus_area", "niche"),
    )


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    profile_name: str | None = Field(default=None, min_length=2, max_length=120)
    focus_area: str | None = Field(default=None, min_length=2, max_length=100)
    bio: str | None = Field(default=None, max_length=1000)


class AccountProfileResponse(BaseModel):
    user_id: int
    email: EmailStr
    full_name: str
    role: str
    profile_name: str | None = None
    focus_area: str | None = None
    bio: str | None = None
    created_at: datetime


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RoleUpdateRequest(BaseModel):
    role: Literal["creator", "agency", "marketing_team", "administrator"]
