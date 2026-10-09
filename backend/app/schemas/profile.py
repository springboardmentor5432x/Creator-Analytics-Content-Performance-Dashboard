from pydantic import BaseModel, EmailStr
from typing import Optional, List

class CreatorProfileBase(BaseModel):
    handle: Optional[str] = "@alexrivera"
    niche: Optional[str] = "Tech & Creator Economy"
    bio: Optional[str] = "Digital creator crafting content on AI, tech trends, and digital productivity."
    avatar_url: Optional[str] = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
    youtube_channel: Optional[str] = "youtube.com/c/AlexRiveraTech"
    instagram_handle: Optional[str] = "@alex_rivera_tech"
    tiktok_handle: Optional[str] = "@alexrivera_official"
    total_followers: Optional[int] = 248000
    monthly_views: Optional[int] = 1850000
    connected_accounts: Optional[List[str]] = ["YouTube", "Instagram", "TikTok"]

class CreatorProfileUpdate(CreatorProfileBase):
    pass

class CreatorProfileRead(CreatorProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class AgencyProfileBase(BaseModel):
    agency_name: str = "Apex Creator Talent Agency"
    company_website: Optional[str] = "https://apexcreators.com"
    managed_creators_count: Optional[int] = 34
    primary_contact_email: Optional[EmailStr] = "contact@apexcreators.com"
    tier: Optional[str] = "Enterprise Agency"
    description: Optional[str] = "Leading talent management and growth acceleration agency for top tier content creators."

class AgencyProfileUpdate(AgencyProfileBase):
    pass

class AgencyProfileRead(AgencyProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
