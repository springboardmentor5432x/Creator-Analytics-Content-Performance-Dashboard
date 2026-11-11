from datetime import date, datetime
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
    avatar_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=40)
    website: str | None = Field(default=None, max_length=300)
    country: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=300)
    business_email: str | None = Field(default=None, max_length=255)
    contact_number: str | None = Field(default=None, max_length=40)
    social_links: dict[str, str] | None = None


class AccountPreferencesRequest(BaseModel):
    timezone: str | None = Field(default=None, max_length=60)
    date_format: Literal["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] | None = None
    notification_preferences: dict[str, bool] | None = None


class AccountProfileResponse(BaseModel):
    user_id: int
    email: EmailStr
    full_name: str
    role: str
    profile_name: str | None = None
    focus_area: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    website: str | None = None
    country: str | None = None
    address: str | None = None
    business_email: str | None = None
    contact_number: str | None = None
    social_links: dict[str, str] = Field(default_factory=dict)
    timezone: str = "UTC"
    date_format: str = "DD/MM/YYYY"
    notification_preferences: dict[str, bool] = Field(default_factory=dict)
    last_login_at: datetime | None = None
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
    is_active: bool = True
    last_login_at: datetime | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AdminUserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    profile_name: str | None = Field(default=None, max_length=120)
    focus_area: str | None = Field(default=None, max_length=100)
    bio: str | None = Field(default=None, max_length=1000)
    role: Literal["creator", "agency", "marketing_team", "administrator"] | None = None


class AdminResetPasswordRequest(BaseModel):
    new_password: str | None = Field(default=None, min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RoleUpdateRequest(BaseModel):
    role: Literal["creator", "agency", "marketing_team", "administrator"]


RevenueSource = Literal[
    "Sponsorships", "Ad revenue", "Affiliate marketing",
    "Brand collaborations", "Subscription revenue", "Platform monetization",
    "Other income", "Other",
]
PaymentStatus = Literal["pending", "paid", "overdue"]
RevenueSourceType = Literal["manual", "platform_reported"]


class RevenueCreateRequest(BaseModel):
    source: RevenueSource
    amount: float = Field(gt=0, le=99_999_999)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    brand: str | None = Field(default=None, max_length=160)
    payment_status: PaymentStatus = "paid"
    source_type: RevenueSourceType = "manual"
    description: str | None = Field(default=None, max_length=250)
    recorded_on: date = Field(default_factory=date.today)


class RevenueUpdateRequest(BaseModel):
    source: RevenueSource | None = None
    amount: float | None = Field(default=None, gt=0, le=99_999_999)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    brand: str | None = Field(default=None, max_length=160)
    payment_status: PaymentStatus | None = None
    source_type: RevenueSourceType | None = None
    description: str | None = Field(default=None, max_length=250)
    recorded_on: date | None = None


class ReportGenerateRequest(BaseModel):
    report_type: Literal[
        "performance", "content", "audience", "growth", "revenue"
    ] = "performance"
    format: Literal["pdf", "xlsx", "csv"] = "pdf"
    days: int = Field(default=30, ge=1, le=730)
    platform: str | None = Field(default=None, max_length=40)


class AgencyReportGenerateRequest(ReportGenerateRequest):
    """Agency reports add campaign coverage to the shared report builder."""

    report_type: Literal[
        "performance", "content", "audience", "growth", "revenue", "campaign"
    ] = "performance"


class ReportScheduleCreateRequest(ReportGenerateRequest):
    cadence: Literal["weekly", "monthly"] = "weekly"


class ReportScheduleUpdateRequest(BaseModel):
    is_active: bool


class WorkspaceAccessRequest(BaseModel):
    creator_email: EmailStr
    note: str | None = Field(default=None, max_length=500)
    permissions: list[str] | None = None


class WorkspacePermissionsRequest(BaseModel):
    permissions: list[str] = Field(default_factory=list)


class TeamMemberCreateRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    role: Literal["agency_owner", "agency_admin", "campaign_manager", "analyst", "viewer"] = "viewer"


class TeamMemberUpdateRequest(BaseModel):
    role: Literal["agency_owner", "agency_admin", "campaign_manager", "analyst", "viewer"] | None = None
    status: Literal["invited", "active", "deactivated"] | None = None


class CampaignCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    brand: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    start_date: date | None = None
    end_date: date | None = None
    budget: float = Field(default=0, ge=0, le=999_999_999)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    platforms: list[str] = Field(default_factory=list)
    objectives: str | None = Field(default=None, max_length=2000)
    status: Literal["draft", "active", "paused", "completed", "cancelled"] = "draft"


class CampaignUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    brand: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    start_date: date | None = None
    end_date: date | None = None
    budget: float | None = Field(default=None, ge=0, le=999_999_999)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    platforms: list[str] | None = None
    objectives: str | None = Field(default=None, max_length=2000)
    status: Literal["draft", "active", "paused", "completed", "cancelled"] | None = None


class CampaignCreatorAssignment(BaseModel):
    creator_profile_id: int
    notes: str | None = Field(default=None, max_length=300)
