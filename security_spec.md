# CreatorIQ Security Spec & Threat Model

## 1. Data Invariants
- Users can only read and write their own `/users/{userId}` profile, except admins who can manage all users.
- Role privilege escalation is blocked: users cannot change their own `role` field on update or self-assign `admin`.
- In strict mode, write operations require `request.auth.token.email_verified == true` for standard actions.
- An admin is identified via `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or bootstrapped admin email `sharshitha28007@gmail.com`.
- Creators can only create/update their own `/content/{contentId}` records (`creatorId == request.auth.uid`).
- Campaigns can be managed by admins, agencies, and marketing users, but unauthorized users cannot modify them.

## 2. Dirty Dozen Payloads (Rejection Matrix)
1. Unauthenticated write to `/users/{userId}` -> DENIED
2. User trying to write to someone else's `/users/{otherId}` -> DENIED
3. User attempting to self-escalate `role: "admin"` during update -> DENIED
4. Creator trying to create content with another user's `creatorId` -> DENIED
5. Unauthenticated read of PII from `/users/{userId}` -> DENIED
6. Non-admin attempting to create a record in `/admins/{uid}` -> DENIED
7. User with unverified email attempting write when verification is required -> DENIED
8. Ghost field injection on user update (e.g., `__escalated: true`) -> DENIED
9. Exceeding field length bounds in title / handle (> 128 chars) -> DENIED
10. Unauthenticated modification of `/systemSettings/global` -> DENIED
11. Content creation missing required fields (`title`, `platform`, `status`) -> DENIED
12. Random query scraping on all users without matching UID -> DENIED
