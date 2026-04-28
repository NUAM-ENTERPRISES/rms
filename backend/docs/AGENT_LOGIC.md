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

## 3. Source Normalization (Constants)

Sources are managed via a central constant to ensure consistency across the application.

**Path**: `backend/src/common/constants/candidate-constants.ts` & `web/src/constants/candidate-constants.ts`

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

## 5. UI/UX Workflow

### Agents Page (Admins/Managers Only)
- A new sidebar item "Agents" leads to a management dashboard.
- Admins can create, edit, or deactivate Agents.

### Candidate Creation
1. **Source Dropdown**: Fetches labels from the `CANDIDATE_SOURCES` constant.
2. **Conditional Agent Selection**: If "Agent" is selected as the source, a "Select Agent" searchable dropdown appears (fetching data from the `Agent` table).
3. **Submission**: The candidate is saved with `source: "agent"` and the specific `agentId`.

## 6. Implementation Phases

1. **DB**: Apply Prisma migration and generate client.
2. **BE**: Create `AgentModule` (CRUD) and update `CandidatesService` visibility filters.
3. **FE**: Build `Agents` feature folder and update `PersonalInformationStep` form logic.
4. **Migration**: Run a script to convert existing string sources to the new normalized IDs if necessary.
