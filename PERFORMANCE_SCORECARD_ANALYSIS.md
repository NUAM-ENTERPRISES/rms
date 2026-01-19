# PerformanceScorecard Data Accuracy Analysis

## Executive Summary

**CRITICAL ISSUE IDENTIFIED**: The `PerformanceScorecard` component displays metrics that mix two different data models, leading to **inaccurate calculations** and **misleading performance indicators**.

---

## Application Architecture Understanding

### What is Affiniks RMS?

Affiniks RMS is a **Healthcare Recruitment Management System** that manages the complete lifecycle of healthcare professional recruitment:

1. **Project-Based Workflow**: Candidates are assigned to specific projects (hospitals/clients)
2. **Multi-Project Support**: A single candidate can be assigned to multiple projects simultaneously
3. **Dual Assignment System**:
   - **Project-Level**: `CandidateProjects` - tracks candidate-project assignments with project-specific statuses
   - **Candidate-Level**: `CandidateRecruiterAssignment` - tracks overall recruiter responsibility for a candidate

### Key Database Models

#### 1. `CandidateProjects` (Project-Specific Assignment)
```prisma
model CandidateProjects {
  id                    String
  candidateId           String
  projectId             String
  recruiterId           String?  // Recruiter handling THIS project assignment
  currentProjectStatusId Int     // Project-specific status (nominated, screening_scheduled, hired, etc.)
  assignedAt            DateTime?
}
```

**Purpose**: Tracks when a candidate is nominated/assigned to a specific project and their progress through that project's pipeline.

**Statuses**: Project-specific (e.g., `nominated`, `screening_scheduled`, `interview_passed`, `hired`, `rejected`)

#### 2. `CandidateRecruiterAssignment` (Candidate-Level Assignment)
```prisma
model CandidateRecruiterAssignment {
  id          String
  candidateId String
  recruiterId String
  isActive    Boolean
  assignedAt  DateTime
}
```

**Purpose**: Tracks which recruiter is responsible for managing a candidate overall (not project-specific).

#### 3. `Candidate` (Candidate Entity)
```prisma
model Candidate {
  id              String
  currentStatusId Int  // Candidate-level status (untouched, interested, not_interested, etc.)
}
```

**Purpose**: Tracks the candidate's overall status, independent of any specific project.

---

## Current Backend Implementation Analysis

### What `getRecruiterStats()` Returns

```typescript
// From backend/src/users/users.service.ts:554-848

{
  assigned: number,      // Count of CandidateProjects WHERE recruiterId = X AND assignedAt in year
  screening: number,     // Count of CandidateProjects WHERE currentProjectStatus IN (screening_*)
  interview: number,     // Count of CandidateProjects WHERE currentProjectStatus IN (interview_*)
  selected: number,      // Count of CandidateProjects WHERE currentProjectStatus = 'selected'
  joined: number,        // Count of CandidateProjects WHERE currentProjectStatus = 'hired'
  untouched: number,    // Count of Candidates WHERE recruiterAssignment.isActive = true AND currentStatusId = 'untouched'
}
```

### **CRITICAL DATA MISMATCH**

The backend mixes two different data models:

| Metric | Data Source | Level | Issue |
|--------|-------------|-------|-------|
| `assigned` | `CandidateProjects` | **Project-Level** | ✅ Correct |
| `screening` | `CandidateProjects` | **Project-Level** | ✅ Correct |
| `interview` | `CandidateProjects` | **Project-Level** | ✅ Correct |
| `selected` | `CandidateProjects` | **Project-Level** | ✅ Correct |
| `joined` | `CandidateProjects` | **Project-Level** | ✅ Correct |
| `untouched` | `Candidate` + `CandidateRecruiterAssignment` | **Candidate-Level** | ❌ **WRONG MODEL** |

---

## PerformanceScorecard Calculations

### What the Component Calculates

```typescript
// From PerformanceScorecard.tsx:29-43

conversionRate = (joined / assigned) * 100
pipelineHealth = ((screening + interview + selected) / assigned) * 100
untouchedRate = (untouched / assigned) * 100
performanceScore = conversionRate * 0.4 + pipelineHealth * 0.3 + (100 - untouchedRate) * 0.3
```

### **PROBLEM**: Apples-to-Oranges Comparison

1. **`assigned`** = Number of **project assignments** (CandidateProjects records)
2. **`untouched`** = Number of **candidates** (Candidate records) with status "untouched"

**Example Scenario**:
- Recruiter A has:
  - 100 `CandidateProjects` assigned (assigned = 100)
  - 50 unique candidates
  - 10 of those candidates have status "untouched" (untouched = 10)

**Current Calculation**:
- `untouchedRate = 10 / 100 = 10%` ❌ **WRONG**
- Should be: `untouchedRate = 10 / 50 = 20%` ✅ **CORRECT**

**Impact**: The `untouchedRate` is **understated** because the denominator (assigned) counts project assignments, not unique candidates.

---

## Additional Issues

### Issue 1: `untouched` Count Logic

**Current Implementation**:
```typescript
// Line 641-657 in users.service.ts
const untouched = untouchedStatus
  ? await this.prisma.candidate.count({
      where: {
        recruiterAssignments: {
          some: {
            recruiterId: recruiter.id,
            isActive: true,
          },
        },
        currentStatusId: untouchedStatus.id,
      },
    })
  : 0;
```

**Problem**: This counts candidates with active recruiter assignment AND status "untouched", but:
- It doesn't filter by the year (unlike `assigned`)
- It uses `CandidateRecruiterAssignment` (candidate-level) while other metrics use `CandidateProjects` (project-level)

### Issue 2: Time Filter Inconsistency

- `assigned`, `screening`, `interview`, `selected`, `joined`: Filtered by `assignedAt` within the year
- `untouched`: **NO YEAR FILTER** - counts all candidates regardless of when they were assigned

### Issue 3: Multi-Project Candidates

A candidate can be assigned to multiple projects:
- If a candidate is assigned to 3 projects, they count as `assigned = 3`
- But `untouched` counts them as 1 candidate
- This creates a denominator mismatch

---

## What Data IS Accurate?

### ✅ Accurate Metrics

1. **Project-Level Metrics** (from `CandidateProjects`):
   - `assigned`: Correct count of project assignments
   - `screening`: Correct count of projects in screening
   - `interview`: Correct count of projects in interview
   - `selected`: Correct count of projects selected
   - `joined`: Correct count of projects where candidate joined

2. **Average Time Calculations**:
   - `avgTimeToFirstTouch`: Calculated from `CandidateStatusHistory` ✅
   - `avgDaysToInterested`, etc.: Calculated from status history ✅

### ❌ Inaccurate Metrics

1. **`untouched`**: Uses wrong data model (candidate-level vs project-level)
2. **`untouchedRate`**: Denominator mismatch (project assignments vs candidates)
3. **`conversionRate`**: Technically correct for project-level, but may not reflect recruiter's actual candidate conversion
4. **`pipelineHealth`**: Technically correct for project-level, but may not reflect recruiter's actual pipeline

---

## Recommended Fixes

### Option 1: Make All Metrics Project-Level (Recommended)

**Change `untouched` calculation**:
```typescript
// Count candidates assigned to projects but not yet touched
const untouched = await this.prisma.candidateProjects.count({
  where: {
    recruiterId: recruiter.id,
    assignedAt: {
      gte: yearStart,
      lte: yearEnd,
    },
    candidate: {
      currentStatusId: untouchedStatus.id,
    },
  },
});
```

**Pros**:
- Consistent data model (all project-level)
- Matches the business logic (recruiters manage project assignments)
- Year filter applied consistently

**Cons**:
- May count same candidate multiple times if assigned to multiple projects

### Option 2: Make All Metrics Candidate-Level

**Change all calculations** to use `CandidateRecruiterAssignment`:
```typescript
// Get unique candidates assigned to recruiter
const assignedCandidates = await this.prisma.candidateRecruiterAssignment.findMany({
  where: {
    recruiterId: recruiter.id,
    isActive: true,
    assignedAt: { gte: yearStart, lte: yearEnd },
  },
});

const assigned = assignedCandidates.length;
const untouched = assignedCandidates.filter(c => 
  c.candidate.currentStatusId === untouchedStatus.id
).length;

// Count projects for each candidate
const screening = await this.prisma.candidateProjects.count({
  where: {
    recruiterId: recruiter.id,
    candidateId: { in: assignedCandidates.map(c => c.candidateId) },
    currentProjectStatus: { in: ['screening_scheduled', ...] },
  },
});
```

**Pros**:
- Consistent candidate-level view
- No double-counting

**Cons**:
- More complex queries
- May not reflect project-level performance

### Option 3: Hybrid Approach (Best for Business)

**Separate Metrics**:
- **Project Performance**: assigned, screening, interview, selected, joined (project-level)
- **Candidate Management**: untouched, activeCandidates, conversionRate (candidate-level)

**Display Both**:
```typescript
{
  projectMetrics: {
    assigned: number,
    screening: number,
    interview: number,
    selected: number,
    joined: number,
  },
  candidateMetrics: {
    totalCandidates: number,
    untouched: number,
    active: number,
    conversionRate: number, // joined candidates / total candidates
  }
}
```

---

## Conclusion

### Current State: ⚠️ **PARTIALLY ACCURATE**

- **Project-level metrics** (assigned, screening, interview, selected, joined): ✅ **ACCURATE**
- **Candidate-level metrics** (untouched): ❌ **INACCURATE** (wrong data model)
- **Calculated metrics** (conversionRate, pipelineHealth, untouchedRate): ❌ **INACCURATE** (denominator mismatch)
- **Performance Score**: ❌ **INACCURATE** (based on flawed calculations)

### Recommendation

**Implement Option 3 (Hybrid Approach)** to provide both project-level and candidate-level insights, giving directors a complete picture of recruiter performance.

---

## Next Steps

1. ✅ **Immediate**: Document the data model mismatch
2. 🔄 **Short-term**: Fix `untouched` calculation to match project-level model OR switch to candidate-level
3. 🔄 **Medium-term**: Implement hybrid metrics for comprehensive view
4. 🔄 **Long-term**: Add data validation tests to prevent future mismatches

