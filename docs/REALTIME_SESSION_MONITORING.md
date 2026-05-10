# Real-Time Session Monitoring

## Overview

The session monitoring system gives admins a live view of who is online, idle, or on break. Updates are pushed via Socket.IO so the admin page reflects changes instantly — no manual refresh needed.

---

## Architecture

```
User Activity
     │
     ▼
useSessionActivityTracker (web hook)
  ├─ BroadcastChannel leader election (only 1 tab pings)
  ├─ Throttled: max 1 heartbeat per 5 minutes
     │
     ▼
PATCH /users/session/activity  ──►  UsersService.recordSessionActivity()
                                        │
                                        ├─ Updates lastActivityAt in DB
                                        └─ Emits session:updated → 'admins' room
                                                │
                                                ▼
                                    Admin browser (Socket.IO)
                                        │
                                        ▼
                                    RTK Query invalidates "AdminSessions" tag
                                        │
                                        ▼
                                    SessionsMonitoringPage re-renders
```

### Key design choices

| Concern | Solution |
|---|---|
| Avoid re-fetching unrelated pages | Dedicated `"AdminSessions"` RTK tag, isolated from `"User"` |
| Avoid flooding on rapid events | 400 ms debounce on `session:updated` socket handler |
| Avoid duplicate heartbeats (multi-tab) | `BroadcastChannel` leader election — only the leader tab sends pings |
| Catch drift (browser crash / sleep) | 60 s polling fallback on the admin page |
| Idle state is derived, not persisted | `isIdle = isActive && availability === ACTIVE && (now − lastActivityAt > threshold)` |

---

## Backend Components

### `NotificationsGateway` (`src/notifications/notifications.gateway.ts`)

- Namespace: `/notifications`
- On WebSocket connect: joins `user:{userId}` room, and if the user has an admin role (`CEO`, `Manager`, `System Admin`) also joins the **`admins`** room.
- `broadcastToAdmins(event, data)` — emits an event to every socket in the `admins` room.

```typescript
// Admin roles that receive session monitoring events
private static readonly ADMIN_ROLES = new Set([
  'CEO', 'Manager', 'System Admin',
]);
```

### `UsersService` (`src/users/users.service.ts`)

Emits `session:updated` after:
- `setSessionAvailability()` — user changes status (ACTIVE / BREAK / ON_CALL)
- `recordSessionActivity()` — heartbeat received _(only when transitioning from idle back to active)_

```typescript
this.notificationsGateway.broadcastToAdmins('session:updated', {
  type: 'availability_changed',
  userId,
  sessionId,
  availability,
}).catch(() => {});
```

### `AuthService` (`src/auth/auth.service.ts`)

Emits `session:updated` after:
- `createSession()` — user logs in → `type: 'session_created'`
- `logoutCurrentSession()` — user logs out → `type: 'session_ended'`

### `SessionCleanupService` (`src/users/session-cleanup.service.ts`)

Cron job that runs **every 10 minutes**:

| Task | Logic | Event emitted |
|---|---|---|
| Stale session cleanup | `isActive=true` AND `lastActivityAt < now − maxSessionDurationHours` → set `isActive=false` | `sessions_cleaned` |
| Break auto-reset | `availability=BREAK` AND `availabilityUpdatedAt < now − breakAutoResetMinutes` → set `availability=ACTIVE` | `break_reset` |

### `SystemConfigService` — `getSessionConfig()` (`src/system-config/system-config.service.ts`)

Reads config from the `SESSION_SETTINGS` DB key. Falls back to defaults if the key is absent.

| Config key | Default | Meaning |
|---|---|---|
| `activityThrottleMinutes` | 5 | Minimum gap between heartbeat pings |
| `idleThresholdMinutes` | 15 | Minutes without activity before a session is considered idle |
| `adminSessionPollingSeconds` | 60 | Polling interval on the admin monitoring page |
| `maxSessionDurationHours` | 24 | Sessions older than this are marked inactive by the cron |
| `breakAutoResetMinutes` | 30 | Break sessions are auto-reset to ACTIVE after this duration |
| `heartbeatEnabled` | `true` | Globally enable/disable heartbeat pings |
| `realtimeSessionUpdatesEnabled` | `true` | Globally enable/disable socket push events |

Config is seeded via `prisma/seeds/system-config.seed.ts` under the key `SESSION_SETTINGS`.

---

## Frontend Components

### `useSessionActivityTracker` (`src/hooks/useSessionActivityTracker.ts`)

Tracks mouse, keyboard, scroll, and touch events. Sends a heartbeat to the backend at most once every **5 minutes** (throttled). Uses `BroadcastChannel` leader election to ensure only one tab per browser pings the backend.

```
Leader tab  ──► sendPing() every 5 min
Follower tab ──► broadcasts activity event to leader via BroadcastChannel
                 Leader decides whether to ping on behalf of all tabs
```

Falls back to independent pinging if `BroadcastChannel` is not supported.

### `session-handler.ts` (`src/app/providers/notification-handlers/session-handler.ts`)

Handles incoming `session:updated` Socket.IO events and invalidates the RTK `"AdminSessions"` tag.

```typescript
export const handleSessionUpdated = (payload: SessionEventPayload, dispatch: AppDispatch) => {
  dispatch(baseApi.util.invalidateTags(["AdminSessions"]));
};
```

Event payload types:

| `type` | Trigger |
|---|---|
| `session_created` | User logs in |
| `session_ended` | User logs out |
| `availability_changed` | User changes status (ACTIVE / BREAK / ON_CALL) |
| `sessions_cleaned` | Cron marked stale sessions inactive |
| `break_reset` | Cron auto-reset expired breaks |

### `notifications-socket.provider.tsx`

Listens for `session:updated` with a **400 ms debounce** to batch rapid successive events (e.g. multiple sessions cleaned at once) into a single RTK invalidation.

### `SessionsMonitoringPage.tsx` (`src/features/admin/views/SessionsMonitoringPage.tsx`)

- **Polling**: `pollingInterval: 60_000`, `skipPollingIfUnfocused: true` — catches any drift missed by the socket push.
- **Focus/reconnect**: `refetchOnFocus: true`, `refetchOnReconnect: true`.
- **Last-seen cell**: displays relative time (`2 minutes ago`) with exact timestamp on hover.

### RTK Query Tags (`src/app/api/baseApi.ts` + `src/features/admin/api.ts`)

`"AdminSessions"` is a dedicated tag used only by `getAdminSessions` and `getAdminIdleSessionsSummary`. Invalidating it does **not** trigger refetches on Candidates, Documents, or any other page.

---

## Module Dependency Notes

Several NestJS modules form a circular chain when `NotificationsModule` is imported into `AuthModule`. All affected modules use `forwardRef()`:

| Module | forwardRef wraps |
|---|---|
| `SystemConfigModule` | `AuthModule` |
| `AuthModule` | `NotificationsModule` |
| `UsersModule` | `NotificationsModule` |
| `ProcessingModule` | `AuthModule`, `NotificationsModule` |

---

## Session Availability States

```
ACTIVE ──────────────────────────► BREAK
  ▲                                  │
  │ auto-reset after 30 min          │
  └──────────────────────────────────┘

ACTIVE ◄────── user/admin action ──► ON_CALL

Idle (derived, not stored):
  isIdle = isActive && availability === ACTIVE && (now − lastActivityAt > 15 min)
```

---

## Data Flow Summary

```
1. User logs in
   AuthService.createSession() → broadcastToAdmins('session:updated', { type: 'session_created' })

2. User is active (typing, clicking)
   useSessionActivityTracker → PATCH /users/session/activity (throttled 5 min)
   UsersService.recordSessionActivity() → updates lastActivityAt

3. User goes on break
   setSessionAvailability(BREAK) → broadcastToAdmins('session:updated', { type: 'availability_changed' })

4. Admin monitoring page
   Socket receives session:updated → 400ms debounce → invalidate "AdminSessions" tag
   RTK Query refetches → page updates

5. Break auto-reset (30 min)
   SessionCleanupService cron → availability = ACTIVE → broadcastToAdmins('session:updated', { type: 'break_reset' })

6. Stale session cleanup (every 10 min cron, 24h threshold)
   SessionCleanupService → isActive = false → broadcastToAdmins('session:updated', { type: 'sessions_cleaned' })

7. Polling fallback (60s, skipped when tab not focused)
   RTK Query pollingInterval → GET /admin/sessions (catches any drift)
```
