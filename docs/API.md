# CreatorIQ – Module 1 API

Base URL (local): `http://localhost:8000` · Interactive docs: `/docs` (Swagger UI)

## How authentication and authorization work

```
Register -> Login -> JWT token -> Role identified -> Role check -> Ownership check -> Action
```

1. **Authentication (who are you?)** – `POST /api/auth/login` returns a JWT. Send it as `Authorization: Bearer <token>`. `get_current_user` decodes the token, loads the user from the database and rejects missing, invalid, expired tokens and disabled accounts (401).
2. **Authorization (what may you do?)** – `require_roles(...)` checks `users.role` from the database (not from the token, so a role change by an admin applies immediately). Wrong role gives 403.
3. **Ownership** – even with the right role you can only reach your own data. Example: a creator cannot read another creator's profile (403). An agency can read a creator only if linked in `agency_creators`.

Passwords are stored as bcrypt hashes. Login gives the same error for an unknown email and a wrong password.

## Roles

| Value | Label | Created by |
|---|---|---|
| creator | Creator | signup |
| agency | Agency | signup |
| marketing_team | Marketing Team | assigned by an admin |
| admin | Administrator | assigned by an admin |

## Endpoints

| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/auth/register | public | Create a creator or agency account |
| POST | /api/auth/login | public | OAuth2 password form (`username` = email, `password`), returns token and user |
| GET | /api/auth/me | any logged in | Current user and role |
| GET | /api/creators/me | creator | Own creator profile |
| PUT | /api/creators/me | creator | Update own profile (only sent fields change) |
| GET | /api/creators/{id} | owner, admin, agency linked to that creator | Read a creator profile |
| PUT | /api/creators/{id} | owner, admin | Update a creator profile |
| GET | /api/agencies/me | agency | Own agency profile |
| PUT | /api/agencies/me | agency | Update own agency profile |
| GET | /api/agencies/{id} | owner, admin | Read an agency profile |
| PUT | /api/agencies/{id} | owner, admin | Update an agency profile |
| GET | /api/agencies/me/creators | agency | Creators linked to my agency |
| POST | /api/agencies/me/creators | agency | Link a creator (`{"creator_id": 1}`) |
| DELETE | /api/agencies/me/creators/{creator_id} | agency | Unlink a creator |
| PATCH | /api/account/me | any logged in | Change own display name |
| POST | /api/account/change-password | any logged in | Needs current password |
| POST | /api/account/deactivate | any logged in (not admin) | Needs password, disables the account |
| GET | /api/admin/users | admin | List all users |
| PATCH | /api/admin/users/{user_id} | admin | Change role or active status (not your own) |
| GET | /api/health | public | Health check |

## Status codes used

| Code | Meaning here |
|---|---|
| 200 / 201 / 204 | Success / created / success with no body |
| 400 | Business rule broken (wrong current password, admin editing self) |
| 401 | Missing, invalid or expired token; wrong login; deactivated account's old token |
| 403 | Logged in but role or ownership not allowed; disabled account at login |
| 404 | Record not found |
| 409 | Duplicate (email already registered, creator already linked) |
| 422 | Invalid or missing input |

## Request / response examples

**Register** `POST /api/auth/register`
```json
{ "name": "Kunal", "email": "kunal@example.com", "password": "Pass1234", "role": "creator" }
```
Rules: name 2-100 chars, valid email, password 8-72 chars with a letter and a number, role `creator` or `agency` only.
```json
{ "user_id": 5, "name": "Kunal", "email": "kunal@example.com", "role": "creator",
  "role_label": "Creator", "is_active": true, "created_at": "2026-10-16T05:30:00Z" }
```

**Login** `POST /api/auth/login` (form-encoded: `username`, `password`)
```json
{ "access_token": "eyJ...", "token_type": "bearer", "user": { "user_id": 5, "role": "creator", "...": "..." } }
```

**Update creator profile** `PUT /api/creators/me`
```json
{ "creator_name": "Kunal Creates", "bio": "Tech videos", "location": "Bhopal", "website": "https://example.com" }
```
`website` and `profile_image` must start with http:// or https://. Bio max 1000 chars.

**Change password** `POST /api/account/change-password`
```json
{ "current_password": "Pass1234", "new_password": "Better5678" }
```

## Known limits (to mention in review)

- Tokens are stateless: after a password change, old tokens stay valid until they expire (60 minutes by default). Disabling an account does stop its tokens immediately.
- No login rate limiting or email verification yet.
- Email cannot be changed from account settings.
