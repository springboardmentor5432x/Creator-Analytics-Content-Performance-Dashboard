from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)
    role: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class CreatorProfileIn(BaseModel):
    niche: Optional[str] = None
    bio: Optional[str] = None
    platform_links: Optional[str] = None

class AgencyProfileIn(BaseModel):
    agency_name: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None

class PasswordChangeIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)