from pydantic import BaseModel
from typing import Optional

class UserSettingsBase(BaseModel):
    theme: Optional[str] = "dark"
    email_notifications: Optional[bool] = True
    weekly_reports: Optional[bool] = True
    two_factor_enabled: Optional[bool] = False
    api_rate_limit_alert: Optional[bool] = True

class UserSettingsUpdate(UserSettingsBase):
    pass

class UserSettingsRead(UserSettingsBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
