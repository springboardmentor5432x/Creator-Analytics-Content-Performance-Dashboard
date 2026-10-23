# CreatorIQ Social API backend starter

This is a backend integration starter for adding YouTube, Instagram, and Facebook account connections to the existing CreatorIQ FastAPI + PostgreSQL project. It does not replace the existing login/authentication system.

## Important
- The dashboard file supplied so far is frontend-only. This starter is designed to be merged into the existing backend.
- Social platform credentials and tokens must remain on the backend.
- Do not commit `.env`.
- Instagram insights generally require an eligible Instagram Professional account and Meta permissions. Facebook insights generally require Page access and permissions.
- YouTube channel/video data and YouTube Analytics data use different API scopes/endpoints.
- API access depends on the platform's approval, account type, permissions, and current API policies.

## 1. Install dependencies in your backend virtual environment

```powershell
pip install httpx cryptography itsdangerous PyJWT
```

Keep your existing FastAPI, SQLAlchemy, PostgreSQL, and authentication dependencies.

## 2. Copy files into your backend

Copy `app/models/social_account.py` and `app/routers/social_accounts.py` into the corresponding folders in your current backend.

The model assumes:
- your SQLAlchemy Base is `Base` in `app.database`
- your user table is named `users` and its primary key is `id`
- your existing database session dependency is `get_db` in `app.database`

Adjust the foreign key/table import if your project differs.

## 3. Add environment variables

Copy `.env.example` values into your existing backend `.env` and fill in the real credentials. Never send API secrets in chat or put them in React.

## 4. Register model and router

In your existing `app/main.py`, add the model import before `Base.metadata.create_all(...)` if your project uses `create_all`:

```python
from app.models.social_account import SocialAccount
```

Then register the router:

```python
from app.routers.social_accounts import router as social_accounts_router
app.include_router(social_accounts_router)
```

If you use Alembic migrations, create and apply a migration for `social_accounts` instead of relying on `create_all`.

## 5. Authentication integration

This starter verifies the existing CreatorIQ bearer JWT using `JWT_SECRET_KEY` and `JWT_ALGORITHM=HS256`, and expects the token `sub` claim to contain the user ID. Ensure `JWT_SECRET_KEY` is exactly the secret used by your existing login route. If your current project uses a different JWT library/secret/claim, adapt `get_current_user_id()` in the router to reuse your existing auth dependency instead.

## 6. OAuth callback URLs

For local development, configure these exact callback URLs in the corresponding provider developer consoles:
- YouTube / Google: `http://localhost:8000/api/social/callback/youtube`
- Instagram / Meta: `http://localhost:8000/api/social/callback/instagram`
- Facebook / Meta: `http://localhost:8000/api/social/callback/facebook`

Set `FRONTEND_DASHBOARD_URL=http://localhost:5173/dashboard` to the actual route in your frontend.

## 7. Available endpoints

All endpoints except OAuth callbacks require `Authorization: Bearer <CreatorIQ JWT>`:
- `GET /api/social/accounts` — list connected accounts
- `GET /api/social/connect/youtube` — start YouTube OAuth
- `GET /api/social/connect/instagram` — start Instagram OAuth
- `GET /api/social/connect/facebook` — start Facebook OAuth
- `GET /api/social/metrics/youtube` — YouTube channel/video summary
- `GET /api/social/metrics/instagram` — Instagram profile/media insights (where permitted)
- `GET /api/social/metrics/facebook` — Facebook Page insights (where permitted)
- `DELETE /api/social/accounts/{account_id}` — disconnect an account

After OAuth, the callback redirects to the frontend with `social_connected=<platform>` or `social_error=<reason>`. The frontend should show a success/error notice and refresh its data.

## 8. What this starter deliberately does not fake

If a provider does not return a metric or the app lacks permission, the endpoint returns a useful error rather than making up numbers. Your current dashboard's demo metrics should stay labeled as demo data until real API responses are wired into React.
