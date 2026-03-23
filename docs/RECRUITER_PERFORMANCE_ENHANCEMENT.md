# Recruiter Performance Enhancement

## Goals
- Align recruiter performance metrics to Candidate Project workflow status semantics
- Add new performance tiles:
  - Registered (Nominated)
  - Document verified
  - Shortlisted
  - Interview passed
  - Deployed
  - Hired
- Keep backward compatibility with existing metrics: assigned, screening, interview, selected, joined
- Add time filtering for year/month/today/custom

## Backend
### Files
- `backend/src/users/users.service.ts`
- `backend/src/users/recruiters.controller.ts`

### API endpoint
- `GET /api/v1/recruiters/performance`
- query params:
  - `recruiterId` (required)
  - `year` (optional, default current year)
  - `filterBy` (`year` | `month` | `today` | `custom`, default `year`)
  - `month` (if `filterBy=month`, 1-12)
  - `fromDate`, `toDate` (if `filterBy=custom`)

### Response shape
```
{
  success: true,
  data: [
    {
      month: string,
      year: number,
      assigned: number,
      screening: number,
      interview: number,
      selected: number,
      joined: number,
      deployed: number,
      hired: number,
      registered: number,
      documentVerified: number,
      shortlisted: number,
      interviewPassed: number,
    }
  ],
  message: string,
}
```

## Frontend
### Files
- `web/src/features/admin/api.ts`
- `web/src/features/candidates/components/RecruiterPerformanceChartWrapper.tsx`
- `web/src/features/analytics/components/PerformanceTrendChart.tsx`

### Behavior
- Charts now display the requested metrics
- Date selector includes year/month/today/custom
- For month and custom range, query params are passed accordingly

## Notes
- Historic mapping uses `CandidateProjects.subStatus` and `mainStatus` (primary) plus `CandidateProjectStatusHistory` (transition data) to avoid missing earlier status events.
- `joined` is still retained for compatibility, and `deployed` is introduced as the new target metric.
- weekly mode not implemented in this pass per specification.
