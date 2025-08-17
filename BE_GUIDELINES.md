<!-- BE_GUIDELINES.md -->

**Backend Development Bible – Affiniks RMS (NestJS + PostgreSQL + Prisma)**

This document outlines all architectural, structural, and implementation standards that **every backend developer or codegen tool like Cursor** MUST follow while working on the Affiniks Recruitment Management System backend.

These practices are aligned with production-ready setups used at companies like **Stripe, DoorDash, and Netflix**, emphasizing **security, modularity, testability, and performance**.

---

## 🧱 1. Project Structure & Architecture

Framework: **NestJS (TypeScript)**
Database: **PostgreSQL**
postgres doc for refrence : https://www.postgresql.org/docs/16/index.html
ORM: **Prisma** doc for refrence https://www.prisma.io/docs/postgres
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

- Each feature module (`/projects`, `/candidates`, etc.) must include:

  - `controller.ts`
  - `service.ts`
  - `module.ts`
  - `dto/*.ts` (input validation with `class-validator`)
  - `entities/*.ts` (Prisma-based modeling)
  - `e2e` or `unit` tests

- Follow SOLID principles for service design

- Avoid tight coupling between modules

- Use interfaces + dependency injection for cross-module access

---

## 🔐 3. Authentication & RBAC

- **JWT + Refresh token strategy**:

  - Access token lifespan: 15 mins
  - Refresh token lifespan: 7 days
  - Rotation with invalidation on reuse

- Use `@Roles()` decorator and `RolesGuard` for protected routes

- RBAC data must live in database (`roles`, `permissions`, `user_roles`)

- Passwords hashed with **Argon2**

---

## 🧮 4. Database Design with Prisma

- Use **Prisma schema** to model:

  - `User`, `Role`, `Team`, `Client`, `Project`, `Candidate`, etc.

- Run migrations through `prisma migrate`
- Never write raw SQL unless absolutely necessary
- All relations must be explicitly defined with referential integrity
- Enable strict mode (`strict=true`) in `tsconfig.json`

---

## 🔁 5. Candidate Auto-Allocation Engine

- Logic must live in a dedicated service: `CandidateAllocationService`

- Triggered via:

  - `candidates.service.ts` after creation
  - Optionally via background queue

- Fetch open roles from `roles_needed`

- Filter by:

  - Role match
  - Min experience
  - Deadline

- Write records to `candidate_project_map`

---

## 🧵 6. Background Jobs (BullMQ)

- Redis-backed queues for:

  - Meta API sync
  - Notifications (email, SMS, push)
  - Processing phase tasks

- Each job must:

  - Be idempotent
  - Log outcome
  - Retry on transient failure
  - Alert on repeated failure (via Sentry or logs)

---

## 📡 7. API Design & Versioning

- REST API only (`/api/v1/...`)
- All endpoints must:

  - Return standardized responses `{ success, data, message }`
  - Use DTOs for input validation
  - Be documented with Swagger decorators

Example controller:

```ts
@Post()
@Roles('admin')
@UseGuards(AuthGuard, RolesGuard)
create(@Body() dto: CreateProjectDto) {
  return this.projectService.create(dto);
}
```

---

## 🧪 8. Testing Strategy

- Use **Jest** for unit and integration tests
- Coverage requirement: minimum **80%**
- Mock external APIs (Meta, Twilio) with `nock` or custom mocks
- Run tests in CI (GitHub Actions)

Test coverage must include:

- Services
- Guards
- Controllers
- DTO validations

---

## 🧼 9. Clean Code & Standards

- ESLint, Prettier enforced via husky pre-commit hooks
- Avoid `any`; strict typing enforced
- No business logic in controllers
- No inline queries or code inside routes
- Split complex flows into smaller private service methods

---

## 📊 10. Analytics

- Use SQL views or Prisma aggregations
- Expose via `/api/v1/analytics/...`
- Cache costly reports in Redis
- Role-aware data visibility (recruiter vs manager vs director)

---

## 🚀 11. Deployment Rules

- Use **Docker** for containerization
- Environment configs via `.env.*`
- Deploy backend to **DigitalOcean** Droplets or App Platform
- Ensure:

  - HTTPS
  - CORS
  - Helmet headers
  - Rate limiting

---

Hard Rules (MUST FOLLOW)
• DO NOT bypass DTOs or validators
• DO NOT write business logic in controllers

This document serves as the foundation for the Affiniks RMS backend. **All backend logic, data modeling, authentication, and queue-based operations must follow these rules** to ensure security, consistency, and scalability.

No AI-generated or manual code is allowed to deviate from this structure without architect approval.
