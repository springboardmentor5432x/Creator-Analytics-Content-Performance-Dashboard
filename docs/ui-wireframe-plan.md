# CreatorIQ UI Wireframe & Dashboard Workflow Plan

This text wireframe records the Milestone 1 page hierarchy. The implemented responsive React UI is in `frontend/src/App.jsx` and `frontend/src/styles.css`.

## 1. Sign-in / registration

```text
+------------------------------------------------+-----------------------------+
| CreatorIQ brand                                | CreatorIQ Workspace         |
|                                                |                             |
| Your content has a story.                      | [ Welcome back              ]
| See the signal.                                | [ Email address             ]
|                                                | [ Password           Show   ]
| Performance preview illustration               | [ Sign in to workspace      ]
|                                                | New to CreatorIQ? Register  |
| Secure sign-in · Built for creators & teams    | Demo workspace details      |
+------------------------------------------------+-----------------------------+
```

**Workflow:** user chooses sign in or registration. Registration exposes Creator, Agency, and Marketing Team, then changes the profile/workspace name and focus-area labels to match the selected role. Administrator is not selectable on public signup; it is provisioned through local seeding or the admin-only user management screen.

## 2. Creator dashboard

```text
+----------------------+----------------------------------------------------------+
| CreatorIQ            | Workspace / Overview                     User · Sign out |
| Workspace switcher   +----------------------------------------------------------+
|                      | Welcome back, [first name]       [Refresh] [Connect*]   |
| WORKSPACE            | [Demo / no-data status banner]                           |
| > Overview           |                                                          |
|   Content analytics* | [Total followers] [Views 7d] [Engagement] [Revenue MTD]  |
|   Audience insights* |                                                          |
|   Growth & trends*   | [Performance trend chart] [Platform comparison chart]   |
|   Revenue*           |                                                          |
|   Reports*           | [Top-performing content table]                           |
|   Account settings   | Footer: CreatorIQ · Milestone 1 / demo dataset status    |
+----------------------+----------------------------------------------------------+
* Planned for a later milestone; not shown as live features.
```

**Workflow:** after token verification, load summary, trend, platforms, and top-content endpoints in parallel. Show loading skeletons while waiting, an error with retry on failure, zero/empty values for profiles without analytics, and a visible demo banner when sample account data is displayed.

## 3. Interaction and responsive rules

- Desktop: fixed left navigation, top utility bar, KPI row, paired chart cards, then the full-width content table.
- Mobile: navigation collapses behind a menu button; cards stack vertically; wide tables can scroll inside their own container.
- Authentication: show loading state while checking a stored token; clear local token and return to sign-in when the API responds `401`.
- Data integrity: dashboard endpoints require a valid token and query through the current user's creator profile, preventing one creator from reading another creator's metrics.
- Access control: non-administrators receive `403` for administrator account operations. Account settings allow users to update their name, role-specific profile/workspace details, and password after verifying the current password.

## Acceptance checks

- Login and registration forms submit to the real API.
- Empty/invalid authentication cannot open protected API routes.
- Dashboard visualizations are driven by API response data, not hard-coded chart values.
- Demo data is clearly distinguished from live platform data.
- Planned sidebar entries are labelled as future work rather than presented as completed features.
