# RMS Role-Based Access Control (RBAC) System

This document provides a comprehensive overview of the Role-Based Access Control (RBAC) implementation in the RMS application across the Backend and Web platforms.

---

## 1. System Architecture

The RMS system uses a **Permission-First** approach. While roles exist to group users, authorization is primarily enforced through fine-grained permission keys.

### Core Concept
- **User**: Assigned one or more Roles.
- **Role**: A named collection of Permissions (e.g., `Recruiter`, `Manager`).
- **Permission**: A specific action key (e.g., `nominate:candidates`, `read:projects`).

---

## 2. Roles & Permissions

### Defined Roles (Seed Data)
Managed in [backend/prisma/seed.ts](backend/prisma/seed.ts), the primary roles include:

| Role | Responsibility |
| :--- | :--- |
| **CEO / Director / Manager** | Full system visibility and administrative control. |
| **Team Head / Team Lead** | Management of teams and candidate assignment flows. |
| **Recruiter** | Core candidate handling, document collection (`/recruiter-docs`). |
| **Documentation Executive** | Document verification and project-level overview. |
| **Processing Executive** | Post-selection workflows and department tasks. |
| **CRE** | Assigned candidate management (RNR flow). |

### Common Permission Keys
- **Global**: `*` (Full Admin), `manage:all`, `read:all`
- **User Management**: `read:users`, `manage:users`
- **Projects**: `read:projects`, `manage:projects`
- **Candidates**: `read:candidates`, `write:candidates`, `nominate:candidates`
- **Interviews**: `read:interviews`, `conduct:screenings`

---

## 3. Backend Implementation (NestJS)

### Decorators & Guards
- `@Roles('Admin', 'CEO')`: Role-level gating.
- `@Permissions('write:projects')`: Permission-level gating.
- **`RolesGuard`** & **`PermissionsGuard`**: Enforce these at the controller level.

### Wildcard Logic (`*`)
If a user's permission set includes `*`, all permission checks in the backend (via `RbacUtil`) return `true`.

---

## 4. Web Implementation (React)

### Protection Layers
1. **Routes**: [App.tsx](web/src/App.tsx) defines paths protected by [ProtectedRoute.tsx](web/src/app/router/protected-route.tsx).
2. **Navigation**: [useNav.ts](web/src/hooks/useNav.ts) filters [navigationConfig](web/src/config/nav.ts) based on active roles/permissions.
3. **UI Elements**: Declarative protection using the [<Can />](web/src/components/auth/Can.tsx) component.

### Example UI Protection
```tsx
<Can anyOf={['manage:users']} fallback={<AccessDenied />}>
  <CreateUserButton />
</Can>
```

---

## 5. Mobile Implementation (React Native)

The mobile app follows the same principles but uses React Native specific navigation and hooks.

### Core Hook
Managed in [app/src/hooks/useUserProfile.ts](app/src/hooks/useUserProfile.ts), it provides helper functions that support wildcards:
- `hasPermission(key)`: Returns true if user has specific permission OR `*` OR `manage:all`.
- `hasAnyPermission([keys])`: Returns true if ANY permission matches.
- `hasRole(name)`: Checks for role presence in `user.roles`.

### Navigation Layer
The [RoleBasedNavigator.tsx](app/src/navigation/RoleBasedNavigator.tsx) acts as the primary switchboard:
- Uses a hierarchy (CEO > Director > Manager...) to determine the initial stack.
- Maps roles to specialized tab sets: `CEOTabs`, `ManagerTabs`, or `RecruiterTabs`.

---

## 6. Security Flow

1. **Authentication**: User logs in; JWT is issued.
2. **Identification**: [JwtStrategy](backend/src/auth/strategies/jwt.strategy.ts#L29) fetches user details + roles + permissions on every request.
3. **Authorization**:
   - **Backend**: Guards block unauthorized API requests (e.g., [users.controller.ts](backend/src/users/users.controller.ts#L46)).
   - **Frontend**: Navigation is filtered and routes are blocked via Redux state.

---

## Relevant Files
- [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L87-L113) - DB Definitions
- [backend/src/auth/rbac/roles.guard.ts](backend/src/auth/rbac/roles.guard.ts) - Backend Role Guard
- [web/src/config/nav.ts](web/src/config/nav.ts) - Navigation Definitions
- [web/src/app/router/protected-route.tsx](web/src/app/router/protected-route.tsx) - Route Protection
