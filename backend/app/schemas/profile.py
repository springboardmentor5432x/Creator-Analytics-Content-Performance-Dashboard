from pydantic import BaseModel, ConfigDict


class CreatorProfileUpdate(BaseModel):

    display_name: str | None = None
    bio: str | None = None
    niche: str | None = None
    location: str | None = None
    website_url: str | None = None


class CreatorProfileResponse(CreatorProfileUpdate):

    id: int
    user_id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class AgencyProfileUpdate(BaseModel):

    agency_name: str | None = None
    description: str | None = None
    location: str | None = None
    website_url: str | None = None


class AgencyProfileResponse(AgencyProfileUpdate):

    id: int
    user_id: int

    model_config = ConfigDict(
        from_attributes=True
    )