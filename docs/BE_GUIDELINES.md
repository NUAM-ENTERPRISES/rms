<!-- BE_GUIDELINES.md -->

# Backend Development Bible – Affiniks RMS (NestJS + PostgreSQL + Prisma)

This document is a **contract**. Every backend contributor or AI tool (Cursor) **MUST** follow these rules. They are aligned with production-ready standards at companies like **Stripe, Netflix, and DoorDash**, emphasizing **security, modularity, testability, observability, and performance**.

---

## 🧭 Golden Rules

- **NestJS modular monolith**: controllers → services → repositories → Prisma models.
- **Strict typing**: No `any`. DTOs + `class-validator` for all inputs.
- **Business logic belongs in services** (not controllers).
- **Auth**: JWT (15m) + Refresh (7d). Roles enforced via `@Roles()` + `RolesGuard`.
- **RBAC data** lives in DB (roles, permissions, user_roles).
- **Passwords**: hashed with Argon2.
- **Refresh tokens**: hashed with Argon2 before storing in DB (never store raw tokens).
- **Database**: Prisma schema + migrations. No hidden relations. No raw SQL unless justified.
- **Queues**: BullMQ with idempotent, retryable jobs.
- **API**: REST `/api/v1/...`, standardized responses, Swagger docs required.
- **Tests**: Jest, 80%+ coverage. Services/guards/controllers must be tested.
- **Deployment**: Dockerized, DigitalOcean (or equivalent), HTTPS, CORS, Helmet, rate limiting.
- **DoD**: CI green, lint/test pass, no TODOs, docs updated.

---

## 🧱 1. Project Structure & Architecture

Framework: **NestJS (TypeScript)**
Database: **PostgreSQL** ([docs](https://www.postgresql.org/docs/16/index.html))
ORM: **Prisma** ([docs](https://www.prisma.io/docs/postgres))
Queue: **BullMQ (Redis)**

### 📁 Folder Structure (Modular Monolith)

```
/src
  /auth                # Auth logic (JWT, refresh, guards)
  /users               # User CRUD, RBAC mapping
  /roles               # Role definitions, permissions
  /teams               # Team structures and assignments
  /clients             # Client data (hospitals, agencies, etc.)
  /projects            # Projects, role quotas, deadlines
  /candidates          # Candidate intake, allocation, status
  /documents           # Upload, verify, audit docs
  /interviews          # Scheduling, results, attendance
  /processing          # Post-selection workflows
  /notifications       # Queue and event-based alerts
  /analytics           # Dashboards and metrics
  /common              # Interceptors, guards, pipes, decorators
  /config              # Environment setup
  /jobs                # BullMQ processors
  /database            # Prisma schema, seeding, migrations
```

---

## ⚙️ 2. Module Rules

Each feature module **MUST** include:

- `controller.ts` → Thin, request handling only.
- `service.ts` → Core business logic.
- `module.ts` → NestJS DI wiring.
- `dto/*.ts` → `class-validator` input validation.
- `entities/*.ts` → Prisma-based entity models.
- Tests: unit/e2e under `__tests__`.

**Principles:**

- Follow SOLID.
- Dependency Injection for cross-module access.
- No circular dependencies.
- Never apply guards locally unless explicitly exempt from globals (rare).

---

## 🔐 3. Authentication & RBAC

- **Authentication Method**:

  - Primary: Mobile number + Password
  - Mobile number must be unique and stored separately from country code
  - Country code and mobile number are stored as separate fields for better normalization
  - Example: `countryCode: "+91"`, `mobileNumber: "9876543210"`

- **JWT + Refresh**:

  - Access: 15 mins
  - Refresh: 7 days, rotated on reuse

- Use `PassportStrategy` with `JwtStrategy`.

- `@Roles()` decorator + `RolesGuard` for RBAC.

- Roles & permissions stored in DB (`roles`, `permissions`, `user_roles`).

- Passwords: **Argon2**.

- Refresh tokens: **Argon2 hashed** before persisting (like passwords).

- **Global Guards**:

  - `JwtAuthGuard` → ensures request has valid token.
  - `PermissionsGuard` → enforces fine-grained role/permission checks.
  - Both registered in `AppModule` as `APP_GUARD`.

- **Public decorator**:

  - Endpoints that must bypass auth (`@Public()`) must be explicitly decorated.
  - Example:
    ```ts
    @Public()
    @Post('login')
    login(@Body() dto: LoginDto) { ... }
    ```

- **JWT + Refresh**:

  - Access: 15 mins
  - Refresh: 7 days, rotated on reuse
  - Stored as `httpOnly` secure cookies

- **Roles & Permissions**:

  - Stored in DB: (`roles`, `permissions`, `user_roles`)
  - Checked via `RbacUtil`
  - Permissions are string-based (`manage:users`, `read:projects`)

- **Passwords & Refresh Tokens**: hashed with Argon2.

- Account lockout after 5 failed logins.

- **Security Extras**:
  - Account lockout after 5 failed logins
  - Audit log all auth events

---

## 🧮 4. Database Design with Prisma

- Entities: `User`, `Role`, `Team`, `Client`, `Project`, `Candidate`, `RoleNeeded`, `CandidateProjectMap`.
- Relations must be explicit (`@relation`).
- Use Prisma migrations only; never alter DB manually.
- Enforce **soft deletes** where business needs audit (`deletedAt`).
- Add indexes for foreign keys and frequent filters.
- Maintain audit fields: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

---

## 🔁 5. Candidate Auto-Allocation Engine

- Dedicated `CandidateAllocationService`.
- Trigger: candidate creation (manual or Meta webhook).
- Filters: role, min experience, deadline, availability.
- Writes to `candidate_project_map`.
- Async processing supported (BullMQ job).
- Recruiters notified via NotificationService.

---

## 🧵 6. Background Jobs (BullMQ)

- Jobs: Meta sync, notifications, processing pipeline.

- **Rules**:

  - Idempotent (safe re-run).
  - Retries with exponential backoff.
  - Log every outcome.
  - Alert on repeated failure (Sentry/Logtail).

- Jobs live in `/jobs/<feature>.processor.ts`.

---

## 📡 7. API Design & Versioning

- Prefix: `/api/v1/...`
- Controllers return:

```ts
{
  success: boolean;
  data?: any;
  message?: string;
}
```

- Responses standardized
- DTO validation **required** for every input.
- Swagger decorators for all controllers.
- Use pagination for list endpoints (limit/offset or cursor).
- Use consistent naming (`createdAt`, `updatedAt`).
- **Public endpoints explicitly decorated with `@Public()`**

---

## 🧪 8. Testing Strategy

- **Jest**:

  - Unit tests for services, DTOs, guards.
  - Integration tests for controllers.

- Coverage: **80% minimum**.

- Mock external APIs (Meta, Twilio) with `nock` or MSW.

- CI must fail if coverage < 80%.

---

## 🧼 9. Clean Code & Standards

- ESLint + Prettier enforced (husky pre-commit).
- Strict TypeScript: `strict: true`.
- No business logic in controllers.
- Services < 300 lines; split if larger.
- Private helpers for repeated logic.
- Use enums/consts instead of magic strings.

---

## 📊 10. Analytics

- Aggregations via Prisma or SQL views.
- Cache expensive queries in Redis.
- Expose under `/api/v1/analytics/...`.
- Enforce RBAC filtering (e.g., recruiter vs manager).
- Collect basic metrics: API latency, queue throughput.

---

## 📈 11. Observability & Logging

- Use NestJS interceptors for request logging.
- Structured logs (JSON) with correlation IDs.
- Log levels: error, warn, info, debug.
- Sentry integration for error tracking.
- Uptime monitoring (Uptime Kuma).
- Metrics: Prometheus + Grafana (optional phase 2).

---

## 🚀 12. Deployment Rules

- Containerized with Docker.

- `.env.[env]` for configs.

- Deploy to DigitalOcean (Droplet or App Platform).

- Security:

  - HTTPS everywhere.
  - CORS enabled.
  - Helmet middleware.
  - Rate limiting (100/min per IP).
  - DB connections over SSL.

- Use migrations in CI/CD pipeline.

---

## 13) Git & PR Process

- Conventional commits (`feat(auth): ...`).
- PR template checklist:

  - [ ] Follows **BE_GUIDELINES.md**
  - [ ] DTO + validation present
  - [ ] No logic in controller
  - [ ] Tests added/updated (coverage 80%+)
  - [ ] Swagger docs updated

---

## 14) Definition of Done (DoD)

- ✅ Code compiles, tests/lint pass
- ✅ 80%+ coverage
- ✅ No TODOs left
- ✅ Swagger updated
- ✅ **Global guards enforced**
- ✅ Public endpoints decorated with `@Public()`
- ✅ RBAC enforced at endpoint level
- ✅ Docs updated if changes affect flows

---

## 15) Prohibited Patterns

- ❌ Raw SQL (unless architect-approved)
- ❌ Business logic in controllers
- ❌ Inline queries in routes
- ❌ `any` or untyped inputs
- ❌ Circular dependencies
- ❌ Silent errors (must log/throw)
- ❌ Forgetting `@Public()` on endpoints that must be open
- ❌ Adding `@UseGuards` manually on feature controllers (unless architect-approved exception)

---

This document serves as the **Backend Development Bible**. **Cursor or any developer must not ignore these rules under any circumstance.** If a requirement conflicts with these rules, escalate to the lead architect with the conflicting section quoted.
