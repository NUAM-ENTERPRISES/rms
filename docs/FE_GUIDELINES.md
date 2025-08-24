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

## 1) Architecture & Folder Structure (Hybrid: Atomic + Feature-first)

```
/src
  /app               # App root: store, providers, router, theme
  /features          # Domain modules (auth, projects, candidates, etc.)
    /auth
      slice.ts
      api.ts         # RTK Query endpoints for this domain
      index.ts
      views/         # domain-specific screens (optional)
    /projects
    /candidates
  /components        # Pure reusable UI
    /ui              # ShadCN base components (wrapped if needed)
    /atoms           # Button, Input, Label, Icon...
    /molecules       # FormRow, SearchBar, Toolbar...
    /organisms       # CandidateForm, ProjectTable...
    index.ts
  /pages             # Top-level routed views (compose organisms)
  /services          # Cross-domain RTK Query APIs (if shared)
  /hooks             # Reusable hooks (usePagination, useDisclosure)
  /utils             # Pure helpers; no React imports
  /constants         # Enums, roles, route paths, z-indexes
  /types             # Global TS models
  /assets            # Logos, icons, images
```

**Rules**

- Pages **compose** organisms; **no business logic** inside pages/components.
- Barrel export `index.ts` in each folder.
- File names **kebab-case**, component names **PascalCase**.

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

- UI hooks: `useDisclosure`, `usePagination`, `useDebounce`.
- Domain hooks wrap RTK Query: `useProjects()`, `useCreateProject()`.

---

## 4) State & Data (Redux Toolkit + RTK Query)

- **Redux Toolkit** for app state (auth user, theme, feature flags).
- **RTK Query** is **mandatory** for all server data:

  - Use a **shared `baseQuery`** with **auto-refresh** on 401.
  - Use **tags** for cache invalidation.
  - **No** direct `fetch`/`axios` in any component or slice.

**Example: RTK baseQuery with re-auth (outline)**

```ts
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders,
});
export const baseQueryWithReauth: BaseQueryFn = async (args, api, extra) => {
  let result: any = await baseQuery(args, api, extra);
  if (result?.error?.status === 401) {
    const refresh = await baseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extra
    );
    if (refresh?.data) {
      // update token in store, retry original request
      result = await baseQuery(args, api, extra);
    }
  }
  return result;
};
```

**Example: RTK Query endpoints**

```ts
export const projectsApi = createApi({
  reducerPath: "projectsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Project"],
  endpoints: (b) => ({
    list: b.query<Project[], void>({
      query: () => "/projects",
      providesTags: ["Project"],
    }),
    create: b.mutation<Project, CreateProjectDto>({
      query: (body) => ({ url: "/projects", method: "POST", body }),
      invalidatesTags: ["Project"],
    }),
  }),
});
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

- [ ] Follows **FE_GUIDELINES.md**
- [ ] Uses Tailwind **tokens** (no hex/inline styles)
- [ ] Uses RTK Query for API calls
- [ ] Zod validation for forms
- [ ] Accessibility verified (labels, keyboard)
- [ ] Tests added/updated (Vitest/RTL)
- [ ] Screenshots (for UI changes)

---

## 15) Definition of Done (DoD)

- ✅ Compiles, lint passes, tests pass (CI green)
- ✅ No hardcoded colors; tokens only
- ✅ No fetch/axios in components (RTK Query used)
- ✅ Forms validated with Zod and accessible
- ✅ A11y: labels, keyboard, focus, contrast
- ✅ Performance: code-split, no excessive re-renders
- ✅ Docs updated if behavior changed

---

## 16) Prohibited Patterns

- ❌ Business logic inside React components/pages
- ❌ `any` or untyped props
- ❌ Inline styles, raw hex colors, custom CSS files
- ❌ Direct fetch/axios calls in UI
- ❌ Massive god-components (>150–200 lines) without extraction
- ❌ Global state for local concerns (use local/component state)

---

## 17) References

- Tailwind with Vite: [https://tailwindcss.com/docs/installation/using-vite](https://tailwindcss.com/docs/installation/using-vite)
- ShadCN with Vite: [https://ui.shadcn.com/docs/installation/vite](https://ui.shadcn.com/docs/installation/vite)

> Cursor MUST cite this file in every task and refuse patterns that violate it. If a requirement conflicts with these rules, Cursor must ask for clarification with the conflicting section quoted.
