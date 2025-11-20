# Recruiter Candidates API Implementation

## Overview
Created a new API endpoint to retrieve all candidates assigned to a recruiter with pagination, status filtering, and search functionality.

## Files Created/Modified

### 1. **DTO (Data Transfer Object)**
**File**: `src/candidates/dto/get-recruiter-candidates.dto.ts`

```typescript
export class GetRecruiterCandidatesDto {
  page?: number = 1;           // Page number (default: 1)
  limit?: number = 10;         // Items per page (default: 10)
  status?: CandidateStatus;    // Filter by candidate status (optional)
  search?: string;             // Search by name, email, or mobile (optional)
}
```

**Validation**:
- `page`: Must be integer ≥ 1
- `limit`: Must be integer ≥ 1
- `status`: Must be valid CANDIDATE_STATUS enum value
- `search`: String search term

---

### 2. **Service Method**
**File**: `src/candidates/services/recruiter-assignment.service.ts`

**Method**: `getRecruiterCandidates(recruiterId: string, dto: GetRecruiterCandidatesDto)`

**Features**:
- ✅ Pagination support (page & limit)
- ✅ Status filtering (by candidate status)
- ✅ Search functionality (firstName, lastName, email, mobileNumber)
- ✅ Returns candidate with relations:
  - Team information
  - Current status
  - Active recruiter assignment
  - Qualifications
  - Work experience

**Returns**:
```typescript
{
  data: Candidate[],
  pagination: {
    page: number,
    limit: number,
    totalCount: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPreviousPage: boolean
  }
}
```

---

### 3. **Controller Endpoint**
**File**: `src/candidates/candidates.controller.ts`

**Endpoint**: `GET /api/v1/candidates/recruiter/my-candidates`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by candidate status
- `search` (optional): Search term

**Authentication**: Required (Bearer token)
**Permission**: `read:candidates`

**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "candidate123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "mobileNumber": "1234567890",
      "countryCode": "+1",
      "currentStatus": {
        "id": 1,
        "statusName": "interested"
      },
      "team": {
        "id": "team123",
        "name": "Team A"
      },
      "recruiterAssignments": [...],
      "qualifications": [...],
      "workExperiences": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "message": "Recruiter candidates retrieved successfully"
}
```

---

## Usage Examples

### 1. **Get First Page (Default)**
```bash
GET /api/v1/candidates/recruiter/my-candidates
```

### 2. **With Pagination**
```bash
GET /api/v1/candidates/recruiter/my-candidates?page=2&limit=20
```

### 3. **Filter by Status**
```bash
GET /api/v1/candidates/recruiter/my-candidates?status=interested
```

### 4. **Search Candidates**
```bash
GET /api/v1/candidates/recruiter/my-candidates?search=John
```

### 5. **Combined Filters**
```bash
GET /api/v1/candidates/recruiter/my-candidates?page=1&limit=10&status=qualified&search=engineer
```

---

## Available Status Values
From `CANDIDATE_STATUS`:
- `untouched` - Initial status
- `interested` - Candidate is interested
- `not_interested` - Candidate not interested
- `not_eligible` - Not eligible for positions
- `other_enquiry` - General inquiry
- `future` - Future consideration
- `on_hold` - Temporarily on hold
- `rnr` - Ringing No Response
- `qualified` - Qualified candidate
- `new` - New candidate (legacy)
- `nominated` - Nominated to project (legacy)
- `verified` - Documents verified (legacy)
- `interviewing` - In interview process (legacy)
- `selected` - Selected for position (legacy)
- `processing` - Being processed (legacy)
- `hired` - Successfully hired (legacy)
- `rejected` - Rejected (legacy)

---

## Database Query Logic

The service method:
1. **Filters by active assignment**: Only returns candidates actively assigned to the recruiter
2. **Applies status filter**: If status provided, filters candidates by that status
3. **Applies search filter**: Searches across firstName, lastName, email, and mobileNumber (case-insensitive)
4. **Calculates pagination**: Computes total pages, hasNextPage, hasPreviousPage
5. **Orders by createdAt**: Most recent candidates first

---

## Architecture Decision

### Why This Approach?

✅ **Reused Existing Service**: Added method to `RecruiterAssignmentService` (keeps related logic together)

✅ **Used Existing Controller**: Added endpoint to `CandidatesController` (avoids creating separate module)

✅ **Followed NestJS Best Practices**:
- DTO for request validation
- Service layer for business logic
- Controller for routing only
- Swagger documentation

### Alternative Considered
❌ **Separate Recruiter Module**: Would be overkill for a single endpoint

---

## Testing

To test the endpoint:

1. **Start the backend server**
2. **Get authentication token** (login as a recruiter)
3. **Call the endpoint** with Bearer token:

```bash
curl -X GET "http://localhost:3000/api/v1/candidates/recruiter/my-candidates?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

4. **Try different filters**:
   - Status filter: `?status=interested`
   - Search: `?search=John`
   - Pagination: `?page=2&limit=5`

---

## Notes

- The endpoint automatically uses the logged-in user's ID as `recruiterId`
- Only returns candidates with **active assignments** to the recruiter
- Search is **case-insensitive**
- Pagination starts from **page 1** (not 0)
- Default limit is **10 items per page**

---

## Files Location Summary

```
backend/
├── src/
│   └── candidates/
│       ├── dto/
│       │   └── get-recruiter-candidates.dto.ts    ✅ NEW
│       ├── services/
│       │   └── recruiter-assignment.service.ts    ✅ MODIFIED
│       └── candidates.controller.ts               ✅ MODIFIED
```

All implementations are complete and ready to use! 🎉
