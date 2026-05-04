# Recruiter capabilities (languages & country coverage)

This document describes how **Recruiter** and **Manager** users can be assigned **spoken languages with proficiency** and **country coverage with sector scope**. The feature spans Admin user create/edit/detail flows, validation on the web app, and a dedicated replace-style API on the backend.

## Purpose

- Capture which languages a recruiting user speaks and how strong each language is (`PRIMARY`, `SECONDARY`, `TERTIARY`).
- Capture which countries they cover and, per country, whether scope includes **Healthcare**, **Non-healthcare**, or both.
- Feed **automatic primary-recruiter assignment** when non-recruiters create candidates: language list and **proficiency tier** are used for matching (see [Automatic assignment & language-aware matching](#automatic-assignment--language-aware-matching)).
- Store **country coverage** for admins and future use; it is **not** read by the current candidate creation assignment service (only `userLanguages` are).

## Who it applies to

| Layer | Rule |
| --- | --- |
| **UI** | The capabilities form appears when the selected role is **Recruiter** or **Manager**. See `web/src/features/admin/constants/recruiter-capability-roles.ts` (`ROLES_WITH_RECRUITER_CAPABILITIES`). |
| **API (non-empty body)** | `PUT /users/:id/recruiter-capabilities` with at least one language or country row requires the user to currently have **Recruiter** or **Manager**; otherwise the API returns **400**. |
| **API (clear)** | An empty payload (`languages: []` and `countryCoverages: []`) **clears** stored rows for **any** user. Used when demoting a user or cleaning up data without blocking on role. |

## Data model (Prisma)

- **`UserLanguage`** (`user_languages`): one row per `(userId, languageCode)`, with `proficiency` enum `PRIMARY | SECONDARY | TERTIARY`. Languages reference the `Language` catalog (`code`, `name`, `isActive`).
- **`UserCountryCoverage`** (`user_country_coverage`): one row per `(userId, countryCode)`, with `sectorScopes` as an array of `HEALTHCARE` and/or `NON_HEALTH_CARE`. Countries reference the `Country` catalog.

Constraints:

- At most **one** `PRIMARY` language per user (enforced in service and mirrored in frontend Zod).
- **No duplicate** `languageCode` or `countryCode` per user.
- Each country row must have **at least one** sector scope; duplicates within `sectorScopes` are rejected on the API.

## API

### List active languages (catalog)

- **GET** `/users/languages`  
- **Permissions:** `read:users`, `manage:users`, or `write:users`.  
- **Response:** `{ success, data: [{ code, name }], message }`  
- Used by Admin to populate language dropdowns.

### Get user (includes capabilities)

- **GET** `/users/:id`  
- Returns `userLanguages` and `userCountryCoverages` with relations when included by the service (used on user detail and edit).

### Replace recruiter capabilities

- **PUT** `/users/:id/recruiter-capabilities`  
- **Permissions:** `manage:users`, `write:users`.  
- **Body:** `UpdateRecruiterCapabilitiesDto`

```json
{
  "languages": [
    { "languageCode": "en", "proficiency": "PRIMARY" }
  ],
  "countryCoverages": [
    { "countryCode": "SA", "sectorScopes": ["HEALTHCARE", "NON_HEALTH_CARE"] }
  ]
}
```

- **Semantics:** **Full replace** — existing `user_languages` and `user_country_coverage` rows for that user are deleted and recreated from the payload.
- **Empty arrays:** Clears all capability rows for that user (no role check).

**Typical 400 cases** (non-exhaustive):

- User not Recruiter/Manager when payload is non-empty.
- Duplicate `languageCode` or `countryCode`.
- More than one `PRIMARY` language.
- Invalid or inactive language/country codes.
- Duplicate values inside `sectorScopes`.

DTO definitions: `backend/src/users/dto/update-recruiter-capabilities.dto.ts`.  
Service logic: `backend/src/users/users.service.ts` (`updateRecruiterCapabilities`).

## Automatic assignment & language-aware matching

When a **candidate is created**, primary recruiter selection is handled by `RecruiterAssignmentService` (`backend/src/candidates/services/recruiter-assignment.service.ts`). Full branching (creator is Recruiter, agent-sourced pipeline, etc.) is documented in **[`backend/RECRUITER_ASSIGNMENT_LOGIC.md`](../backend/RECRUITER_ASSIGNMENT_LOGIC.md)**.

This section summarizes how **recruiter capabilities** participate in the path that the product treats as **automatic / “round-robin style”** assignment (fair distribution among eligible recruiters).

### What counts as “round-robin” here

- **Not** the cursor-based **`RoundRobinService`** (`backend/src/round-robin/round-robin.service.ts`), which is used for **project / role allocation** (e.g. candidate-allocation) with an `allocationCursor`.
- **Instead**, for **candidate creation**, after direct-assignment rules are skipped, the service sets `isRoundRobin: true` and picks a recruiter via **`getRecruiterWithLanguageAwareRoundRobin`**, then **`getRecruiterWithLeastWorkload`** as fallback. This is **workload-skewed** fairness (fewest active assignments among tied candidates), not a rotating global index.

### Language-aware checks (uses `userLanguages` only)

1. **Target languages** come from **`SystemConfig`** key **`STATE_RECRUITMENT_LANGUAGES`**: a JSON map from **candidate physical-address state code** (e.g. `KL`, `MH`) to an ordered list of **ISO 639-1**-style language codes. Only codes that exist and are **active** in the `languages` table are kept. If the candidate has no state or the map has no entry, targets are empty.
2. If there are **no** target languages → **`getRecruiterWithLeastWorkload()`** among all users with the **Recruiter** role.
3. If there **are** targets, the service walks those language codes **in order**. For the first code that has at least one Recruiter with a matching **`UserLanguage`** row:
   - Among matches, compute a **tier score**: `PRIMARY` beats `SECONDARY` beats `TERTIARY` (scores 3 / 2 / 1 in code).
   - Keep recruiters with the **maximum** tier for that language.
   - **Tie-break:** smallest number of **active** `candidate_recruiter_assignments`.
   - Return that recruiter (see tests in `backend/src/candidates/services/__tests__/recruiter-assignment.service.spec.ts`, `getRecruiterWithLanguageAwareRoundRobin`).
4. If **no** target language matches any recruiter → fallback to **`getRecruiterWithLeastWorkload()`**.

**Implications for admins**

- Recruiters without the right **`userLanguages`** rows (or with weaker tiers than peers) are less likely to receive auto-assigned candidates when state-based targets are configured.
- **Exactly one `PRIMARY`** language per user keeps tier semantics predictable when multiple languages are listed for a state.
- **`userCountryCoverages`** are **not** consulted in this service today; maintaining them is still useful for reporting, UI, and future rules.

## Frontend (Admin)

### Pages

| Page | Behavior |
| --- | --- |
| **Create user** | After user creation, if the role is Recruiter or Manager, calls `updateRecruiterCapabilities` with form data (or skips when no capability data). |
| **Edit user** | Loads `userLanguages` / `userCountryCoverages` into the form; after profile update, always calls `updateRecruiterCapabilities` with current form rows or empty arrays when the role no longer qualifies (clears server data). |
| **User detail** | Shows language and country coverage badges when the user has Recruiter or Manager. |

### Shared UI

- **`RecruiterCapabilitiesFormCard`** (`web/src/features/admin/components/RecruiterCapabilitiesFormCard.tsx`):
  - **Languages:** Field array — add/remove rows; each row has language select and proficiency select.
  - **Countries:** **`MultiCountrySelect`** for multi-country pick; the selection is synced to the `recruiterCountryCoverages` field array via `replace`, preserving each country’s `sectorScopes` when the country remains selected. Per-country sector checkboxes (healthcare / non-healthcare) stay on separate cards.
- **Languages list:** RTK Query `useListUserLanguagesQuery` against `GET /users/languages`.

### Validation (Zod)

- **`web/src/features/admin/schemas/user-schemas.ts`**: `buildCreateUserSchema` / `buildUpdateUserSchema` accept a flag to enforce recruiter rows when the form is in “capabilities role” mode.
- Cross-row rules (when enabled):
  - Unique `languageCode` across rows; unique `countryCode` across rows.
  - At most one row with `PRIMARY` proficiency — issues are attached to extra rows’ `proficiency` path so errors show beside the correct control.
  - Country rows require at least one sector; unique sector values per row.

Tests: `web/src/features/admin/schemas/user-schemas.spec.ts`.

### API client types

- `UserWithRoles` optional `userLanguages` / `userCountryCoverages`: `web/src/features/admin/api.ts`.
- Mutation: `useUpdateRecruiterCapabilitiesMutation` → **PUT** `/users/:id/recruiter-capabilities`.

## Operational notes

- **Catalog data:** Languages must exist and be **active** in `languages`; countries must exist and be **active** in `countries`.
- **Swagger:** Operation descriptions live on `UsersController` for list languages and update recruiter capabilities.

## File index (quick reference)

| Area | Path |
| --- | --- |
| Prisma enums & models | `backend/prisma/schema.prisma` (`LanguageProficiency`, `RecruiterCountrySectorScope`, `UserLanguage`, `UserCountryCoverage`) |
| DTO | `backend/src/users/dto/update-recruiter-capabilities.dto.ts` |
| Service | `backend/src/users/users.service.ts` |
| Controller | `backend/src/users/users.controller.ts` |
| Role constant | `web/src/features/admin/constants/recruiter-capability-roles.ts` |
| Form card | `web/src/features/admin/components/RecruiterCapabilitiesFormCard.tsx` |
| Schemas | `web/src/features/admin/schemas/user-schemas.ts` |
| API slice | `web/src/features/admin/api.ts` |
| Assignment & language-aware RR | `backend/src/candidates/services/recruiter-assignment.service.ts` |
| Cursor-based RR (projects) | `backend/src/round-robin/round-robin.service.ts` |
| Assignment behaviour doc | [`backend/RECRUITER_ASSIGNMENT_LOGIC.md`](../backend/RECRUITER_ASSIGNMENT_LOGIC.md) |
