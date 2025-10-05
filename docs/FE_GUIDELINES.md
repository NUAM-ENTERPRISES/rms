<!-- FE_GUIDELINES.md -->

# Frontend Development Bible – Affiniks RMS (React + Vite + Tailwind + ShadCN + Redux Toolkit)

This document is a **contract**. Every contributor and AI tool (Cursor) **MUST** follow these rules. They are curated to match practices used by top engineering orgs (Apple/Stripe-level quality): **maintainability, scalability, accessibility, performance, and security**.

---

## 🧭 Golden Rules

- **Atomic + Feature-first**: UI is atomic; domain logic lives in features.
- **Theme tokens only**: **Do not hardcode colors** or sizes. Use Tailwind tokens (from `tailwind.config.ts`) or CSS variables.
- **RTK Query only** for server data. **No fetch/axios in components**.
- **Strict TypeScript**. **No `any`**. Prefer discriminated unions/generics.
- **Accessibility** (WCAG AA): semantic HTML, labels, keyboard support.
- **Tests & Lint pass** = merge. Husky blocks non-compliant commits.

---

## 1) Architecture & Folder Structure (Domain-Driven Design + Clean Architecture)

```
/src
  /app                       # App configuration & infrastructure
    /api
      baseApi.ts            # RTK Query core (single source of truth)
      types/                # API plumbing types (ApiResponse, Pagination)
    store.ts                # Redux store configuration
    router/                 # Route configuration
    providers/              # Context providers

  /entities                 # Shared domain models & business rules (no I/O)
    /candidate
      model.ts              # Canonical domain types & interfaces
      service.ts            # Pure business rules used across features
      constants.ts          # Domain-specific constants
    /project
      model.ts
      service.ts
      constants.ts
    /team
    /client
    /document

  /features                 # Self-contained feature modules
    /candidates
      /data
        candidates.endpoints.ts  # baseApi.injectEndpoints(...)
        dto.ts                   # Wire types from server
        transforms.ts            # DTO <-> domain mapping
      /services                  # Feature-only pure logic (no fetch)
        candidates.service.ts
      /hooks                     # Feature-specific UI logic
        useCandidateForm.ts
        useCandidateFilters.ts
      /components                # Feature UI components
        CandidateCard.tsx
        CandidateForm.tsx
      /views                     # Page components (composition only)
        CandidatesPage.tsx
        CreateCandidatePage.tsx
      /types                     # Feature-specific types
      /constants                 # Feature constants
      index.ts                   # Exports UI + hooks only (not data/services)
    /projects                    # Same structure
    /teams                       # Same structure
    /auth
      auth.slice.ts
      /data
        auth.endpoints.ts
      /hooks
      index.ts

  /processes                # Cross-domain orchestration (compose endpoints)
    /assignCandidateToProject
      useAssignCandidate.ts
    /documentVerification
      useDocumentWorkflow.ts

  /shared                   # Truly generic, no domain meaning
    /hooks                  # Cross-domain hooks
      usePermissions.ts
      useTeamsLookup.ts     # Minimal team data for dropdowns
      useClientsLookup.ts   # Minimal client data for dropdowns
    /utils                  # Pure utility functions
      date.ts
      format.ts
      validation.ts
    /types                  # Shared primitives (ID, Maybe, etc.)
      common.ts
    /components             # Truly reusable components
      DataTable.tsx
      SearchFilter.tsx

  /components               # Design system & layout (global)
    /ui                     # ShadCN base components
    /atoms                  # Basic UI elements
    /molecules              # Composite components
    /organisms              # Complex components
    /layout                 # Layout components
    index.ts

  /constants                # Global constants
  /lib                      # External lib configurations
  /assets                   # Static assets
```

**Rules**

- **Domain Separation**: Business logic in `/entities`, I/O in `/features/*/data`, UI in `/features/*/views`
- **No Cross-Feature Imports**: Features import from `/entities` and `/shared` only, never from other features
- **Single API Source**: All RTK Query endpoints use `baseApi.injectEndpoints()`
- **Pure Functions**: Services contain no I/O operations, only pure business logic
- **Composition Only**: Views compose components and hooks, contain no business logic
- **Decision Matrix**:
  - One screen, read-only → View
  - Reusable flow, multiple endpoints → `/processes` facade hook
  - Atomic consistency/permissions → Backend single endpoint
- Barrel export `index.ts` in each folder
- File names **kebab-case**, component names **PascalCase**
- Date format should be DD MMM YYYY

---

## 2) Design System & Theming (Tailwind + ShadCN)

- **Tailwind CSS only** (no CSS files/SCSS; no inline styles).
- **Base color**: **Zinc** (Apple-like light theme).
- **Light theme** by default. Respect `dark` class opt-in later.
- Use **ShadCN** components as base (Button, Dialog, Input, Select, Tooltip, Sheet, Table, Avatar, Badge, Alert, Form).

**Never hardcode** hex values in components. All styling must come from design tokens.

### Tailwind Tokens (example excerpt)

> Keep tokens in `tailwind.config.ts`. Cursor must reference these, not hex.

```ts
// tailwind.config.ts (excerpt)
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        muted: "hsl(var(--muted))",
        border: "hsl(var(--border))",
        danger: "hsl(var(--danger))",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.04)",
      },
    },
  },
};
```

```css
/* app.css (CSS variables for tokens; keep in one place) */
:root {
  --background: 220 14% 97%; /* zinc-50 */
  --foreground: 222 47% 11%; /* zinc-900 */
  --primary: 217 91% 60%; /* blue-500/600-ish */
  --primary-foreground: 0 0% 100%;
  --muted: 220 14% 96%; /* zinc-100 */
  --border: 220 14% 90%; /* zinc-200 */
  --danger: 0 84% 60%; /* red-500/600-ish */
}
```

---

## 3) Components (Atomic) & Hooks

- **Atoms**: Button, Input, Label, Icon, Badge.
- **Molecules**: FormRow, InputGroup, Toolbar, UserMenu.
- **Organisms**: CandidateForm, ProjectTable, ProjectForm, SidebarNav.

**Rules**

- Components are **pure** and **typed** (`React.FC<Props>`). No Redux inside atoms/molecules; pass data via **props**.
- Split components if >150 lines or mixed responsibilities.
- Use `React.memo` for heavy atoms/molecules; **no premature optimization**.
- Use `clsx` for conditional classes.

**Hooks**

- **Feature hooks**: UI logic specific to a feature (`useCandidateForm`, `useProjectFilters`).
- **Shared hooks**: Cross-domain UI logic (`usePermissions`, `useTeamsLookup`).
- **Process hooks**: Multi-endpoint orchestration (`useAssignCandidate`, `useDocumentWorkflow`).
- **Entity services**: Pure business logic, no I/O (`CandidateService.canNominate()`).

---

## 4) State & Data (Redux Toolkit + RTK Query with Injection Pattern)

- **Redux Toolkit** for app state (auth user, theme, feature flags).
- **Single baseApi** with **endpoint injection** pattern:

  - One `baseApi` in `/app/api/baseApi.ts` with **auto-refresh** on 401.
  - Features inject endpoints using `baseApi.injectEndpoints()`.
  - Use **tags** for cache invalidation.
  - **No** direct `fetch`/`axios` in any component or slice.

**Example: Base API setup**

```ts
// /app/api/baseApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result?.error?.status === 401) {
    const refreshResult = await baseQuery("/auth/refresh", api, extraOptions);
    if (refreshResult?.data) {
      api.dispatch(setAccessToken(refreshResult.data.accessToken));
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearCredentials());
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Candidate", "Project", "Team", "Client", "Document", "User"],
  endpoints: () => ({}),
});
```

**Example: Feature endpoint injection**

```ts
// /features/candidates/data/candidates.endpoints.ts
import { baseApi } from "@/app/api/baseApi";
import { CandidateDto, CreateCandidateDto } from "./dto";
import { CandidateTransforms } from "./transforms";

export const candidatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidates: builder.query<Candidate[], void>({
      query: () => "/candidates",
      transformResponse: (response: CandidateDto[]) =>
        response.map(CandidateTransforms.toDomain),
      providesTags: ["Candidate"],
    }),
    createCandidate: builder.mutation<Candidate, CreateCandidateDto>({
      query: (body) => ({
        url: "/candidates",
        method: "POST",
        body: CandidateTransforms.toDto(body),
      }),
      transformResponse: (response: CandidateDto) =>
        CandidateTransforms.toDomain(response),
      invalidatesTags: ["Candidate"],
    }),
  }),
});

export const { useGetCandidatesQuery, useCreateCandidateMutation } =
  candidatesApi;
```

---

## 5) Forms (React Hook Form + Zod)

- **Zod schemas** define validation; infer TS types from schema.
- Use **ShadCN form** primitives; keep error states accessible.
- Validate **all** user input (required, format, min/max, enums).

```ts
const schema = z.object({
  title: z.string().min(2, "Title is required"),
  deadline: z.string().datetime("Provide a valid date/time"),
});
```

---

## 6) Routing (React Router v6)

- Nested routes, **lazy-loaded** via `React.lazy` + `Suspense`.
- **Private routes** with role checks. Don’t rely on UI-only checks—server enforces too.
- No global state for trivial route-local UI.

---

## 7) Accessibility (WCAG AA)

- Semantic regions: `<main>`, `<header>`, `<nav>`, `<section>`.
- Inputs must have `<label>` or `aria-label`.
- Dialogs/sheets must be keyboard accessible (ShadCN/Radix handle this).
- Respect `prefers-reduced-motion`.
- Maintain **color contrast**; don’t rely on color alone to convey meaning.

---

## 8) Notifications (Sonner)

- Use **Sonner** for toasts.
- Install: `npm i sonner`
- Place `<Toaster position="top-right" closeButton richColors duration={3000} />` at root.
- Use `toast.success(...)`, `toast.error(...)`.

---

## 9) Error Handling & UX

- Show **meaningful** inline validation errors.
- Global error boundary per route tree.
- Network errors → consistent Sonner toast + inline contextual messaging.
- Use optimistic updates only with compensating rollbacks.

---

## 10) Performance

- Route-level code splitting; **no huge bundles**.
- Memoize heavy computations (`useMemo`) and handlers (`useCallback`) when needed.
- Virtualize large tables/lists (e.g., `@tanstack/react-virtual`).
- Avoid unnecessary re-renders (stable keys, component boundaries).

---

## 11) Security

- Access token in memory; do **not** store in localStorage if avoidable.
- Refresh token handled server-side; use RTK baseQuery to refresh.
- Never put secrets in client.
- Sanitize any HTML (avoid `dangerouslySetInnerHTML`).
- Respect backend CORS/CSP policies.

---

## 12) Testing (Vitest + React Testing Library)

- Test **critical flows**: auth, forms, role-guarded routes, RTK Query logic.
- Prefer **integration tests** for forms/pages; **unit tests** for atoms/molecules/hooks.
- Mock network with MSW where appropriate.
- Keep tests deterministic and fast.

---

## 13) Tooling & Quality Gates

- ESLint + Prettier + Husky + lint-staged.
- Enforce Tailwind correctness (`eslint-plugin-tailwindcss`).
- Block commits if lint/tests fail.
- Aliases in `tsconfig.json` + `vite.config.ts`.
- Conventional Commits for PR hygiene.

**ESLint constraints to enforce**

- Ban inline styles / hex colors in `.tsx` (custom rule or code mod).
- React hooks/exhaustive-deps enabled.
- No unused vars; no implicit `any`.

---

## 14) Git & PR Process

**Commit style:** Conventional Commits
Examples: `feat(auth): add login form`, `fix(projects): correct deadline parsing`

**PR Template Checklist**

- [ ] Follows **FE_GUIDELINES.md** architecture (entities/features/processes/shared)
- [ ] No cross-feature imports (features only import from entities/shared)
- [ ] Uses `baseApi.injectEndpoints()` for all API calls
- [ ] Business logic in entity services, not in views
- [ ] Views are composition-only (no business logic)
- [ ] Uses Tailwind **tokens** (no hex/inline styles)
- [ ] Zod validation for forms
- [ ] Accessibility verified (labels, keyboard)
- [ ] Tests added/updated (Vitest/RTL)
- [ ] Screenshots (for UI changes)

---

## 15) Definition of Done (DoD)

- ✅ **Architecture compliance**: Follows domain separation (entities/features/processes/shared)
- ✅ **No cross-dependencies**: Features only import from entities/shared, never other features
- ✅ **Single API source**: All endpoints use `baseApi.injectEndpoints()`
- ✅ **Pure business logic**: Entity services contain no I/O operations
- ✅ **Composition-only views**: No business logic in view components
- ✅ Compiles, lint passes, tests pass (CI green)
- ✅ No hardcoded colors; tokens only
- ✅ Forms validated with Zod and accessible
- ✅ A11y: labels, keyboard, focus, contrast
- ✅ Performance: code-split, no excessive re-renders
- ✅ Docs updated if behavior changed

---

## 16) Prohibited Patterns

- ❌ **Cross-feature imports**: Features importing from other features directly
- ❌ **Business logic in views**: Views should only compose components and hooks
- ❌ **I/O in entity services**: Entity services must be pure functions only
- ❌ **Multiple APIs**: Only one `baseApi`, all endpoints must use injection
- ❌ **Direct API calls in components**: Use feature hooks that wrap endpoints
- ❌ `any` or untyped props
- ❌ Inline styles, raw hex colors, custom CSS files
- ❌ Direct fetch/axios calls in UI
- ❌ Massive god-components (>150–200 lines) without extraction
- ❌ Global state for local concerns (use local/component state)

---

## 17) References

- Tailwind with Vite: [https://tailwindcss.com/docs/installation/using-vite](https://tailwindcss.com/docs/installation/using-vite)
- ShadCN with Vite: [https://ui.shadcn.com/docs/installation/vite](https://ui.shadcn.com/docs/installation/vite)

18. Authorization & Permissions (RBAC in UI)

Principle: Backend is the source of truth. The UI must reflect permissions for clarity, but every sensitive action is still re-checked by the API.

18.1 Canonical APIs (must use)
• useCan(required: string | string[]) => boolean
Centralized permission check. Reads auth.user.permissions from Redux.
• <Can allOf?: string[]; anyOf?: string[]; fallback?: ReactNode>
Declarative wrapper for conditional rendering.
• <ProtectedRoute roles?: string[]; permissions?: string[]>
Route guard. Blocks while auth status is loading; redirects to /login?next=… if unauthenticated; denies with toast + redirect if insufficient authorization.

❌ Prohibited: inline checks like if (user.role === 'Manager') ... or if (user.permissions.includes('...')) sprinkled in components.
✅ Required: use useCan or <Can>.

18.2 Where to apply
• Routes: All protected pages MUST be wrapped in <ProtectedRoute>.
• Navigation: Sidebar/top-nav items MUST declare required permissions in their config and be filtered via useCan.
• Actions/Buttons: Wrap in <Can allOf={[\"perm:xyz\"]}>…</Can> or disable with a Clear UI cue.
• Fields: Sensitive fields (e.g., salary, PII) must be masked in UI if the user lacks read:sensitive_fields. The API must also omit/deny those fields.

18.3 Contract with Backend
• The /auth/refresh response SHOULD include:

{
"success": true,
"data": {
"accessToken": "<...>",
"user": {
"id": "...",
"email": "...",
"roles": ["Manager"],
"permissions": ["read:candidates", "write:candidates"],
"teamIds": ["..."] // optional
},
"userVersion": "v123" // optional, bump on role/perm changes
}
}

    •	The frontend stores accessToken in memory (Redux). No localStorage for tokens.
    •	If user is missing in refresh, the app may call /me once to hydrate.

18.4 Definition of Done (Authorization)
• ✅ All protected routes use <ProtectedRoute> with roles/permissions as applicable
• ✅ Menus filtered by useCan; inaccessible items not rendered
• ✅ Actions/sections gated by <Can>; sensitive fields masked without permission
• ✅ No inline role/permission checks; all via useCan/<Can>
• ✅ Tests cover one guarded route (grant/deny) and at least one gated action

19. Import Aliases & Module Resolution (@/...)

Goal: eliminate brittle deep relative paths (../../../../components) and enforce consistent imports. All internal imports MUST use the @ alias.

19.1 Required configuration

tsconfig.json

{
...,
"compilerOptions": {
"baseUrl": ".",
"paths": {
"@/_": ["src/_"]
}
}
}

19.2 Definition of Done (Aliases)
• ✅ All internal imports use @/…
• ✅ No long relative import chains remain
• ✅ ESLint passes with alias resolver
• ✅ Vite dev/build works with alias

After configuring, update all imports to @/…. Cursor MUST use @/… for every internal module (hooks, components, features, utils, services).

> Cursor MUST cite this file in every task and refuse patterns that violate it. If a requirement conflicts with these rules, Cursor must ask for clarification with the conflicting section quoted.
