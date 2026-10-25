# CreatorHub - Content Intelligence Platform

A role-based social media analytics dashboard designed to help creators
and teams connect social accounts, monitor content performance, and
explore audience growth from a centralized workspace.

> **Project status:** YouTube channel/video analytics and Spotify
> profile authorization are implemented in the current backend. Spotify
> is used for account/profile connection; Spotify streaming, playlist,
> and listening analytics are not currently implemented. Instagram and
> LinkedIn integrations require their own developer-app configuration
> and approved API permissions.

## Table of Contents

-   [Overview](#overview)
-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [Architecture](#architecture)
-   [Prerequisites](#prerequisites)
-   [Getting Started](#getting-started)
-   [Environment Configuration](#environment-configuration)
-   [Run the Application](#run-the-application)
-   [API Overview](#api-overview)
-   [Supported Integrations](#supported-integrations)
-   [Security Notes](#security-notes)
-   [Troubleshooting](#troubleshooting)
-   [Future Improvements](#future-improvements)

## Overview

CreatorHub brings social account management and content insights into
one interface. Users can register and sign in, choose a role, connect
supported platforms, and view the analytics available through the
configured integrations.

The application is being developed as a **Content Intelligence Platform
for Social Media Performance and Creator Growth Analytics**.

## Features

### Authentication and user accounts

-   User registration and login.
-   Role-based accounts: Creator, Agency, Marketing, and Admin.
-   Password hashing on the backend.
-   JWT-based authentication for protected API routes.
-   Password update endpoint.
-   Account deletion with password confirmation.

### Dashboard and analytics

-   Overview of available channel and content metrics.
-   Post/video performance listing and comparison.
-   Audience-growth history where snapshots are available.
-   Audience and revenue sections with availability messages where data
    is not exposed or not implemented by the current integration.

### Social account management

-   View connected social accounts and their connection status.
-   Connect a YouTube channel using Google OAuth.
-   Authorize a Spotify account and retrieve its profile information.
-   Open a connected public profile where a profile URL is available.
-   Disconnect a connected social account.

### YouTube integration

-   Retrieves channel profile and statistics using the YouTube Data API.
-   Synchronizes available video details and engagement counts.
-   Stores retrieved posts and daily analytics in the database.
-   Uses the YouTube Analytics API for historical reports when the
    account's permissions and API access allow it.

### Spotify integration

-   Uses Spotify OAuth to authorize a Spotify account.
-   Retrieves the authorized user's Spotify profile.
-   Stores the account connection in the database.
-   **Note:** authorization does not provide streaming counts,
    song-performance analytics, or listening history in this version.

## Technology Stack

  -----------------------------------------------------------------------
  Layer                               Technologies
  ----------------------------------- -----------------------------------
  Frontend                            React, Vite, JavaScript, Recharts,
                                      Lucide React

  Backend                             Python, FastAPI, Pydantic

  Database                            PostgreSQL for deployment; SQLite
                                      supported for local development

  ORM                                 SQLAlchemy

  Authentication                      JWT, password hashing with `pwdlib`

  Integrations                        YouTube Data API, YouTube Analytics
                                      API, Spotify Web API/OAuth

  Development server                  Uvicorn
  -----------------------------------------------------------------------

## Architecture

``` text
React + Vite frontend
        |
        | HTTP requests / Bearer JWT
        v
FastAPI backend
        |
        +---- Authentication and user management
        |
        +---- Social account management
        |
        +---- YouTube OAuth and analytics APIs
        |
        +---- Spotify OAuth and profile API
        |
        v
SQLAlchemy ORM
        |
        +---- PostgreSQL (deployment)
        +---- SQLite (local development)
```

## Prerequisites

Install the following before running the project:

-   Node.js and npm.
-   Python 3.10 or later (use a version compatible with your installed
    dependencies).
-   Git.
-   PostgreSQL for a PostgreSQL-backed environment, or SQLite for local
    development.
-   Google Cloud credentials with the required YouTube APIs and OAuth
    configuration to use YouTube integration.
-   A Spotify Developer application to use Spotify account
    authorization.

## Getting Started

### 1. Clone the repository

``` bash
git clone https://github.com/springboardmentor5432x/Creator-Analytics-Content-Performance-Dashboard.git
cd Creator-Analytics-Content-Performance-Dashboard
```

If your local folder or branch has a different name, use the folder and
branch configured for your workspace.

### 2. Set up the backend

From the project root, enter the backend directory (adjust the path if
your `app.py` is located elsewhere):

``` bash
cd backend
```

Create and activate a virtual environment.

**Windows PowerShell**

``` powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux**

``` bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the backend dependencies:

``` bash
pip install fastapi "uvicorn[standard]" sqlalchemy psycopg2-binary python-dotenv PyJWT requests "pydantic[email]" pwdlib
```

If the project contains a maintained `requirements.txt`, prefer
installing from it:

``` bash
pip install -r requirements.txt
```

Create a `.env` file in the backend directory and configure the
variables described below.

### 3. Set up the frontend

Open a second terminal and enter the frontend directory (the directory
containing `package.json`):

``` bash
cd frontend
npm install
```

If the frontend is in the repository root rather than a `frontend`
directory, run `npm install` from the directory containing
`package.json`.

## Environment Configuration

Create `backend/.env` and provide the values relevant to your setup:

``` env
# Database
DATABASE_URL=sqlite:///./creatorhub_dev.db
# Example PostgreSQL URL:
# DATABASE_URL=postgresql+psycopg2://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME

# Authentication — replace this with a long, random secret
JWT_SECRET_KEY=replace_with_a_long_random_secret
JWT_EXPIRE_MINUTES=10080

# Frontend and backend URLs
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

### OAuth setup

**Google / YouTube** 1. Create or select a project in Google Cloud
Console. 2. Enable the required YouTube APIs. 3. Configure the OAuth
consent screen and add test users if the application is in testing mode.
4. Create OAuth client credentials. 5. Add the exact callback URL
configured in `GOOGLE_REDIRECT_URI` to the authorized redirect URIs.

**Spotify** 1. Create an application in the Spotify Developer Dashboard.
2. Copy its client ID and client secret into `.env`. 3. Add the exact
callback URL configured in `SPOTIFY_REDIRECT_URI` to the application's
Redirect URIs. 4. Restart the backend after changing environment
variables.

OAuth providers may change their access policies, scopes, and
development-mode restrictions. Confirm the currently required
configuration in each provider's developer documentation.

## Run the Application

### Start the backend

From the directory containing `app.py`:

``` bash
uvicorn app:app --reload
```

The API should be available at:

-   API base: `http://127.0.0.1:8000`
-   Interactive API documentation: `http://127.0.0.1:8000/docs`
-   Health check: `http://127.0.0.1:8000/api/health`

### Start the frontend

From the directory containing the frontend `package.json`:

``` bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Make sure the frontend API configuration points to the backend URL. The
frontend and backend origins must also be allowed by the backend's CORS
configuration.

## API Overview

The following routes are available in the current backend. All routes
marked **Protected** require a valid Bearer JWT.

  -------------------------------------------------------------------------------------------
  Method            Endpoint                              Access            Purpose
  ----------------- ------------------------------------- ----------------- -----------------
  `GET`             `/api/health`                         Public            Backend health
                                                                            and configuration
                                                                            status

  `POST`            `/api/auth/signup`                    Public            Register a user

  `POST`            `/api/auth/login`                     Public            Sign in and
                                                                            receive a JWT

  `POST`            `/api/auth/forgot-password`           Public            Update a password
                                                                            using the current
                                                                            reset flow

  `GET`             `/api/auth/me`                        Protected         Return the
                                                                            signed-in user's
                                                                            profile

  `DELETE`          `/api/auth/delete-account`            Protected         Delete the
                                                                            signed-in user's
                                                                            account after
                                                                            password
                                                                            verification

  `GET`             `/api/social-accounts`                Protected         List connected
                                                                            and available
                                                                            social accounts

  `DELETE`          `/api/social-accounts/{account_id}`   Protected         Disconnect a
                                                                            social account
                                                                            owned by the
                                                                            signed-in user

  `GET`             `/api/oauth/youtube/start`            Protected         Begin YouTube
                                                                            OAuth

  `GET`             `/api/oauth/youtube/callback`         OAuth callback    Complete YouTube
                                                                            authorization

  `GET`             `/api/oauth/spotify/start`            Protected         Begin Spotify
                                                                            OAuth

  `GET`             `/api/oauth/spotify/callback`         OAuth callback    Complete Spotify
                                                                            authorization

  `GET`             `/api/oauth/{provider}/start`         Protected         Return setup
                                                                            guidance for
                                                                            providers not
                                                                            enabled for OAuth

  `GET`             `/api/analytics/overview`             Protected         Fetch overview
                                                                            metrics and
                                                                            available post
                                                                            analytics

  `GET`             `/api/analytics/compare`              Protected         Compare selected
                                                                            posts

  `GET`             `/api/analytics/audience`             Protected         Retrieve
                                                                            available
                                                                            audience-growth
                                                                            data

  `GET`             `/api/analytics/revenue`              Protected         Report
                                                                            revenue-data
                                                                            availability
  -------------------------------------------------------------------------------------------

For exact request and response schemas, use the interactive
documentation at `/docs`.

## Supported Integrations

  -----------------------------------------------------------------------
  Platform                Current capability      Limitations
  ----------------------- ----------------------- -----------------------
  YouTube                 OAuth, channel          Results depend on
                          information, video      granted scopes, API
                          details and available   access, and provider
                          analytics               limits

  Spotify                 OAuth and authorized    Streaming,
                          public profile          listening-history, and
                          information             song-performance
                                                  analytics are not
                                                  implemented

  Instagram               Listed as a potential   Requires Meta developer
                          integration             setup, an eligible
                                                  account, and approved
                                                  permissions

  LinkedIn                Listed as a potential   Requires LinkedIn
                          integration             developer setup and
                                                  approved
                                                  products/permissions
  -----------------------------------------------------------------------

## Security Notes

-   Never commit `.env`, OAuth client secrets, database passwords, JWT
    secrets, or access/refresh tokens to source control.
-   Use a strong, unique `JWT_SECRET_KEY`; do not use the development
    fallback in production.
-   Rotate any credential that has been exposed in a repository, log,
    screenshot, or shared file.
-   Use HTTPS and provider-approved redirect URLs in production.
-   The current password-reset endpoint accepts a new password directly.
    Before production use, replace it with a verified, expiring
    password-reset flow.
-   Review account-deletion and disconnect behavior with a backup
    database before testing against real user data.
-   Apply least-privilege OAuth scopes and follow each provider's
    developer policies.

## Troubleshooting

### Backend will not start

-   Confirm your virtual environment is activated.
-   Install the required packages.
-   Run `uvicorn app:app --reload` from the directory containing
    `app.py`.
-   Review the complete terminal traceback for the first error.

### Database connection fails

-   Confirm `DATABASE_URL` is correct.
-   Ensure PostgreSQL is running and the database exists when using
    PostgreSQL.
-   For local development, verify the working directory used for the
    SQLite database file.

### OAuth callback fails

-   Confirm the client ID and client secret are correct.
-   Check that the redirect URI in `.env` exactly matches the provider
    dashboard.
-   Confirm the required APIs, consent screen settings, scopes, and
    test-user access.
-   Restart the backend after changing `.env`.

### Frontend cannot reach the API

-   Confirm the backend is running at the expected address.
-   Check the frontend API base URL.
-   Confirm the frontend origin is included in the backend CORS
    configuration.

## Future Improvements

-   Add provider-specific analytics where APIs and permissions make the
    data available.
-   Implement Instagram and LinkedIn OAuth integrations.
-   Replace the demo-friendly password-reset endpoint with an
    email-based reset flow.
-   Add automated tests for authentication, OAuth callbacks, account
    disconnection, and account deletion.
-   Add production logging, monitoring, migrations, and deployment
    configuration.
-   Improve role-specific workflows and access control across Creator,
    Agency, Marketing, and Admin dashboards.

------------------------------------------------------------------------

## Disclaimer

CreatorHub is an independent project and is not affiliated with,
endorsed by, or officially connected to YouTube, Google, Spotify, Meta,
or LinkedIn. Availability of third-party API features is controlled by
each provider and may change.
