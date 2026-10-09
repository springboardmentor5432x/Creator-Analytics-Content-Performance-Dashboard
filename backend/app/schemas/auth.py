from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import UserRole

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, example="Alex Rivera")
    email: EmailStr = Field(..., example="alex.creator@creatoriq.com")
    password: str = Field(..., min_length=6, max_length=100, example="SecurePassword123!")
    role: UserRole = Field(default=UserRole.CREATOR, example=UserRole.CREATOR)

class UserLogin(BaseModel):
    email: EmailStr = Field(..., example="alex.creator@creatoriq.com")
    password: str = Field(..., example="SecurePassword123!")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    email: str
    role: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None
