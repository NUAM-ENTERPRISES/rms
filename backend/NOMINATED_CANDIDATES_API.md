# Nominated Candidates API Documentation

## Overview
This document describes the implementation of the Nominated Candidates API endpoint that retrieves candidates who have been added to a specific project (present in the `candidate_projects` table) with match scoring, search, pagination, status filtering, and role-based access control.

**"Nominated" Definition**: A candidate is considered "nominated" for a project when they exist in the `candidate_projects` table with that project ID, regardless of their current status (nominated, pending documents, verification in progress, etc.).

## API Endpoint

### GET `/api/v1/projects/:id/nominated-candidates`

Retrieves all candidates added to a specific project with match scores and filtering options.

**Authentication**: Required (Bearer Token)
**Permissions**: `read:projects`

### URL Parameters
- `id` (string, required): Project ID

### Query Parameters
- `search` (string, optional): Search term for candidate name, email, or mobile number
- `statusId` (number, optional): Filter by project status ID
  - `1` = Nominated
  - `2` = Pending Documents
  - `3` = Documents Submitted
  - `4` = Verification In Progress
  - `5` = Documents Verified
  - `6` = Approved
  - `7` = Interview Scheduled
  - `8` = Interview Completed
  - `9` = Interview Passed
  - `10` = Selected
  - `11` = Processing
  - `12` = Hired
  - `13` = Rejected (Documents)
  - `14` = Rejected (Interview)
  - `15` = Rejected (Selection)
  - `16` = Withdrawn
  - `17` = On Hold
- `page` (number, optional, default: 1): Page number (1-based)
- `limit` (number, optional, default: 10): Items per page (max: 100)
- `sortBy` (string, optional, default: 'matchScore'): Sort field
  - `matchScore`: Sort by job match score
  - `createdAt`: Sort by nomination date
  - `firstName`: Sort by first name
  - `experience`: Sort by years of experience
- `sortOrder` (string, optional, default: 'desc'): Sort order ('asc' or 'desc')

### Response Format

```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "id": "candidate-project-map-id",
        "candidateId": "candidate-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "countryCode": "+91",
        "mobileNumber": "9876543210",
        "experience": 5.5,
        "skills": ["Nursing", "Emergency Care", "Patient Care"],
        "expectedSalary": 50000,
        "matchScore": 85,
        "currentStatusId": 1,
        "currentStatus": {
          "id": 1,
          "statusName": "active"
        },
        "project": {
          "id": "proj-123",
          "title": "Night Shift Nurses",
          "description": "Nursing staff for night shift at Hospital",
          "status": "active",
          "deadline": null,
          "priority": "medium",
          "countryCode": "US",
          "projectType": "private",
          "resumeEditable": true,
          "groomingRequired": "formal",
          "hideContactInfo": false,
          "clientId": "client-123",
          "createdBy": "user-123",
          "teamId": null,
          "createdAt": "2025-10-01T12:00:00.000Z",
          "updatedAt": "2025-10-01T12:00:00.000Z"
          ,
          "rolesNeeded": [
            {
              "id": "role-123",
              "projectId": "proj-123",
              "designation": "Night Shift Nurse",
              "quantity": 5,
              "minExperience": 2,
              "maxExperience": 6,
              "skills": ["Patient care", "IV administration"],
              "requiredSkills": ["Nursing"],
              "candidateStates": [],
              "candidateReligions": [],
              "requiredCertifications": [],
              "salaryRange": { "min": 30000, "max": 50000 }
            }
          ]
        },
        "qualifications": [
          {
            "id": "qual-uuid",
            "name": "Bachelor of Science in Nursing",
            "shortName": "BSc Nursing",
            "level": "Bachelor",
            "field": "Nursing"
          }
        ],
        "recruiter": {
          "id": "recruiter-uuid",
          "name": "Jane Smith",
          "email": "jane.smith@example.com"
        },
        "nominatedAt": "2025-11-19T10:30:00.000Z",
        "assignedAt": "2025-11-19T10:30:00.000Z",
        "notes": "Strong candidate with relevant experience"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  },
  "message": "Nominated candidates retrieved successfully"
}
```

## Role-Based Access Control

### Recruiter Role
- **Restriction**: Recruiters can only see candidates they have personally nominated
- **Filter**: `recruiterId = userId`
- **Use Case**: Allows recruiters to track their own nominations

### Manager/CEO/Director Roles
- **Access**: Full access to all nominated candidates in the project
- **Filter**: No recruiter filter applied
- **Use Case**: Allows management to oversee all nominations across recruiters

## Match Score Calculation

The match score (0-100) is calculated based on:

1. **Experience Match** (40% weight)
   - Candidate's experience within project's required range
   - Uses `totalExperience` field (auto-calculated from work history)

2. **Skills Match** (30% weight)
   - Overlap between candidate skills and project role skills
   - Case-insensitive partial matching

3. **Qualification Match** (30% weight)
   - Candidate qualifications match project education requirements
   - Checks qualification level and field alignment

## Implementation Details

### Service Layer
**File**: `src/projects/projects.service.ts`

**Method**: `getNominatedCandidates(projectId, userId, userRoles, query)`

**Key Features**:
- Returns all candidates in `candidate_projects` table for the project (any status)
- Optional filtering by `statusId` query parameter
- Role-based filtering for recruiters
- Search across firstName, lastName, email, mobileNumber
- Pagination with total count
- Match score calculation for each candidate
- Sorting by multiple fields

### Controller Layer
**File**: `src/projects/projects.controller.ts`

**Endpoint**: `GET /:id/nominated-candidates`

**DTO**: `QueryNominatedCandidatesDto`
- Validates query parameters
- Enforces limits (page >= 1, limit <= 100)
- Default values for optional fields
- Optional `statusId` filter

## Example Usage

### Get all candidates added to the project (any status)
```bash
GET /api/v1/projects/proj-123/nominated-candidates
```

### Get only candidates in "Nominated" status (status ID 1)
```bash
GET /api/v1/projects/proj-123/nominated-candidates?statusId=1
```

### Get candidates in "Verification In Progress" status (status ID 4)
```bash
GET /api/v1/projects/proj-123/nominated-candidates?statusId=4
```

### Search for candidates named "John" with pagination
```bash
GET /api/v1/projects/proj-123/nominated-candidates?search=john&page=1&limit=20
```

### Get candidates in interview stage (status ID 7) sorted by match score
```bash
GET /api/v1/projects/proj-123/nominated-candidates?statusId=7&sortBy=matchScore&sortOrder=desc
```

### Sort by experience in ascending order
```bash
GET /api/v1/projects/proj-123/nominated-candidates?sortBy=experience&sortOrder=asc
```

### Get recent nominations (by date)
```bash
GET /api/v1/projects/proj-123/nominated-candidates?sortBy=createdAt&sortOrder=desc
```

## Database Schema

### Key Tables
- `candidate_projects`: Junction table storing all project-candidate associations
  - `projectId`: Links to projects table
  - `candidateId`: Links to candidates table
  - `currentProjectStatusId`: Current status in the project workflow (1-17)
  - `recruiterId`: Tracks which recruiter added the candidate
  - `assignedAt`: Timestamp when candidate was added to project
  - `createdAt`: Initial nomination timestamp
  
- `candidate_project_status`: Status definitions (17 statuses)
  - ID 1: "nominated" - Initial status when candidate added
  - ID 2-11: Various workflow stages (documents, approval, interview, etc.)
  - ID 12: "hired" - Terminal success status
  - ID 13-16: Rejection statuses - Terminal failure statuses
  - ID 17: "on_hold" - Temporary pause status

### Includes in Query
- Candidate data with qualifications
- Current candidate status (global status, not project-specific)
- Project details (full `project` object for the nominated assignment)
- Assigned recruiter details

## Testing

### Test Cases
1. **Get all project candidates regardless of status**
   - Call endpoint without statusId parameter
   - Verify all candidates in candidate_projects for project returned

2. **Filter by specific status**
   - Call endpoint with statusId=1 (nominated only)
   - Call endpoint with statusId=4 (verification in progress)
   - Verify only matching candidates returned

3. **Recruiter sees only their nominations**
   - Login as recruiter
   - Verify filtered results by recruiterId

4. **Manager sees all nominations**
   - Login as manager/CEO/director
   - Verify unfiltered results (all recruiters)

5. **Search functionality**
   - Test search by name, email, mobile
   - Verify case-insensitive matching

6. **Pagination**
   - Test page boundaries
   - Verify total count accuracy

7. **Sorting**
   - Test all sort fields
   - Test asc/desc order

8. **Match scores**
   - Verify scores between 0-100
   - Check calculation accuracy

## Migration from Old Endpoint

### Old Endpoint: `/api/v1/projects/:id/candidates`
- Still exists for backward compatibility
- Returns ALL candidates in candidate_projects table (all statuses)
- Returns raw database structure
- No match scoring
- No pagination
- No search
- No role-based filtering

### New Endpoint: `/api/v1/projects/:id/nominated-candidates`
- Returns all candidates in candidate_projects table (default)
- Optional filtering by status using `statusId` parameter
- Includes match scoring for each candidate
- Full pagination support with total count
- Search functionality (name, email, mobile)
- Role-based access control (recruiters see only their candidates)
- Enriched response with qualifications, statuses, and recruiter info

## Performance Considerations

1. **Pagination**: Limits data transfer and processing
2. **Indexing**: Ensure indexes on:
   - `candidate_projects.projectId`
   - `candidate_projects.currentProjectStatusId`
   - `candidate_projects.recruiterId`
   - `candidates.firstName`, `candidates.lastName`
3. **Eager Loading**: All required relations loaded in single query
4. **In-Memory Sorting**: Match score sorting happens in-memory after calculation

## Future Enhancements

1. Add filter by qualification level
2. Add filter by experience range
3. Add filter by minimum match score
4. Export candidates to CSV/Excel
5. Bulk actions on nominated candidates
6. Real-time updates via WebSocket
