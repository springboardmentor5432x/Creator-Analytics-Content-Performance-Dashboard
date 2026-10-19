from enum import Enum
from pydantic import BaseModel, EmailStr, Field


class RegisterRole(str, Enum):
    # Admin is intentionally NOT here - nobody can self-register as admin
    creator = "creator"
    agency = "agency"
    marketing_team = "marketing_team"


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: RegisterRole


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
