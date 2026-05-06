# Login Session Tracking — Implementation Documentation

## Overview

This document explains how real-time login session tracking is implemented in the RMS system. Each user has their own isolated session history, and the currently-active session is correctly identified across page refreshes and token rotations.

---

## Problem This Solves

| Problem | Root Cause | Fix Applied |
|---|---|---|
| Sessions showed "Current: No" for every row | `rfi` cookie path-restricted to `/api/v1/auth`, never sent to `/users/*` | Embedded session ID (`sid`) in the JWT access token instead |
| Admin's sessions appeared in recruiter's profile | RTK Query cache was never cleared on logout | `baseApi.util.resetApiState()` called on every logout |
| `isCurrent` broke after page refresh (token rotation) | Session's `refreshTokenId` was stale after rotation | `rotate()` updates `refreshTokenId` on the session row and carries `sid` forward |

---

## Architecture

```
Login / OTP Verify
      │
      ▼
issueRefresh()          → creates RefreshToken row  (refresh_tokens table)
createSession()         → creates UserSession row   (user_sessions table)  ← returns session.id
issueAccess(sid)        → signs JWT with { sub, email, sid }
      │
      ▼
Browser stores:
  - Access Token  in memory (Authorization: Bearer ...)
  - rfi cookie    httpOnly, path=/api/v1/auth  (refresh token ID)
  - rft cookie    httpOnly, path=/api/v1/auth  (refresh token value)
      │
      ▼
Every API request  → JwtStrategy.validate() → req.user = { id, roles, permissions, sid }
      │
      ▼
GET /users/profile/sessions
  → reads req.user.id   (who is asking)
  → reads req.user.sid  (which session is current)
  → getUserSessions(userId, currentSessionId)
  → compares s.id === currentSessionId  → isCurrent: true/false
```

---

## Database Schema

### `user_sessions` table (Prisma model: `UserSession`)

| Column | Type | Description |
|---|---|---|
| `id` | `String` (CUID) | Primary key — also used as the session identifier in the JWT (`sid`) |
| `userId` | `String` | Foreign key to `users.id` — every query is scoped by this |
| `refreshTokenId` | `String?` | ID of the linked `RefreshToken` — updated on every token rotation |
| `ipAddress` | `String?` | Client IP (IPv6 loopback `::1` normalised to `127.0.0.1`) |
| `userAgent` | `String?` | Raw User-Agent header string |
| `browser` | `String?` | Parsed browser name (Chrome / Firefox / Safari / Edge / Opera) |
| `os` | `String?` | Parsed OS name (Windows / macOS / Linux / Android / iOS / iPadOS) |
| `deviceType` | `String?` | `desktop` / `mobile` / `tablet` |
| `loginAt` | `DateTime` | When the session was created (login time) |
| `isActive` | `Boolean` | `true` while session is alive; set to `false` on logout |

---

## Backend Implementation

### 1. Session Creation (`auth.service.ts`)

Called immediately after a successful login, OTP verification, or mobile login.

```typescript
// Order matters: refresh token first → session → access token with sid
const refresh    = await this.issueRefresh(user.id);
const sessionId  = await this.createSession(user.id, refresh.id, meta);
const accessToken = this.issueAccess({ id: user.id, email: user.email }, sessionId);
```

**`createSession()`** does:
1. Calls `parseUserAgent()` to extract browser, OS, deviceType from the User-Agent header
2. Calls `normalizeIp()` to convert `::1` → `127.0.0.1` and strip `::ffff:` prefix
3. Writes one row to `user_sessions`
4. Returns `session.id` so it can be embedded in the JWT

**`issueAccess()`** now accepts an optional `sessionId`:
```typescript
private issueAccess(user: { id: string; email: string }, sessionId?: string) {
  return this.jwtService.sign(
    { sub: user.id, email: user.email, ...(sessionId ? { sid: sessionId } : {}) },
    { secret: ..., expiresIn: ... },
  );
}
```

The resulting JWT payload looks like:
```json
{
  "sub": "user-cuid",
  "email": "user@example.com",
  "sid": "session-cuid",
  "iat": 1714000000,
  "exp": 1714003600
}
```

---

### 2. Session Survives Token Rotation (`auth.service.ts`)

When the browser silently refreshes tokens, the session row is kept alive by updating its `refreshTokenId` to point to the new refresh token. The `sid` (session ID) stays the same.

```typescript
// In rotate() and mobileRotate():
const next = await this.rotateInTx(row);                    // issue new refresh token

const session = await prisma.userSession.findFirst({
  where: { refreshTokenId: row.id, isActive: true },        // find session by OLD token
});
if (session) {
  await prisma.userSession.update({
    where: { id: session.id },
    data: { refreshTokenId: next.id },                      // point to NEW token
  });
}

const accessToken = this.issueAccess(
  { id: row.userId, email: row.user.email },
  session?.id,                                              // embed same sid
);
```

This means a session that started on Monday morning still shows "Current Session" after dozens of token rotations.

---

### 3. JWT Strategy Passes `sid` Through (`jwt.strategy.ts`)

The JWT strategy decodes the access token and sets `req.user` for every authenticated request. The `sid` claim is passed through:

```typescript
async validate(payload: any) {
  // ... fetch user, extract roles/permissions ...
  return {
    id: user.id,
    email: user.email,
    roles,
    permissions,
    sid: payload.sid ?? null,   // ← session ID from JWT claim
  };
}
```

Every controller can now read `req.user.sid` without touching cookies or making extra DB calls.

---

### 4. Session Deactivation on Logout (`auth.service.ts`)

```typescript
// In logout():
await prisma.userSession.updateMany({
  where: { userId },
  data: { isActive: false },
});

// In revokeFamilyByTokenId():
await prisma.userSession.updateMany({
  where: { refreshTokenId: rfi },
  data: { isActive: false },
});
```

---

### 5. Sessions API Endpoint (`users.controller.ts`)

```
GET /api/v1/users/profile/sessions
Authorization: Bearer <access_token>
```

```typescript
async getSessions(@Request() req) {
  const userId         = req.user.id;          // from JWT — always the authenticated user
  const currentSessionId = req.user.sid ?? undefined;  // from JWT — no cookie needed
  return this.usersService.getUserSessions(userId, currentSessionId);
}
```

**Security**: `req.user.id` comes from the JWT validated by `JwtAuthGuard` (applied globally). It is impossible for User A to receive User B's sessions — the `userId` filter is always enforced.

---

### 5a. IP Capture and `X-Forwarded-For`

During login, the system records the client IP address as part of session metadata. When requests pass through a proxy or load balancer, the original IP is forwarded in the `X-Forwarded-For` header.

The auth controller resolves the IP like this:

```ts
const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
```

That means:
- If `X-Forwarded-For` exists, the first value is treated as the original client IP.
- Otherwise, it falls back to `req.ip`.

This is important for accurate login session logging and auditing.

> Note: `X-Forwarded-For` should only be trusted when the request is received through a known, trusted proxy or load balancer.

---

### 6. Sessions Service (`users.service.ts`)

```typescript
async getUserSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.userSession.findMany({
    where: { userId },           // scoped to the requesting user
    orderBy: { loginAt: 'desc' },
    take: 20,                    // last 20 sessions
  });

  return sessions.map(s => ({
    id:          s.id,
    ipAddress:   s.ipAddress,
    browser:     s.browser,
    os:          s.os,
    deviceType:  s.deviceType,
    loginAt:     s.loginAt,
    isActive:    s.isActive,
    isCurrent:   currentSessionId ? s.id === currentSessionId : false,
  }));
}
```

---

## Frontend Implementation

### API Hook (`web/src/features/profile/api.ts`)

```typescript
export interface LoginSession {
  id: string;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  loginAt: string;
  isActive: boolean;
  isCurrent: boolean;
}

getSessions: builder.query<{ success: boolean; data: LoginSession[] }, void>({
  query: () => "/users/profile/sessions",
  providesTags: ["User"],
}),
```

### Profile Page (`web/src/features/profile/views/ProfilePage.tsx`)

```typescript
const { data: sessionsData, isLoading: sessionsLoading } = useGetSessionsQuery();
```

Sessions are rendered in a table with:
- Device icon (desktop / mobile / tablet)
- Browser + OS
- IP address (`127.0.0.1` displays as `localhost`)
- Login time (relative, e.g. "2 hours ago")
- **"Current Session"** badge when `isCurrent === true`
- Active / Inactive status badge

### Cache Isolation on Logout (both `UserMenu` components)

```typescript
const handleLogout = async () => {
  try {
    await logout();
    dispatch(clearCredentials());
    dispatch(baseApi.util.resetApiState());  // ← clears ALL cached RTK Query data
    navigate("/login");
  } catch {
    dispatch(clearCredentials());
    dispatch(baseApi.util.resetApiState());
    navigate("/login");
  }
};
```

`resetApiState()` ensures that when a different user logs in next, they never see stale cached data from the previous user.

---

## Data Flow Diagram

```
BROWSER                          BACKEND                         DATABASE
  │                                │                                │
  │── POST /auth/login ──────────►│                                │
  │                                │── issueRefresh() ────────────►│ refresh_tokens
  │                                │── createSession() ───────────►│ user_sessions  (returns sid)
  │                                │── issueAccess(sid) ──────────►│
  │◄── { accessToken(sid), rfi } ─│                                │
  │                                │                                │
  │── GET /users/profile/sessions ►│                                │
  │   Authorization: Bearer JWT    │ validate JWT → req.user.sid   │
  │                                │── getUserSessions(id, sid) ──►│ user_sessions WHERE userId=id
  │◄── [{ isCurrent: true, ... }]─│                                │
  │                                │                                │
  │── POST /auth/refresh ─────────►│                                │
  │   (rfi + rft cookies)          │── rotateInTx(old) ───────────►│ refresh_tokens (new row)
  │                                │── update session.refreshTokenId►│ user_sessions (same sid)
  │                                │── issueAccess(same sid) ──────►│
  │◄── { accessToken(same sid) } ─│                                │
  │                                │                                │
  │── POST /auth/logout ──────────►│                                │
  │                                │── userSession.updateMany ────►│ isActive: false
  │   dispatch(resetApiState())    │                                │
  │   (cache cleared client-side)  │                                │
```

---

## Files Changed

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Added `UserSession` model; added `sessions` relation on `User` |
| `backend/prisma/migrations/…add_user_sessions` | SQL migration creating `user_sessions` table |
| `backend/src/auth/auth.service.ts` | `createSession()` returns ID; `issueAccess()` accepts `sid`; `login`/`verifyOtp` reordered; `rotate`/`mobileRotate` carry `sid`; `logout`/`revoke` deactivate sessions |
| `backend/src/auth/auth.controller.ts` | `login`, `verifyOtp`, `mobileLogin` extract IP + User-Agent and pass as `meta` |
| `backend/src/auth/strategies/jwt.strategy.ts` | Returns `sid: payload.sid ?? null` from `validate()` |
| `backend/src/users/users.service.ts` | Added `getUserSessions(userId, currentSessionId)` |
| `backend/src/users/users.controller.ts` | Added `GET profile/sessions` using `req.user.sid` |
| `web/src/features/profile/api.ts` | Added `LoginSession` interface and `useGetSessionsQuery` hook |
| `web/src/features/profile/views/ProfilePage.tsx` | Replaced hardcoded table with real session data |
| `web/src/components/organisms/UserMenu.tsx` | `dispatch(baseApi.util.resetApiState())` on logout |
| `web/src/components/molecules/UserMenu.tsx` | Same |
