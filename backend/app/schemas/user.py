from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models.user import UserRole
from app.schemas.profile import CreatorProfileRead, AgencyProfileRead
from app.schemas.settings import UserSettingsRead

class UserRead(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    creator_profile: Optional[CreatorProfileRead] = None
    agency_profile: Optional[AgencyProfileRead] = None
    settings: Optional[UserSettingsRead] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
