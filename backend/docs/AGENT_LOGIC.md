# Agent Feature & Source Normalization Logic

This document outlines the implementation details for the **Agent** feature and the normalization of candidate **Sources** within the Affiniks RMS.

## 1. Core Logic Overview

The system will transition from a simple string-based "source" to a hybrid approach:
- **Generic Sources**: (e.g., Meta, Referral, Manual) are defined as consistent constants in both backend and frontend.
- **Agents**: Are stored in a dedicated `Agent` database table to allow for detailed management and strict visibility rules.

## 2. Database Schema Changes (`schema.prisma`)

### New `Agent` Model
A dedicated table to store external partner information.
```prisma
model Agent {
  id           String      @id @default(cuid())
  name         String
  email        String?     @unique
  mobileNumber String?
  companyName  String?
  profileImage String?
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  candidates   Candidate[] @relation("AgentToCandidate")

  @@map("agents")
}
```

### Updated `Candidate` Model
Linking candidates to agents and indexing the source for visibility filters.
```prisma
model Candidate {
  // ... existing fields
  source    String  @default("manual") // ID from CANDIDATE_SOURCES constant
  agentId   String?
  agent     Agent?  @relation("AgentToCandidate", fields: [agentId], references: [id])

  @@index([source])
  @@index([agentId])
}
```

### `AgentProject` junction (agent’s client projects)

**Clients** own **`Project`** rows (`Project.clientId`). **Agents** are separate entities. The **`AgentProject`** table stores master data: *which client projects an external agent is engaged on* (briefing, contract, or supply channel). It does **not** include `candidateId`; candidates are tied to projects via **`CandidateProjects`** after nomination.

- **Table**: `agent_projects` (`AgentProject` in Prisma).
- **Fields**: `agentId`, `projectId`, optional `notes`, `isActive`, timestamps; unique on `(agentId, projectId)`.
- **API** (NestJS, under `AgentsController`): `GET /agents/:id/projects`, `POST /agents/:id/projects` (body `{ links: [{ projectId, notes? }] }`), `PATCH /agents/:id/projects/:projectId`, `DELETE /agents/:id/projects/:projectId`. Permissions align with `read:agents` / `edit:agents`.

### Nominations after create

**Candidate create** does not accept project nominations; coordinators nominate via the existing **`nominateCandidate`** (or equivalent) flow after the candidate exists. **`AgentProject`** still constrains which projects an agent is engaged on for other workflows (for example, agent detail **Client projects**).

## 3. Source Normalization (Constants)

Sources are managed via a central constant to ensure consistency across the application.

**Path**: `backend/src/common/constants/candidate-constants.ts` & `web/src/constants/candidate-constants.ts`

The canonical value for agent-originated pipeline is **`agent`** (not `agents`). Helpers `normalizeCandidateSource` and `isAgentCandidateSource` in the backend constants file treat legacy `agents` as `agent` where needed.

```typescript
export const CANDIDATE_SOURCES = [
  { id: 'manual', value: 'manual', label: 'Manual' },
  { id: 'meta', value: 'meta', label: 'Meta' },
  { id: 'agent', value: 'agent', label: 'Agent' },
  { id: 'referral', value: 'referral', label: 'Referral' },
  { id: 'direct_enquiry', value: 'direct_enquiry', label: 'Direct Enquiry' },
  { id: 'hospital_visit', value: 'hospital_visit', label: 'Hospital Visit' },
  { id: 'paid_ads', value: 'paid_ads', label: 'Paid Ads' },
  { id: 'expo_event', value: 'expo_event', label: 'Expo/Event' },
  { id: 'job_board', value: 'job_board', label: 'Job Board' },
  { id: 'social_media', value: 'social_media', label: 'Social Media' },
  { id: 'direct_application', value: 'direct_application', label: 'Direct Application' },
  { id: 'internal', value: 'internal', label: 'Internal' }
];
```

## 4. Privacy & Visibility Rules

The most critical requirement is that **Agent-sourced candidates must be hidden from non-leadership roles**.

### Visibility Logic
In `CandidatesService` (`findAll`, `findOne`, `search`):

```typescript
// Pseudocode for visibility filtering
const userRole = user.role;
const leadershipRoles = ['Admin', 'Manager', 'CEO', 'Director'];

const whereClause = {
  // ... other filters
};

if (!leadershipRoles.includes(userRole)) {
  // If user is not leadership, exclude all candidates with 'agent' source
  whereClause.NOT = {
    source: 'agent'
  };
}
```

**Implementation note:** The runtime allowlist lives in `canSeeAgentSourcedCandidates` (`backend/src/candidates/candidate-visibility.ts`) and includes leadership-style roles plus **`Client Coordinator`**.

## 5. Client Coordinator Pipeline

**Client Coordinators** manage external agents and candidates that enter through the agent channel.

### Creating candidates
1. **Source** is always **`agent`** for this role (the API enforces this in `CandidatesService.create`, and the create form defaults to Agent with the source control locked).
2. **`agentId` is required** — the candidate must be linked to a row in the `Agent` table.
3. On success, the row is stored with `source: 'agent'` and `agentId` set.
4. **Nominations** are done after create using the nominate endpoint (not in the create payload).

### Primary recruiter assignment (no round-robin)
When a candidate is created with **`source: 'agent'`**, automatic recruiter assignment **does not** use round-robin. The **creating user** becomes the primary assignee in `candidate_recruiter_assignments` (`recruiterId` = creator). This keeps “my” agent-sourced pipeline with the coordinator who registered the candidate.

Implementation: `RecruiterAssignmentService.getBestRecruiterForAssignment` checks candidate `source` after the “creator is Recruiter” rule. See `backend/RECRUITER_ASSIGNMENT_LOGIC.md` and `backend/src/candidates/services/recruiter-assignment.service.ts`.

### Other sources
Users who are not Recruiters and create candidates with **non-agent** sources (e.g. `manual`, `meta`) still get **round-robin** assignment to a Recruiter by workload. Meta lead flows continue to use `source: 'meta'` and are unchanged by the agent-source rule.

## 6. UI/UX Workflow

### Agents page
- Users with **Agent** permissions use the Agents area to manage partner records.
- **Total Candidates (Client Coordinator):** On the dashboard at `/agents`, the **Total Candidates** tile for a **Client Coordinator** shows the count of candidates **assigned to the logged-in user** with **`source: 'agent'`**, using the recruiter “my candidates” summary (assignment-based), not the sum of per-agent `_count.candidates` on each `Agent` row.
- For other roles on the same page, **Total Candidates** may still reflect aggregate candidate volume linked to Agent rows (`Candidate.agentId`), as before.

### Candidate creation (general)
1. **Source** is chosen from `CANDIDATE_SOURCES`.
2. If **Agent** is selected, a **Select Agent** control appears; **`agentId`** is submitted with the create payload.
3. **Submission**: The candidate is saved with `source: "agent"` and `agentId` (when applicable).

### Agent detail
- **Client projects** section: list linked projects, **Link projects** dialog (active projects not yet linked), and remove link (requires `edit:agents`).

## 7. Implementation Phases

1. **DB**: Apply Prisma migration and generate client (including `AgentProject`).
2. **BE**: Create `AgentModule` (CRUD), agent–project link endpoints, and update `CandidatesService` visibility filters and create/nominate workflow.
3. **FE**: Build `Agents` feature folder, agent detail **Client projects** UI, and wire agent selection on candidate create where required.
4. **Migration**: Run a script to convert existing string sources to the new normalized IDs if necessary (e.g. `agents` → `agent` where present in data).
