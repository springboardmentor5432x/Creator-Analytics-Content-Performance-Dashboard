# CreatorHub

## Content Intelligence Platform for Social Media Performance and Creator Growth Analytics

CreatorHub is a role-based social media intelligence workspace that
helps creators and teams manage connected social accounts, monitor
content performance, understand audience growth, and collaborate through
controlled creator--workspace access.

The platform provides four role-oriented workspaces: **Creator, Agency,
Marketing, and Admin**.

> **Integration status:** YouTube OAuth and available channel/video
> analytics are supported when the required Google APIs, credentials,
> scopes, and account permissions are configured. Spotify OAuth
> retrieves the authorized user's profile; Spotify streaming,
> playlist-performance, and listening analytics are not implemented in
> this version. Instagram and LinkedIn require separate developer
> applications and approved API permissions.

------------------------------------------------------------------------

## Contents

-   [Project Overview](#project-overview)
-   [Key Features](#key-features)
-   [Role-Based Workspaces](#role-based-workspaces)
-   [Creator Access Workflow](#creator-access-workflow)
-   [Technology Stack](#technology-stack)
-   [Architecture](#architecture)
-   [Repository Structure](#repository-structure)
-   [Prerequisites](#prerequisites)
-   [Clone the Repository](#clone-the-repository)
-   [Backend Setup](#backend-setup)
-   [Frontend Setup](#frontend-setup)
-   [Environment Configuration](#environment-configuration)
-   [OAuth Configuration](#oauth-configuration)
-   [Run the Application](#run-the-application)
-   [API Overview](#api-overview)
-   [Data and Integration Notes](#data-and-integration-notes)
-   [Security](#security)
-   [Troubleshooting](#troubleshooting)
-   [Future Enhancements](#future-enhancements)

## Project Overview

Creators often need to use multiple platforms to understand how their
content is performing. Agencies and marketing teams also need a
controlled way to collaborate with creators and review the information
creators choose to share.

CreatorHub provides a centralized dashboard for available content and
audience metrics, social account authorization, YouTube analytics
retrieval, creator-access requests and approvals, and workspace
relationship management.

## Key Features

### Authentication and account management

-   User registration and login.
-   Role selection: Creator, Agency, Marketing, or Admin.
-   Backend password hashing and JWT-based authentication for protected
    API routes.
-   User profile and account settings.
-   Account deletion with password confirmation.
-   Google sign-in UI support when the frontend Google OAuth client ID
    is configured.

### Role-based dashboards

-   Separate navigation and dashboard areas for Creator, Agency,
    Marketing, and Admin users.
-   Role-oriented tools for creator analytics, collaboration, campaigns,
    reports, and platform administration.
-   Data visibility depends on the user's role, permissions, connected
    accounts, available records, and implemented integrations.

### Social account management

-   View available platforms and connection status.
-   Connect YouTube through Google OAuth.
-   Authorize a Spotify account and retrieve its profile information.
-   Open a connected public profile when a profile URL is available.
-   Disconnect a connected social account.

### YouTube integration

When Google credentials and permissions are configured, the application
can: - Authorize a YouTube account using Google OAuth. - Retrieve
channel profile information and available channel statistics. -
Synchronize available video details. - Retrieve video metrics such as
views, likes, and comments when exposed by the API. - Store retrieved
account, post, and analytics information in the database. - Retrieve
historical reports through the YouTube Analytics API when access and
permissions allow it.

### Spotify profile authorization

-   Authorize a Spotify account through Spotify OAuth.
-   Retrieve the authorized user's profile information.
-   Store the connected account information.

**Scope note:** Spotify profile authorization does not provide streaming
counts, song performance, playlist analytics, or listening history in
this version.

### Creator discovery and access requests

-   Agency and Marketing users can browse the creator directory.
-   A workspace can request access to a creator.
-   Creators can review incoming requests and approve or reject them.
-   Approved relationships allow the workspace to view creator
    information shared through the application, subject to permissions.

### Revoke or remove an approved relationship

-   A Creator can revoke an approved Agency or Marketing workspace's
    access.
-   The requesting Agency or Marketing workspace can remove a creator
    from its workspace.
-   The backend checks that the authenticated user is one of the parties
    in the relationship.
-   Ending the relationship removes the workspace access link.

**Removing a creator from a workspace does not delete the creator's user
account, social accounts, posts, or personal analytics.** It only ends
that workspace's access to the creator's shared information.

### Analytics and reports

-   Dashboard overview cards for available metrics.
-   Content and video performance views.
-   Post comparison using available metrics.
-   Audience-growth views where historical snapshots exist.
-   Role-specific analytics and report sections.
-   Report export controls where implemented in the interface.

Campaign, budget, brand-deal, and revenue totals depend on corresponding
records and implemented data sources. A displayed zero may mean no
records have been added or synchronized.

## Role-Based Workspaces

  -----------------------------------------------------------------------
  Role                    Purpose                 Main capabilities
  ----------------------- ----------------------- -----------------------
  **Creator**             Manage personal creator Personal dashboard,
                          presence                social accounts,
                                                  content analytics,
                                                  audience insights,
                                                  incoming workspace
                                                  requests, and access
                                                  revocation

  **Agency**              Collaborate with        Creator directory,
                          creators                access requests,
                                                  approved creator
                                                  information, workspace
                                                  relationship
                                                  management, campaigns,
                                                  and reports

  **Marketing**           Coordinate marketing    Creator discovery and
                          work                    access requests,
                                                  campaign-oriented
                                                  workspace,
                                                  content/performance
                                                  views, and reports

  **Admin**               Platform administration Administrative views
                                                  and platform
                                                  monitoring, subject to
                                                  configured
                                                  functionality and
                                                  permissions
  -----------------------------------------------------------------------

A creator's private connected-account information and analytics should
be shared with a workspace only after the creator approves its access
request.

## Creator Access Workflow

1.  An Agency or Marketing user opens **Creators** and selects a
    creator.
2.  The workspace submits an access request.
3.  The Creator opens the workspace/agency requests section.
4.  The Creator reviews the requesting workspace and approves or rejects
    the request.
5.  After approval, the workspace can view the creator information
    shared through the application.
6.  If the collaboration ends, the Creator can revoke access, or the
    workspace can remove the creator.
7.  The relationship ends, while the Creator's own account and personal
    data remain intact.

This workflow provides controlled sharing without transferring ownership
of creator data.

## Technology Stack

  -----------------------------------------------------------------------
  Layer                               Technologies
  ----------------------------------- -----------------------------------
  Frontend                            React, Vite, JavaScript

  UI and visualization                Recharts, Lucide React, CSS

  Backend                             Python, FastAPI, Pydantic

  Database                            PostgreSQL configuration; SQLite
                                      fallback for local development

  ORM                                 SQLAlchemy

  Authentication                      JWT and backend password hashing

  Integrations                        YouTube Data API, YouTube Analytics
                                      API, Spotify Web API/OAuth

  Backend server                      Uvicorn

  Version control                     Git and GitHub
  -----------------------------------------------------------------------

## Architecture

``` text
Browser
   |
   v
React + Vite frontend
   |
   | HTTP requests / JWT
   v
FastAPI backend
   |
   +-- Authentication and user management
   +-- Creator/workspace access requests
   +-- Relationship approval, revocation, and removal
   +-- Social account management
   +-- YouTube OAuth and analytics
   +-- Spotify OAuth and profile retrieval
   |
   v
SQLAlchemy ORM
   |
   +-- PostgreSQL
   +-- SQLite for local development
```

## Repository Structure

A typical project layout is shown below. Folder names may differ in your
current checkout.

``` text
Creator-Analytics-Content-Performance-Dashboard/
├── README.md
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── .env                 # Create locally; do not commit
└── frontend/
    ├── package.json
    ├── .env                 # Create locally; do not commit
    ├── index.html
    └── src/
        ├── App.jsx
        └── ...
```

If `package.json` or `app.py` is located elsewhere, run the
corresponding commands from the directory containing that file.

## Prerequisites

-   Git.
-   Node.js and npm.
-   Python 3.10 or a version compatible with the backend dependencies.
-   PostgreSQL, if using a PostgreSQL database.
-   Google Cloud credentials and required YouTube APIs for YouTube
    integration.
-   A Spotify Developer application for Spotify profile authorization.

## Clone the Repository

``` bash
git clone https://github.com/springboardmentor5432x/Creator-Analytics-Content-Performance-Dashboard.git
cd Creator-Analytics-Content-Performance-Dashboard
```

To use a particular development branch:

``` bash
git branch -a
git switch <branch-name>
```

Replace `<branch-name>` with the branch you are authorized to use.

## Backend Setup

Open a terminal in the directory containing `backend/app.py`:

``` bash
cd backend
```

Create and activate a virtual environment.

**Windows PowerShell**

``` powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**

``` bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies. If the repository contains a maintained
`requirements.txt`, use it:

``` bash
pip install -r requirements.txt
```

Otherwise, install the backend packages used by the application:

``` bash
pip install fastapi "uvicorn[standard]" sqlalchemy psycopg2-binary python-dotenv PyJWT requests "pydantic[email]" pwdlib
```

Create `backend/.env` as described in [Environment
Configuration](#environment-configuration).

## Frontend Setup

Open a second terminal in the directory containing the frontend
`package.json`. If the frontend folder is named `frontend`:

``` bash
cd frontend
npm install
```

If `package.json` is in the repository root, run `npm install` from the
repository root instead.

## Environment Configuration

### Backend: `backend/.env`

Configure the variables required by your current backend:

``` env
# Database: PostgreSQL
DATABASE_URL=postgresql+psycopg2://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME

# For local SQLite development, use this instead:
# DATABASE_URL=sqlite:///./creatorhub_dev.db

# Authentication
JWT_SECRET_KEY=replace_with_a_long_random_secret
JWT_EXPIRE_MINUTES=10080

# Application URLs
FRONTEND_ORIGIN=http://localhost:5173
BACKEND_PUBLIC_URL=http://127.0.0.1:8000

# Google / YouTube OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/oauth/youtube/callback

# Spotify OAuth
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/api/oauth/spotify/callback
```

Use the exact environment variable names expected by your current
backend. Keep `.env` local and out of version control.

### Frontend: `.env`

In the directory containing the Vite `package.json`, create:

``` env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

`VITE_GOOGLE_CLIENT_ID` is needed only when frontend Google sign-in is
enabled. Vite variables prefixed with `VITE_` are exposed to frontend
code. **Never put a client secret or private credential in this file.**

Restart the relevant development server after changing environment
variables.

## OAuth Configuration

### Google / YouTube

1.  Open Google Cloud Console and select or create a project.
2.  Enable the YouTube APIs required by the backend.
3.  Configure the OAuth consent screen.
4.  Add test users if the OAuth application is in testing mode.
5.  Create OAuth client credentials.
6.  Configure authorized JavaScript origins for the frontend, such as
    `http://localhost:5173` and `http://127.0.0.1:5173`.
7.  Add the exact backend callback URL from `GOOGLE_REDIRECT_URI` to the
    authorized redirect URIs.
8.  Use the matching client ID in `VITE_GOOGLE_CLIENT_ID` if Google
    sign-in is enabled.

### Spotify

1.  Create an application in the Spotify Developer Dashboard.
2.  Copy its client ID and client secret into the backend `.env`.
3.  Add the exact callback URL from `SPOTIFY_REDIRECT_URI` to the
    Spotify application's Redirect URIs.
4.  Restart the backend after updating the configuration.

OAuth requirements, scopes, testing restrictions, and API availability
may change. Check the provider's current developer documentation when
configuring an integration.

## Run the Application

Run the backend and frontend in **separate terminals**.

### Start the backend

From the directory containing `app.py`, activate the virtual environment
and run:

``` bash
uvicorn app:app --reload
```

The backend is normally available at:

-   API base: `http://127.0.0.1:8000`
-   Swagger API documentation: `http://127.0.0.1:8000/docs`

If the backend defines a health endpoint, it may be available at
`http://127.0.0.1:8000/api/health`.

### Start the frontend

From the directory containing `package.json`:

``` bash
npm run dev
```

Open the local URL printed by Vite, commonly `http://localhost:5173`.

Ensure the frontend API base URL points to the running backend and the
backend CORS configuration allows the frontend origin.

## API Overview

The following routes are documented for the application. Use the running
backend's `/docs` page as the source of truth for exact request/response
schemas and currently registered routes.

  ------------------------------------------------------------------------------------------------------
  Method                  Endpoint                                               Purpose
  ----------------------- ------------------------------------------------------ -----------------------
  `POST`                  `/api/auth/signup`                                     Register a user

  `POST`                  `/api/auth/login`                                      Authenticate a user and
                                                                                 receive a JWT

  `POST`                  `/api/auth/forgot-password`                            Password update/reset
                                                                                 flow provided by the
                                                                                 backend

  `GET`                   `/api/auth/me`                                         Retrieve the
                                                                                 authenticated user's
                                                                                 profile

  `DELETE`                `/api/auth/delete-account`                             Delete the
                                                                                 authenticated user's
                                                                                 account after password
                                                                                 verification

  `GET`                   `/api/social-accounts`                                 Retrieve connected
                                                                                 social accounts

  `DELETE`                `/api/social-accounts/{account_id}`                    Disconnect a social
                                                                                 account owned by the
                                                                                 authenticated user

  `GET`                   `/api/oauth/youtube/start`                             Begin YouTube OAuth

  `GET`                   `/api/oauth/youtube/callback`                          Complete YouTube OAuth

  `GET`                   `/api/oauth/spotify/start`                             Begin Spotify OAuth

  `GET`                   `/api/oauth/spotify/callback`                          Complete Spotify OAuth

  `GET`                   `/api/analytics/overview`                              Retrieve available
                                                                                 overview and content
                                                                                 metrics

  `GET`                   `/api/analytics/compare`                               Compare selected posts

  `GET`                   `/api/analytics/audience`                              Retrieve available
                                                                                 audience-growth data

  `GET`                   `/api/analytics/revenue`                               Retrieve revenue-data
                                                                                 availability

  `DELETE`                `/api/workspace/creator-assignments/{assignment_id}`   End an approved
                                                                                 creator--workspace
                                                                                 relationship when
                                                                                 requested by an
                                                                                 authorized party
  ------------------------------------------------------------------------------------------------------

## Data and Integration Notes

-   Dashboard values depend on records and metrics available to the
    signed-in user.
-   YouTube metrics depend on successful OAuth authorization, API
    access, granted scopes, and successful content synchronization.
-   A creator's connected account data is not automatically visible to
    an Agency or Marketing workspace. The creator must approve the
    workspace's access request.
-   If a creator or workspace ends an approved relationship, that
    workspace should no longer have access through that relationship.
-   Removing a creator from a workspace does not delete the creator's
    account or personal data.
-   Campaign, budget, brand-deal, and revenue figures require
    corresponding records and data sources. A zero value can mean that
    no applicable records have been added.
-   Spotify currently provides account/profile authorization only;
    streaming and song-performance analytics are not implemented.

## Security

-   Never commit `.env` files, OAuth client secrets, database passwords,
    JWT secrets, or access/refresh tokens.
-   Add environment files and virtual environments to `.gitignore`.
-   Never place a provider client secret in a `VITE_` frontend variable.
-   Use a long, unique JWT secret outside local development.
-   Rotate credentials immediately if they are accidentally exposed.
-   Use HTTPS and provider-approved redirect URLs in production.
-   Enforce permissions in the backend; hiding a frontend button is not
    sufficient access control.
-   Test account deletion and relationship removal with test accounts
    and a database backup.
-   Use the minimum OAuth scopes required by the application.

## Troubleshooting

### Backend does not start

-   Confirm the virtual environment is activated.
-   Install the required dependencies.
-   Run `uvicorn app:app --reload` from the directory containing
    `app.py`.
-   Review the first error in the terminal traceback.

### Database connection error

-   Check that `DATABASE_URL` is present and correctly formatted.
-   Confirm PostgreSQL is running and the target database exists.
-   Verify database username, password, host, port, and database name.
-   For SQLite, confirm the working directory because relative database
    paths depend on it.

### Google sign-in says the client ID is not configured

-   Add `VITE_GOOGLE_CLIENT_ID` to the frontend `.env`.
-   Use the OAuth client ID, not the client secret.
-   Add the frontend origin to the Google OAuth client's authorized
    JavaScript origins.
-   Restart Vite after editing `.env`.

### YouTube or Spotify OAuth callback fails

-   Check the client ID and secret in the backend `.env`.
-   Ensure the redirect URI exactly matches the provider dashboard.
-   Verify required APIs, scopes, consent-screen settings, and test-user
    access.
-   Restart the backend after changing environment variables.

### Creator analytics do not appear for Agency or Marketing

-   Confirm the creator connected the relevant social account.
-   Confirm content synchronization completed.
-   Confirm the workspace requested access.
-   Confirm the Creator approved the request.
-   If the relationship is approved but metrics remain unavailable,
    inspect the backend response and database records.

### Frontend cannot reach the backend

-   Confirm both development servers are running.
-   Check the frontend API base URL.
-   Confirm backend CORS allows the frontend origin.
-   Inspect the browser console and backend terminal for request errors.

## Future Enhancements

-   Further role-specific workflows and reporting.
-   More complete campaign, brand-deal, and revenue data management.
-   Additional platform integrations subject to provider APIs and
    permissions.
-   Expanded audience and content analytics where supported by source
    platforms.
-   A verified, expiring email-based password-reset flow.
-   Automated tests for authentication, role permissions, OAuth,
    synchronization, and workspace access lifecycle.
-   Database migrations, production logging, monitoring, and deployment
    configuration.

## Disclaimer

CreatorHub is an independent project and is not affiliated with,
endorsed by, or officially connected to Google, YouTube, Spotify, Meta,
or LinkedIn. Third-party API access, available metrics, and provider
requirements are controlled by the respective platforms and may change.
