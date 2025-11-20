# Schema Refactoring Required

## Summary
The `CandidateProjectMap` model was renamed to `CandidateProjects` and the `status` field was removed and replaced with `currentProjectStatusId` (FK to CandidateProjectStatus table). This requires extensive refactoring across the codebase.

## Changes Made So Far

### ✅ Completed
1. **Model rename**: `candidateProjectMap` → `candidateProjects` in Prisma queries
2. **Count field**: `_count.candidateProjectMaps` → `_count.candidateProjects`  
3. **Type imports**: `CandidateProjectMap` → `CandidateProjects` in type files

### ❌ Remaining Issues

#### Files Requiring Manual Fixes

**1. src/candidates/candidates.service.ts** (16 errors)
- Remove `status` field from where clauses, use `currentProjectStatus.statusName` instead
- Remove fields: `nominatedBy`, `nominatedDate` (replaced with status history)
- Add `_count` and `userRoles` includes where needed
- Fix status transitions to use `currentProjectStatusId`

**2. src/candidate-matching/candidate-matching.service.ts**
- Remove `status` from where clauses
- Use `currentProjectStatus.statusName` for filtering

**3. src/documents/documents.service.ts**
- Remove `status` field references
- Update to use `currentProjectStatus` relation
- Fix type definitions to include `currentProjectStatus`

**4. src/projects/projects.service.ts**  
- Remove `status`, `nominatedBy`, `nominatedDate` fields
- Use `currentProjectStatusId` and relations
- Add proper includes for `_count` and `userRoles`

**5. src/candidates/services/candidate-assignment-validator.service.ts**
- Remove `status` from where clauses
- Add `_count` and `userRoles` includes

**6. src/jobs/notifications.processor.ts**
- Remove `nominatedBy` field references  

## Migration Path

### Option 1: Use the new CandidateProjectsService
The newly created `CandidateProjectsService` provides methods that work correctly with the new schema:
- `create()` - handles status history automatically
- `updateStatus()` - proper status updates with history
- `findAll()` - correct queries with relations

### Option 2: Manual Refactoring Pattern

For status queries, replace:
```typescript
// OLD
where: {
  status: 'nominated'
}

// NEW  
where: {
  currentProjectStatus: {
    statusName: 'nominated'
  }
}
```

For status updates:
```typescript
// OLD
await prisma.candidateProjects.update({
  data: { status: 'verified' }
})

// NEW
const status = await prisma.candidateProjectStatus.findFirst({
  where: { statusName: 'verified' }
});
await prisma.candidateProjects.update({
  data: { currentProjectStatusId: status.id }
});
// Also create history entry!
```

### Removed Fields
These fields no longer exist and should be removed:
- `status` (use `currentProjectStatusId` relation)
- `nominatedBy`, `nominatedDate`
- `approvedBy`, `approvedDate`  
- `rejectedBy`, `rejectedDate`, `rejectionReason`
- `documentsSubmittedDate`, `documentsVerifiedDate`
- `selectedDate`, `hiredDate`

All date tracking is now in `CandidateProjectStatusHistory`.

## Recommended Approach

1. **For new features**: Use the `CandidateProjectsService` 
2. **For existing features**: Gradually migrate to use the new service
3. **Status management**: Always use `updateStatus()` method to maintain history integrity

## Quick Fixes Script

```bash
# Find all status references
grep -r "\.status" src/ | grep -v "currentStatus" | grep -v "ProjectStatus"

# Find nominatedBy references  
grep -r "nominatedBy" src/

# Find status where clauses
grep -r "status: {" src/ | grep -v "currentStatus"
```
