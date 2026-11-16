import re
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, ConfigDict

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


class ContentCompareIn(BaseModel):
    ids: list[int] = Field(min_length=2, max_length=10)


class ConnectionIn(BaseModel):
    account_name: Optional[str] = Field(default=None, max_length=120)


class YouTubeConnectIn(BaseModel):
    channel_id: Optional[str] = Field(default=None, max_length=100, description="YouTube Channel ID (e.g. UC...) or handle (@name)")
    handle: Optional[str] = Field(default=None, max_length=100)
    api_key: Optional[str] = Field(default=None, max_length=200)
    access_token: Optional[str] = Field(default=None, max_length=500)
    account_name: Optional[str] = Field(default=None, max_length=120)


class YouTubeSyncOut(BaseModel):
    status: str
    channel_id: str
    channel_title: str
    subscribers: int
    total_views: int
    video_count: int
    synced_videos_count: int
    last_synced_at: datetime
    is_demo: bool
    message: str


class InstagramConnectIn(BaseModel):
    code: Optional[str] = Field(default=None, max_length=500, description="Authorization code from Meta OAuth redirect")
    state: Optional[str] = Field(default=None, max_length=200, description="CSRF state parameter")
    account_id: Optional[str] = Field(default=None, max_length=100, description="Instagram Professional Account ID or username")
    username: Optional[str] = Field(default=None, max_length=100)
    access_token: Optional[str] = Field(default=None, max_length=500)
    account_name: Optional[str] = Field(default=None, max_length=120)


class InstagramCallbackIn(BaseModel):
    code: str = Field(min_length=1, max_length=500, description="Authorization code returned by Meta")
    state: str = Field(min_length=1, max_length=200, description="CSRF state token")


class InstagramSyncOut(BaseModel):
    status: str
    account_id: str
    username: str
    followers: int
    media_count: int
    synced_media_count: int
    last_synced_at: datetime
    is_demo: bool
    message: str


class ConnectionOut(BaseModel):
    platform: str
    name: str
    status: str  # "disconnected" | "demo" | "connected"
    account_name: Optional[str] = None
    external_id: Optional[str] = None
    connected_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    sync_status: Optional[str] = None
    real_oauth_available: bool = False
    metadata: Optional[dict] = None
    requirements: str
    env_vars: str


class CampaignIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    client_name: str = Field(min_length=1, max_length=120)
    brand_id: Optional[int] = Field(default=None, gt=0)
    description: Optional[str] = Field(default=None, max_length=500)
    objective: Optional[str] = Field(default="Brand Awareness", max_length=150)
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

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    client_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    brand_id: Optional[int] = Field(default=None, gt=0)
    description: Optional[str] = Field(default=None, max_length=500)
    objective: Optional[str] = Field(default=None, max_length=150)
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

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class CampaignOut(CampaignIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_demo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    roi_pct: Optional[float] = 0.0


class CampaignListOut(BaseModel):
    items: list[CampaignOut]
    total: int


# ---------------------------------------------------------------- Phase 7.1: Brand & Sponsorship Foundation Schemas

class BrandIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = Field(default=None, max_length=500)
    industry: str = Field(default="General", min_length=1, max_length=100)
    website: Optional[str] = Field(default=None, max_length=255)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    contact_person: Optional[str] = Field(default=None, max_length=120)


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    description: Optional[str] = Field(default=None, max_length=500)
    industry: Optional[str] = Field(default=None, min_length=1, max_length=100)
    website: Optional[str] = Field(default=None, max_length=255)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    contact_person: Optional[str] = Field(default=None, max_length=120)


class BrandOut(BrandIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_demo: bool
    is_archived: bool = False
    created_at: datetime
    active_campaigns_count: Optional[int] = 0
    total_sponsorships_count: Optional[int] = 0


class BrandListOut(BaseModel):
    items: list[BrandOut]
    total: int


class CampaignCreatorIn(BaseModel):
    campaign_id: int = Field(gt=0)
    creator_id: int = Field(gt=0)
    agreed_compensation: float = Field(default=0.0, ge=0)
    status: str = Field(default="assigned", pattern="^(assigned|pending|accepted|declined|completed)$")
    deliverables: Optional[str] = Field(default=None, max_length=500)
    assigned_date: Optional[date] = None


class CampaignCreatorUpdate(BaseModel):
    agreed_compensation: Optional[float] = Field(default=None, ge=0)
    status: Optional[str] = Field(default=None, pattern="^(assigned|pending|accepted|declined|completed)$")
    deliverables: Optional[str] = Field(default=None, max_length=500)
    assigned_date: Optional[date] = None


class CampaignCreatorOut(CampaignCreatorIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_demo: bool
    is_archived: bool = False
    created_at: datetime
    creator_name: Optional[str] = None
    creator_email: Optional[str] = None
    campaign_title: Optional[str] = None


class CampaignCreatorListOut(BaseModel):
    items: list[CampaignCreatorOut]
    total: int


class SponsorshipIn(BaseModel):
    brand_id: int = Field(gt=0)
    campaign_id: Optional[int] = Field(default=None, gt=0)
    creator_id: int = Field(gt=0)
    amount: float = Field(default=0.0, ge=0)
    payment_status: str = Field(default="pending", pattern="^(pending|processing|paid|cancelled)$")
    contract_status: str = Field(default="draft", pattern="^(draft|sent|signed|completed|cancelled)$")
    payment_due_date: Optional[date] = None
    payment_date: Optional[date] = None
    deliverable_summary: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_payment_amounts(self):
        if self.amount < 0:
            raise ValueError("Sponsorship amount cannot be negative")
        return self


class SponsorshipUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, ge=0)
    payment_status: Optional[str] = Field(default=None, pattern="^(pending|processing|paid|cancelled)$")
    contract_status: Optional[str] = Field(default=None, pattern="^(draft|sent|signed|completed|cancelled)$")
    payment_due_date: Optional[date] = None
    payment_date: Optional[date] = None
    deliverable_summary: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=500)


class SponsorshipOut(SponsorshipIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_demo: bool
    is_archived: bool = False
    created_at: datetime
    brand_name: Optional[str] = None
    creator_name: Optional[str] = None
    campaign_title: Optional[str] = None


class SponsorshipListOut(BaseModel):
    items: list[SponsorshipOut]
    total: int
    total_amount: float = 0.0
    paid_amount: float = 0.0
    pending_amount: float = 0.0


class CampaignPerformanceIn(BaseModel):
    campaign_id: int = Field(gt=0)
    creator_id: Optional[int] = Field(default=None, gt=0)
    impressions: int = Field(default=0, ge=0)
    reach: int = Field(default=0, ge=0)
    engagements: int = Field(default=0, ge=0)
    clicks: int = Field(default=0, ge=0)
    conversions: int = Field(default=0, ge=0)
    revenue: float = Field(default=0.0, ge=0)
    reporting_date: date
    data_source: str = Field(default="manual", pattern="^(manual|demo|platform|youtube|instagram|tiktok)$")


class CampaignPerformanceUpdate(BaseModel):
    impressions: Optional[int] = Field(default=None, ge=0)
    reach: Optional[int] = Field(default=None, ge=0)
    engagements: Optional[int] = Field(default=None, ge=0)
    clicks: Optional[int] = Field(default=None, ge=0)
    conversions: Optional[int] = Field(default=None, ge=0)
    revenue: Optional[float] = Field(default=None, ge=0)
    reporting_date: Optional[date] = None
    data_source: Optional[str] = Field(default=None, pattern="^(manual|demo|platform|youtube|instagram|tiktok)$")


class CampaignPerformanceOut(CampaignPerformanceIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_demo: bool
    is_archived: bool = False
    created_at: datetime
    engagement_rate: float = 0.0
    conversion_rate: float = 0.0
    click_through_rate: float = 0.0
    cpm: Optional[float] = None
    cpe: Optional[float] = None
    creator_name: Optional[str] = None
    campaign_title: Optional[str] = None


class CampaignPerformanceListOut(BaseModel):
    items: list[CampaignPerformanceOut]
    total: int
    total_impressions: int = 0
    total_reach: int = 0
    total_engagements: int = 0
    total_clicks: int = 0
    total_conversions: int = 0
    total_revenue: float = 0.0
    overall_engagement_rate: Optional[float] = None
    overall_click_through_rate: Optional[float] = None
    overall_conversion_rate: Optional[float] = None


class CreatorCostItem(BaseModel):
    creator_id: int
    creator_name: Optional[str] = None
    agreed_compensation: float = 0.0
    status: str = "assigned"
    is_archived: bool = False


class SponsorshipCostItem(BaseModel):
    sponsorship_id: Optional[int] = None
    creator_id: int
    creator_name: Optional[str] = None
    amount: float = 0.0
    payment_status: str = "pending"
    contract_status: str = "draft"
    is_archived: bool = False


class CampaignCostBreakdownOut(BaseModel):
    direct_spend: float = 0.0
    creator_compensation_total: float = 0.0
    sponsorship_total: float = 0.0
    deduplicated_talent_total: float = 0.0
    total_campaign_cost: Optional[float] = None
    budget: float = 0.0
    budget_utilization_pct: Optional[float] = None
    cost_rule_applied: str = "direct_spent_inclusive"
    has_cost_ambiguity: bool = False
    cost_ambiguity_note: Optional[str] = None
    active_creators_count: int = 0
    active_sponsorships_count: int = 0
    creator_items: list[CreatorCostItem] = Field(default_factory=list)
    sponsorship_items: list[SponsorshipCostItem] = Field(default_factory=list)


class CampaignRevenueAttributionOut(BaseModel):
    attributed_revenue: Optional[float] = None
    attribution_status: str = "unavailable"
    revenue_by_source: dict[str, float] = Field(default_factory=dict)
    attribution_sources_count: int = 0
    has_demo_data: bool = False
    limitations: str = ""


class CampaignCoreMetricsOut(BaseModel):
    roi_pct: Optional[float] = None
    roas: Optional[float] = None
    cpm: Optional[float] = None
    cpe: Optional[float] = None
    ctr: Optional[float] = None
    conversion_rate: Optional[float] = None
    engagement_rate: Optional[float] = None
    net_profit: Optional[float] = None


class CampaignTotalsOut(BaseModel):
    impressions: int = 0
    reach: int = 0
    engagements: int = 0
    clicks: int = 0
    conversions: int = 0


class CampaignROISummaryOut(BaseModel):
    campaign_id: int
    title: str
    client_name: str
    status: str
    platform: str
    is_demo: bool
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    cost: CampaignCostBreakdownOut
    revenue: CampaignRevenueAttributionOut
    metrics: CampaignCoreMetricsOut
    totals: CampaignTotalsOut


class CreatorPerformanceOut(BaseModel):
    creator_id: int
    creator_name: Optional[str] = None
    creator_email: Optional[str] = None
    agreed_compensation: float = 0.0
    status: str = "assigned"
    deliverables: Optional[str] = None
    impressions: int = 0
    reach: int = 0
    engagements: int = 0
    clicks: int = 0
    conversions: int = 0
    attributed_revenue: Optional[float] = None
    cpm: Optional[float] = None
    cpe: Optional[float] = None
    ctr: Optional[float] = None
    conversion_rate: Optional[float] = None
    roi_pct: Optional[float] = None
    roas: Optional[float] = None


class CreatorPerformanceListOut(BaseModel):
    campaign_id: int
    campaign_title: str
    items: list[CreatorPerformanceOut]
    total: int


class MultiCampaignROISummaryOut(BaseModel):
    total_campaigns: int
    total_budget: float
    total_cost: Optional[float] = None
    total_attributed_revenue: float
    overall_roi_pct: Optional[float] = None
    overall_roas: Optional[float] = None
    total_impressions: int
    total_engagements: int
    overall_cpm: Optional[float] = None
    overall_cpe: Optional[float] = None
    has_demo: bool
    campaigns: list[CampaignROISummaryOut]


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


# ---------------------------------------------------------------- Phase 1 Foundation Schemas
RevenueSource = Literal["sponsorships", "ad_revenue", "affiliate", "brand_collaborations", "subscriptions"]
REVENUE_SOURCES = ["sponsorships", "ad_revenue", "affiliate", "brand_collaborations", "subscriptions"]


class RevenueRecordIn(BaseModel):
    source: RevenueSource
    amount: float = Field(ge=0, le=10**9)
    platform: Platform
    date: date
    notes: Optional[str] = Field(default=None, max_length=500)


class RevenueRecordUpdate(BaseModel):
    source: Optional[RevenueSource] = None
    amount: Optional[float] = Field(default=None, ge=0, le=10**9)
    platform: Optional[Platform] = None
    date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class RevenueRecordOut(RevenueRecordIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_demo: bool
    created_at: datetime


class HashtagMetricIn(BaseModel):
    tag: str = Field(min_length=1, max_length=100)
    platform: Platform
    post_count: int = Field(default=0, ge=0, le=10**7)
    total_reach: int = Field(default=0, ge=0, le=10**10)
    avg_engagement: float = Field(default=0.0, ge=0, le=10**4)

    @field_validator("tag")
    @classmethod
    def format_tag(cls, v: str) -> str:
        tag = v.strip()
        if not tag.startswith("#"):
            tag = f"#{tag}"
        return tag


class HashtagMetricOut(HashtagMetricIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_demo: bool
    created_at: datetime


NotificationCategory = Literal["performance", "engagement", "revenue", "system"]
NOTIFICATION_CATEGORIES = ["performance", "engagement", "revenue", "system"]


class NotificationIn(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    message: str = Field(min_length=1, max_length=500)
    category: NotificationCategory = "performance"


class NotificationOut(NotificationIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_read: bool
    is_demo: bool
    created_at: datetime


class DeviceDistribution(BaseModel):
    mobile: float = Field(default=0.0, ge=0.0, le=100.0)
    desktop: float = Field(default=0.0, ge=0.0, le=100.0)
    tablet: float = Field(default=0.0, ge=0.0, le=100.0)

    @field_validator("mobile", "desktop", "tablet")
    @classmethod
    def round_val(cls, v: float) -> float:
        return round(v, 2)


# ---------------------------------------------------------------- Reach Prediction Schemas
class HashtagImpact(BaseModel):
    tag: str
    reach_boost_pct: float
    historical_reach: int


class OptimalPostingWindow(BaseModel):
    best_hour: int
    activity_score: float
    expected_boost_pct: float


class ReachPredictionIn(BaseModel):
    platform: Platform = "instagram"
    content_type: str = Field(default="post", pattern="^(post|reel|short|video|carousel|story)$")
    hashtags: Optional[str] = None
    caption: Optional[str] = None
    planned_hour: Optional[int] = Field(default=None, ge=0, le=23)


class ReachPredictionOut(BaseModel):
    platform: str
    content_type: str
    expected_reach: int
    min_reach: int
    max_reach: int
    predicted_engagement: int
    predicted_engagement_rate: float
    hashtag_impact: list[HashtagImpact]
    optimal_posting_window: OptimalPostingWindow
    confidence_score: float
    recommendations: list[str]
