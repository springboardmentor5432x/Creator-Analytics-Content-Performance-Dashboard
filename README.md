# CreatorIQ – Python Flask REST API Backend (Module 1)

This is the official Python Flask REST API backend for **CreatorIQ – Creator Analytics & Content Performance Dashboard (Module 1: User Management & Creator Profiles)**.

It provides:
- **Secure Password Hashing**: Werkzeug PBKDF2/SHA-256 password hashing. Passwords are never returned in responses.
- **JWT Authentication**: Signed JWT tokens (`HS256`) containing user identity, claims, and role.
- **Role-Based Authorization (RBAC)**: Fine-grained access control across 4 roles:
  1. `creator`
  2. `agency`
  3. `marketing`
  4. `admin`
- **Creator Profile Management**: Media kit stats, social links (YouTube, TikTok, Instagram), sponsorship rates, and collaboration availability.
- **Administrator User Management**: CRUD operations, status management (`active`, `pending`, `suspended`), user search, and security audit logs.
- **OAuth2 Integration Endpoints**: OAuth authorization and callback flows for Google/YouTube, TikTok, and Instagram.

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- Python 3.9+ or Python 3.10+
- `pip` and `virtualenv`

### 2. Create Virtual Environment & Install Dependencies
```bash
# Navigate to the backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install required dependencies
pip install -r requirements.txt
```

### 3. Initialize & Seed Database
Run the automated seed script to populate sample accounts:
```bash
python seed.py
```

### Pre-Seeded Accounts:
| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@creatoriq.com` | `AdminPass123!` | Full user management, role modification, audit logs |
| **Creator (HARSHITHA S)** | `sharshitha28007@gmail.com` or `creator@creatoriq.com` | `CreatorPass123!` | Content metrics, media kit, profile view & edit |
| **Agency** | `agency@creatoriq.com` | `AgencyPass123!` | Creator roster management & discovery |
| **Marketing** | `marketing@creatoriq.com` | `MarketingPass123!` | Campaign tracking & creator outreach |

---

### 4. Run the Flask Server
```bash
python app.py
```
The server will start on: **`http://127.0.0.1:5000`**

---

### 5. Run the Automated Test Suite
To verify password hashing, JWT authorization, RBAC rules, and creator profile updates:
```bash
python test_api.py
```

---

## 📡 API Endpoints Specification

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create account (`name`, `email`, `password`, `confirm_password`, `role`)
- `POST /api/auth/login` - Authenticate with email/password; returns JWT token
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/me` - Get logged-in user details (Requires `Authorization: Bearer <token>`)
- `POST /api/auth/refresh` - Refresh active JWT token

### Creator Profiles (`/api/creators`)
- `GET /api/creators/me` - Get current creator's profile and metrics (Requires JWT)
- `PUT /api/creators/me` - Update profile bio, niche, rates, and social channels (Requires JWT)
- `GET /api/creators/<id>` - View public creator profile
- `GET /api/creators` - List creators for Agency & Marketing teams

### Administrator (`/api/admin`)
*(Requires JWT with `role: "admin"`)*
- `GET /api/admin/users` - Search & filter registered users (by role, status, query)
- `POST /api/admin/users` - Create user with explicit role and status
- `PUT /api/admin/users/<id>` - Update user role or toggle status (`active` / `suspended`)
- `DELETE /api/admin/users/<id>` - Delete user account
- `GET /api/admin/stats` - System user statistics and audit logs

### OAuth2 Integration (`/api/oauth`)
- `GET /api/oauth/providers` - List supported social platforms (Google, TikTok, Instagram)
- `GET /api/oauth/authorize/<provider>` - Generate OAuth authorization redirect URL
- `POST /api/oauth/callback` - Complete OAuth token exchange and channel link

---

## 🔗 Connecting with the Frontend

In the root `.env` or in the frontend UI's **Backend Settings modal**:
```env
VITE_API_BASE_URL="http://127.0.0.1:5000/api"
```
The frontend automatically sends the JWT in the `Authorization: Bearer <token>` header on all protected requests.
