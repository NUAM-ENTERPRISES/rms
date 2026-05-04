# Document Repository (candidate Documents tab)

Short reference for the **Document Repository** experience on the candidate **Documents** tab: what the user sees, what it does, and where it lives in code.

For the **global** candidate profile score (personal fields + documents, list + detail header), see [CANDIDATE_PROFILE_IMPLEMENTATION.md](./CANDIDATE_PROFILE_IMPLEMENTATION.md).

---

## Purpose

Give recruiters a single place to **see mandatory document coverage**, **upload gaps**, and **browse all files** (view / download) for a candidate. The top of the tab answers: *“How much of the mandatory document set is present?”* and *“What’s still missing?”*

---

## UI layout (top to bottom)

### 1. Header card — “Document Repository”

| Element | Behavior |
|--------|----------|
| **Title** | “Document Repository” |
| **Subtitle** | “Manage and verify all candidate documentation” |
| **Syncing** | Shown while documents are loading or refetching (RTK Query). |

### 2. Completion strip — ring + “Completion Document Status”

| Element | Meaning |
|--------|---------|
| **Large ring + `%` + “Done”** | Percentage of **mandatory document types** satisfied for this candidate (see [Scoring](#scoring) below). Color shifts by band (e.g. higher completion tends toward green). |
| **Title** | “Completion Document Status” |
| **Summary line** | “X of Y mandatory documents…” — `Y` is the count of required types; `X` is how many types have at least one uploaded document. |
| **Badges** | **X Verified** / **Y Missing** — here “verified” means **type satisfied** (upload present), not necessarily workflow “Verified” on a row. |
| **Action Required** (side card) | If anything is missing: short explanation and **chips** listing each missing **display label** (e.g. Degree Certificate, Passport Size Photo). If complete: “All Set!” state. |

### 3. `DocumentUploadSection` — uploads + table

Roughly two blocks:

1. **Required documents status**  
   - Headings such as “Required Documents Status”, “Upload the missing files…”, and a **uploaded / missing** summary (e.g. `1/6 uploaded`, `5 missing`).  
   - For each **missing** mandatory type: label, “Mandatory document missing”, and an **Upload …** action (opens upload with that type preselected where supported).

2. **Uploaded documents**  
   - **“Upload New Document”** (general upload; user picks type in the form).  
   - **Table** of all documents for the candidate: file name, **Type** (e.g. Resume, `experience_letters`), **Status** (e.g. Pending, Verified), **Uploaded** timestamp, **Actions** (view, download, etc. as implemented).  
   - Optional **role** context for some rows (e.g. role-linked resume) when the API provides it.

Pagination appears at the bottom when the list spans more than one page.

---

## Scoring (this tab only)

Mandatory types and labels are defined in `web/src/features/candidates/profileCompletion.ts` in **`CANDIDATE_PROFILE_REQUIRED_DOCUMENTS`** and computed by **`getCandidateProfileCompletion(documents)`**.

- There are **six** mandatory document **slots** (e.g. Resume, Degree Certificate, Passport Size Photo, Passport Copy, Aadhaar Card, Registration Certificate — exact labels come from the config).  
- A type counts as **present** if the documents list includes a row whose `docType` normalizes to that type (including common aliases, e.g. `photo` → passport photo, `passport` → passport copy).  
- **Percent** = (satisfied types ÷ 6) × 100, rounded.  
- This is **independent** of the table’s per-file **verification** status (`pending` / `verified` / `rejected` on each document). The ring is about **coverage of required types**, not final compliance sign-off.

---

## Data and refresh

- Documents are loaded with **`useGetDocumentsQuery`** (RTK Query) in `CandidateDocuments.tsx` (paged) and reused in `DocumentUploadSection` (up to 100 rows when passed in, or it fetches its own).  
- After a successful upload, the parent **refetches** so the ring, missing list, and table stay in sync.

---

## Key files

| Area | File |
|------|------|
| Documents tab page | `web/src/features/candidates/components/tabs/CandidateDocuments.tsx` |
| Uploads + required list + table | `web/src/features/candidates/components/DocumentUploadSection.tsx` |
| Mandatory list + `getCandidateProfileCompletion` | `web/src/features/candidates/profileCompletion.ts` |
| Document type constants / display config | `web/src/constants/document-types.ts` |
| API types & document queries | `web/src/features/candidates/api.ts` |

---

## Related concepts

- **Header “Profile completion”** on the candidate detail page uses the **full** profile contract (personal + documents) when the API provides `profileCompletion`; see the implementation map doc.  
- **Document Repository** ring uses **document-only** rules above so the tab stays actionable even when comparing only files.
