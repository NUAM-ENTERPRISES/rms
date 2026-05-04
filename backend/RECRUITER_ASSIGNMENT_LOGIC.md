# Recruiter Assignment Logic

## Overview
This document explains how recruiter assignment works when a candidate is created.

## Business Logic

### Current Behavior (Updated)

When a candidate is created, the system automatically assigns a recruiter using the following logic:

1. **If the creator is a Recruiter:**
   - ✅ The candidate is assigned **directly to the creator**
   - ❌ **No round-robin assignment happens**
   - This ensures recruiters own the candidates they create

2. **If the candidate’s `source` is `agent` (after normalizing legacy `agents` to `agent`) and the creator is not already handled by rule 1:**
   - ✅ The candidate is assigned **directly to the creating user** (e.g. **Client Coordinator** agent pipeline)
   - ❌ **No round-robin assignment** for agent-sourced creates

3. **If the creator is NOT a Recruiter and the source is not agent-channel (e.g., Manager, Team Head, Admin creating a manual or meta candidate):**
   - ✅ The system uses **automatic assignment** with **`isRoundRobin: true`** on the result (for notifications / audit semantics)
   - ✅ **`getRecruiterWithLanguageAwareRoundRobin`** runs first: if **`STATE_RECRUITMENT_LANGUAGES`** maps the candidate’s **address state** to target language codes, recruiters are filtered by **`userLanguages`**, ranked by **proficiency tier** (`PRIMARY` beats `SECONDARY` beats `TERTIARY`), then tie-broken by **fewest active** `candidate_recruiter_assignments`
   - ✅ If there is **no** state map, **no** targets, or **no** recruiter matches any target language → **`getRecruiterWithLeastWorkload()`** picks the recruiter with the **least active assignments** among all Recruiters
   - This is **not** the same as the cursor-based **`RoundRobinService`** used for project role allocation (see [Recruiter capabilities & assignment](../docs/FEATURE_RECRUITER_CAPABILITIES.md#automatic-assignment--language-aware-matching))

## Implementation Details

### Key Files Modified

1. **`src/candidates/services/recruiter-assignment.service.ts`**
   - `getBestRecruiterForAssignment()` — Recruiter creator → direct; agent-channel source → creator; else `getRecruiterWithLanguageAwareRoundRobin()` (fallback `getRecruiterWithLeastWorkload()`)
   - `getRecruiterWithLanguageAwareRoundRobin()` — reads **`SystemConfig`** `STATE_RECRUITMENT_LANGUAGES`, candidate `addressState.code`, and recruiters’ **`userLanguages`** (see feature doc)
   - **`userCountryCoverages`** are **not** used in this service today

2. **`src/candidates/candidates.service.ts`**
   - `create()` method
   - Calls `assignRecruiterToCandidate()` after candidate creation
   - Includes enhanced logging for debugging

### Code Flow

```typescript
// Step 1: Candidate is created
const candidate = await this.prisma.candidate.create({ ... });

// Step 2: Assign recruiter
await this.recruiterAssignmentService.assignRecruiterToCandidate(
  candidate.id,
  userId, // The ID of the user creating the candidate
  'Automatic assignment on candidate creation',
);

// Step 3: Inside assignRecruiterToCandidate()
const recruiter = await this.getBestRecruiterForAssignment(
  candidateId,
  createdByUserId,
);

// Step 4: Inside getBestRecruiterForAssignment()
if (isRecruiter) {
  return { ..., isRoundRobin: false, directAssignmentKind: 'recruiter' };
} else if (candidate is agent-channel / agent-sourced) {
  return { ..., isRoundRobin: false, directAssignmentKind: 'agent_source' };
} else {
  const best = await this.getRecruiterWithLanguageAwareRoundRobin(candidateId);
  return { ...best, isRoundRobin: true };
  // getRecruiterWithLanguageAwareRoundRobin internally falls back to
  // getRecruiterWithLeastWorkload() when language targets are empty or unmatched
}
```

### Enhanced Logging

The system now includes detailed logs to help debug assignment issues:

```
Candidate {candidateId} created by {userName} ({email}). User roles: Recruiter, Team Lead
✅ Creator {userName} is a Recruiter - assigning candidate directly to them (skipping round-robin)
✅ Successfully assigned recruiter {recruiterName} ({email}) to candidate {candidateId}
```

Or for non-recruiters (automatic path):

```
Creator {userName} is NOT a Recruiter - using assignment (language-aware round-robin when configured)
Language-aware assignment: candidate=... lang=... recruiter=... tierScore=...
```
(or fallback: `Language-aware assignment: no recruiter matched targets=[...] — fallback workload` / workload-only log from `getRecruiterWithLeastWorkload`)

## Recruiter capabilities (languages & country coverage)

Language list and proficiency on each recruiter are maintained via Admin (**`PUT /users/:id/recruiter-capabilities`**) and stored in **`user_languages`**. They directly affect **`getRecruiterWithLanguageAwareRoundRobin`**. Country coverage rows (**`user_country_coverage`**) are stored for the same users but are **not** read by this assignment service yet.

**Canonical detail:** [../docs/FEATURE_RECRUITER_CAPABILITIES.md](../docs/FEATURE_RECRUITER_CAPABILITIES.md) (including `STATE_RECRUITMENT_LANGUAGES` behaviour).

**Tests:** `src/candidates/services/__tests__/recruiter-assignment.service.spec.ts` (`getRecruiterWithLanguageAwareRoundRobin`, round-robin vs direct flags).

## Testing

### Test Case 1: Recruiter Creates Candidate

**Given:**
- User has the "Recruiter" role
- User creates a new candidate

**Expected:**
- Candidate is assigned to the creating recruiter
- No round-robin assignment occurs
- Log shows: "Creator {name} is a Recruiter - assigning candidate directly to them"

### Test Case 2: Non-Recruiter Creates Candidate

**Given:**
- User does NOT have the "Recruiter" role (e.g., Manager, Team Head)
- User creates a new candidate (non-agent source)

**Expected:**
- System uses **`getRecruiterWithLanguageAwareRoundRobin`** (then least-workload fallback if needed); result has **`isRoundRobin: true`**
- Candidate is assigned to the selected recruiter
- Log shows language-aware assignment or fallback workload messaging (see service logs)

### Test Case 2b: Language-aware tie-break

**Given:**
- `STATE_RECRUITMENT_LANGUAGES` includes a language code for the candidate’s state
- Several recruiters have that language with different **`UserLanguage.proficiency`** values

**Expected:**
- A recruiter with **higher** tier (`PRIMARY` over `SECONDARY` over `TERTIARY`) is preferred
- Among equal tier, the recruiter with **fewer active assignments** is preferred (see unit tests)

### Test Case 3: Recruiter with Multiple Roles

**Given:**
- User has both "Recruiter" and "Team Lead" roles
- User creates a new candidate

**Expected:**
- Candidate is assigned to the creating user (because they have Recruiter role)
- No round-robin occurs
- System detects Recruiter role even if user has multiple roles

## Database Schema

### CandidateRecruiterAssignment Table

```prisma
model CandidateRecruiterAssignment {
  id           String    @id @default(cuid())
  candidateId  String
  recruiterId  String
  assignedBy   String
  assignedAt   DateTime  @default(now())
  isActive     Boolean   @default(true)
  unassignedAt DateTime?
  unassignedBy String?
  reason       String?
  
  candidate    Candidate @relation(fields: [candidateId], references: [id])
  recruiter    User      @relation("RecruiterAssignments", fields: [recruiterId], references: [id])
  assignedByUser User    @relation("AssignedBy", fields: [assignedBy], references: [id])
  unassignedByUser User? @relation("UnassignedBy", fields: [unassignedBy], references: [id])
}
```

### Key Fields

- **`isActive`**: Only one active assignment per candidate
- **`assignedBy`**: Tracks who assigned the recruiter (system user ID in auto-assignment)
- **`reason`**: "Automatic assignment on candidate creation"

## API Endpoints Affected

### POST `/api/v1/candidates`

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "countryCode": "+1",
  "mobileNumber": "5551234567",
  "email": "john.doe@example.com",
  "dateOfBirth": "1990-01-15",
  // ... other fields
}
```

**Behavior:**
- Automatically assigns recruiter based on creator's role
- Returns candidate with all relations including assignments

## Troubleshooting

### Issue: Round-robin still happening for recruiters

**Possible causes:**
1. User doesn't have "Recruiter" role in database
2. Role name mismatch (check exact spelling/case)
3. User has userRoles but role relation is not loaded

**Debug steps:**
1. Check logs for: "User roles: Recruiter, ..."
2. Verify user has Recruiter role in database:
   ```sql
   SELECT u.name, r.name as role_name
   FROM "User" u
   JOIN "UserRole" ur ON u.id = ur."userId"
   JOIN "Role" r ON ur."roleId" = r.id
   WHERE u.id = 'user-id-here';
   ```
3. Look for log: "Creator {name} is a Recruiter" vs "Creator {name} is NOT a Recruiter"

### Issue: No recruiter assigned

**Possible causes:**
1. No recruiters exist in the system
2. All recruiters are inactive
3. Database constraint issues

**Debug steps:**
1. Check if error log appears: "Failed to assign recruiter to candidate"
2. Verify recruiters exist:
   ```sql
   SELECT u.id, u.name, u.email
   FROM "User" u
   JOIN "UserRole" ur ON u.id = ur."userId"
   JOIN "Role" r ON ur."roleId" = r.id
   WHERE r.name = 'Recruiter';
   ```

## Future Enhancements

1. **Team-based assignment**: Assign recruiters from the same team as the candidate
2. **Country / sector coverage in assignment**: Use **`user_country_coverage`** (and sector scopes) when choosing recruiters, if product rules require it
3. **Manual override**: Allow admins to manually assign/reassign recruiters (where not already supported)
4. **Workload metrics**: More sophisticated workload calculation (active vs qualified vs working)
5. **Assignment history**: Track all assignment changes with audit trail

## Related Documentation

- [Recruiter capabilities & language-aware assignment](../docs/FEATURE_RECRUITER_CAPABILITIES.md)
- [Agent / recruiter assignment notes](./docs/AGENT_LOGIC.md)
- Candidate creation and other flows: see `src/candidates/candidates.service.ts` and Swagger
