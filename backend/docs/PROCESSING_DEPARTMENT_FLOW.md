# Processing Department Flow

## Overview
This document outlines the workflow for transitioning candidates from the recruitment phase to the processing department once they have successfully passed the client interview.

## 1. Trigger for Processing
The recruitment cycle for a candidate ends when the candidate's status for a nomination is updated to `INTERVIEW_PASSED` or `SELECTED`. At this stage, the candidate becomes eligible for "Processing".

## 2. Ready for Processing Tab
Candidates who have passed their interviews are listed in the **Ready for Processing** tab. This view is restricted to administrative roles:
- CEO
- Director
- Manager

## 3. Transfer to Processing Team
The transfer process can be done individually or in bulk.

### Individual Transfer
1. Navigate to the candidate detail section.
2. Click the **Transfer to Processing Team** button.
3. A modal appears requiring the selection of a **Processing Team User**.
4. Upon confirmation, a `ProcessingCandidate` record is created.

### Multi-Transfer (Bulk)
1. Select multiple candidates from the "Ready for Processing" list.
2. Click the **Transfer to Processing Team** button at the top level.
3. Select the **Processing Team User** who will handle these candidates.
4. `ProcessingCandidate` records are created for all selected candidates.

## 4. Data Tracking
When a candidate is transferred for processing, the following information is captured:
- **Candidate ID**: Reference to the candidate record.
- **Project ID**: Reference to the specific project.
- **Role Needed ID**: Reference to the specific role requirement within the project.
- **Assigned Processing User**: The specific team member responsible for processing.
- **Recruiter ID**: Tracked in history to know who was the recruiter during transfer.
- **Processing Status**: Initial status is `assigned`.
- **Processing History**: Logs every change in the processing status or assignment, including the recruiter at the time of transfer.

## 5. Status Management
The `ProcessingCandidate` status can transition through:
- `assigned`: Initial state.
- `in_progress`: The processing team has started working on documentation/visas.
- `completed`: Processing is finished (e.g., visa issued).
- `cancelled`: Processing stopped.

## 6. Country-Specific Document Requirements
Each country has a distinct list of required documents for processing. These are managed through the `CountryDocumentRequirement` table.
- Projects inherit requirements based on their `countryCode`.
- Administrators can manage these requirements (CRUD) to adapt to changing regulations in countries like Saudi Arabia, Qatar, or Oman.
