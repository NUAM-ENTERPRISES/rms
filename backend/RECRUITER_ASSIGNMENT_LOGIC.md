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

2. **If the creator is NOT a Recruiter (e.g., Manager, Team Head, Admin):**
   - ✅ The system uses **round-robin assignment** based on workload
   - ✅ The recruiter with the **least number of active candidates** is assigned
   - This ensures fair workload distribution

## Implementation Details

### Key Files Modified

1. **`src/candidates/services/recruiter-assignment.service.ts`**
   - `getBestRecruiterForAssignment()` method
   - Checks if creator has the "Recruiter" role (case-insensitive)
   - Returns creator if they are a recruiter
   - Otherwise, calls `getRecruiterWithLeastWorkload()`

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
  // Return the creator as the recruiter
  return { id: creator.id, name: creator.name, email: creator.email };
} else {
  // Use round-robin (least workload)
  return await this.getRecruiterWithLeastWorkload();
}
```

### Enhanced Logging

The system now includes detailed logs to help debug assignment issues:

```
Candidate {candidateId} created by {userName} ({email}). User roles: Recruiter, Team Lead
✅ Creator {userName} is a Recruiter - assigning candidate directly to them (skipping round-robin)
✅ Successfully assigned recruiter {recruiterName} ({email}) to candidate {candidateId}
```

Or for non-recruiters:

```
Candidate {candidateId} created by {userName} ({email}). User roles: Manager
Creator {userName} is NOT a Recruiter - using round-robin assignment based on least workload
Assigned recruiter {recruiterName} with {count} active candidates
✅ Successfully assigned recruiter {recruiterName} ({email}) to candidate {candidateId}
```

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
- User creates a new candidate

**Expected:**
- System finds recruiter with least workload
- Candidate is assigned to that recruiter
- Log shows: "Creator {name} is NOT a Recruiter - using round-robin assignment"

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
2. **Skill-based matching**: Assign recruiters based on candidate's role/skills
3. **Manual override**: Allow admins to manually assign/reassign recruiters
4. **Workload metrics**: More sophisticated workload calculation (active vs qualified vs working)
5. **Assignment history**: Track all assignment changes with audit trail

## Related Documentation

- [Candidate Creation API](./CANDIDATE_API.md)
- [Role-Based Access Control](./RBAC.md)
- [Recruiter Management](./RECRUITER_MANAGEMENT.md)
