# Documentation Analytics Architecture
## Principal Architect + Product Intelligence Engineer Analysis

**System:** Affiniks Recruitment Management System (RMS)  
**Date:** January 2025  
**Scope:** Enterprise-Grade Documentation Analytics for Executive Decision-Making

---

# PHASE 1: CRITICAL SYSTEM UNDERSTANDING

## 1.1 Data Model Architecture

### Core Entities & Relationships

```
┌─────────────────┐
│   Candidate     │
│  (candidateId)  │
└────────┬────────┘
         │ 1:N
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│    Document      │         │    Project        │
│  (documentId)    │         │   (projectId)     │
│                  │         │                   │
│ - candidateId   │         │ - documentReq[]  │
│ - docType        │         │   (mandatory)     │
│ - status         │         └─────────┬─────────┘
│ - verifiedAt     │                   │
│ - rejectedAt     │                   │ 1:N
│ - expiryDate     │                   │
└────────┬─────────┘                   │
         │ N:M                         │
         │                             │
         ▼                             ▼
┌─────────────────────────────────────────────┐
│  CandidateProjectDocumentVerification       │
│  (verificationId)                           │
│                                             │
│ - candidateProjectMapId                     │
│ - documentId                                │
│ - status: pending|verified|rejected|       │
│   resubmission_requested                    │
│ - rejectionReason                           │
│ - createdAt, updatedAt                      │
└───────────────┬─────────────────────────────┘
                │
                │ 1:N
                ▼
┌─────────────────────────────────────────────┐
│  DocumentVerificationHistory                │
│  (historyId)                                │
│                                             │
│ - verificationId                            │
│ - action: verified|rejected|                │
│   resubmission_requested|pending            │
│ - performedBy (verifierId)                  │
│ - performedAt (timestamp)                   │
│ - notes, reason                             │
└─────────────────────────────────────────────┘
                │
                │
                ▼
┌─────────────────────────────────────────────┐
│  CandidateProjects                          │
│  (candidateProjectMapId)                    │
│                                             │
│ - candidateId                               │
│ - projectId                                 │
│ - recruiterId (assigned recruiter)          │
│ - assignedAt                                │
│ - mainStatusId (documents stage)            │
│ - subStatusId:                              │
│   * pending_documents                       │
│   * verification_in_progress_document       │
│   * documents_verified                      │
│   * rejected_documents                      │
└─────────────────────────────────────────────┘
```

### Key Observations

1. **Dual Status System:**
   - `Document.status`: Global document status (pending, verified, rejected)
   - `CandidateProjectDocumentVerification.status`: Project-specific verification status
   - **CRITICAL:** A document can be verified for Project A but rejected for Project B

2. **Document Reusability:**
   - Same `Document` can be linked to multiple projects via `CandidateProjectDocumentVerification`
   - Example: Passport verified for Project A, reused for Project B (may need re-verification)

3. **Status Coupling:**
   - `CandidateProjects.subStatusId` is automatically updated based on document verification state
   - Logic in `updateCandidateProjectStatus()`:
     - `pending_documents` → No documents submitted
     - `verification_in_progress` → Some pending or incomplete
     - `documents_verified` → All required docs verified
     - `rejected_documents` → Any document rejected

4. **Missing Timestamps:**
   - ❌ No `firstSubmittedAt` in `CandidateProjectDocumentVerification`
   - ❌ No `firstVerifiedAt` (only latest in history)
   - ❌ No `timeInPendingState` calculation
   - ✅ `Document.createdAt` exists (upload time)
   - ✅ `Document.verifiedAt` exists (but only latest)
   - ✅ `DocumentVerificationHistory.performedAt` exists (full timeline)

---

## 1.2 Document Lifecycle Workflow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────┘

1. PROJECT SETUP
   ┌──────────────┐
   │   Project    │───creates───►┌──────────────────────┐
   │              │              │ DocumentRequirement   │
   │              │              │ - docType             │
   │              │              │ - mandatory: true/false│
   └──────────────┘              └──────────────────────┘

2. CANDIDATE ASSIGNMENT
   ┌──────────────┐
   │  Recruiter   │───assigns───►┌──────────────────────┐
   │              │              │ CandidateProjects     │
   │              │              │ - recruiterId         │
   │              │              │ - assignedAt          │
   │              │              │ - subStatus:          │
   │              │              │   "pending_documents"  │
   └──────────────┘              └──────────────────────┘

3. DOCUMENT UPLOAD
   ┌──────────────┐
   │  Candidate   │───uploads───►┌──────────────────────┐
   │  (via UI)    │              │ Document              │
   │              │              │ - status: "pending"   │
   │              │              │ - createdAt           │
   │              │              │ - uploadedBy          │
   └──────────────┘              └──────────────────────┘
                                         │
                                         │ links to project
                                         ▼
                            ┌──────────────────────────────┐
                            │ CandidateProjectDocument     │
                            │ Verification                 │
                            │ - status: "pending"          │
                            │ - createdAt                  │
                            └──────────────────────────────┘
                                         │
                                         │ triggers
                                         ▼
                            ┌──────────────────────────────┐
                            │ CandidateProjects.subStatus  │
                            │ → "verification_in_progress"  │
                            └──────────────────────────────┘

4. VERIFICATION (Verifier Action)
   ┌──────────────┐
   │  Verifier    │───verifies───►┌──────────────────────────────┐
   │              │               │ POST /documents/:id/verify   │
   │              │               │ {                            │
   │              │               │   status: "verified"|        │
   │              │               │            "rejected"        │
   │              │               │   rejectionReason?           │
   │              │               │ }                            │
   └──────────────┘               └──────────────────────────────┘
                                            │
                                            │ updates
                                            ▼
                            ┌──────────────────────────────┐
                            │ CandidateProjectDocument     │
                            │ Verification                 │
                            │ - status: "verified"|         │
                            │            "rejected"         │
                            │ - updatedAt                   │
                            └──────────────────────────────┘
                                            │
                                            │ creates history
                                            ▼
                            ┌──────────────────────────────┐
                            │ DocumentVerificationHistory  │
                            │ - action: "verified"|         │
                            │            "rejected"        │
                            │ - performedBy (verifierId)    │
                            │ - performedAt                 │
                            └──────────────────────────────┘
                                            │
                                            │ updates document
                                            ▼
                            ┌──────────────────────────────┐
                            │ Document                     │
                            │ - status: "verified"|         │
                            │            "rejected"         │
                            │ - verifiedAt (if verified)    │
                            │ - rejectedAt (if rejected)     │
                            └──────────────────────────────┘
                                            │
                                            │ triggers
                                            ▼
                            ┌──────────────────────────────┐
                            │ updateCandidateProjectStatus()│
                            │                              │
                            │ IF all required verified:     │
                            │   → "documents_verified"      │
                            │ IF any rejected:              │
                            │   → "rejected_documents"      │
                            │ IF some pending:               │
                            │   → "verification_in_progress"│
                            └──────────────────────────────┘

5. RESUBMISSION (If Rejected)
   ┌──────────────┐
   │  Verifier    │───requests───►┌──────────────────────────────┐
   │              │               │ POST /documents/:id/           │
   │              │               │   request-resubmission       │
   │              │               │ { reason: "..." }             │
   └──────────────┘               └──────────────────────────────┘
                                            │
                                            │ updates
                                            ▼
                            ┌──────────────────────────────┐
                            │ CandidateProjectDocument     │
                            │ Verification                 │
                            │ - status: "resubmission_     │
                            │            requested"         │
                            │ - resubmissionRequested: true│
                            └──────────────────────────────┘
                                            │
                                            │ candidate uploads new doc
                                            ▼
                            ┌──────────────────────────────┐
                            │ New Document created         │
                            │ (or existing reused)         │
                            │                              │
                            │ → Back to Step 3             │
                            └──────────────────────────────┘
```

### Status Transition Rules

| From Status | To Status | Trigger | Actor |
|------------|----------|---------|-------|
| `pending` | `verified` | Verifier approves | Verifier |
| `pending` | `rejected` | Verifier rejects | Verifier |
| `rejected` | `resubmission_requested` | Verifier requests resubmission | Verifier |
| `resubmission_requested` | `pending` | Candidate uploads new document | Candidate |
| `verified` | `rejected` | Re-verification fails | Verifier |
| `rejected` | `verified` | Resubmission approved | Verifier |

---

## 1.3 Actor Responsibilities

### Recruiter
- **Assigns** candidates to projects (`CandidateProjects.recruiterId`)
- **Responsible** for ensuring candidates upload required documents
- **Not responsible** for verification (that's verifier's job)
- **Accountability:** If documents are missing/poor quality → recruiter issue

### Verifier (Document Verification Team)
- **Verifies** or **rejects** documents
- **Requests resubmission** if quality is poor
- **Performs** verification actions (tracked in `DocumentVerificationHistory`)
- **Accountability:** Verification speed, accuracy, rejection quality

### Candidate
- **Uploads** documents via UI
- **Resubmits** if requested
- **No direct accountability** in analytics (they're the subject, not the actor)

### System
- **Auto-updates** `CandidateProjects.subStatus` based on verification state
- **Tracks** all actions in history tables
- **No accountability** (it's a tool)

---

## 1.4 Current Analytics Endpoints

### Existing: `GET /documents/analytics/professional`

**Returns:**
```typescript
Array<{
  id: string;                    // verificationId
  candidateName: string;
  status: "verified" | "pending" | "rejected";
  docType: string;
  rejectionReason: string | null;
  verifiedBy: string | null;     // verifier name (from history)
  createdAt: string;              // document.createdAt (YYYY-MM-DD)
}>
```

**What It Answers:**
- ✅ How many documents are verified/pending/rejected
- ✅ Which verifiers verified documents
- ✅ What document types are most common
- ✅ Basic rejection reasons

**What It FAILS to Answer:**
- ❌ How long does verification take? (no time metrics)
- ❌ Which projects are at risk? (no project context)
- ❌ Which recruiters have compliance issues? (no recruiter context)
- ❌ What's the resubmission rate? (no resubmission tracking)
- ❌ Are documents expiring? (no expiry tracking)
- ❌ What's the first-time verification rate? (no attempt tracking)
- ❌ What's the backlog? (no pending duration)
- ❌ Which verifiers are overloaded? (no throughput metrics)

---

## 1.5 Data Gaps & Risks

### Critical Gaps

1. **Time Metrics Missing:**
   - ❌ No `timeToVerify` calculation (need `Document.createdAt` → `DocumentVerificationHistory.performedAt`)
   - ❌ No `timeInPending` calculation
   - ❌ No `firstSubmittedAt` in verification table (only `createdAt` which is when verification record created, not when doc uploaded)

2. **Project Context Missing:**
   - ❌ No project-level aggregation in current analytics
   - ❌ No project deadline tracking in analytics
   - ❌ No project risk calculation

3. **Recruiter Context Missing:**
   - ❌ No recruiter-level aggregation
   - ❌ No recruiter accountability metrics

4. **Quality Metrics Missing:**
   - ❌ No resubmission count tracking (can infer from history, but not direct)
   - ❌ No first-time verification rate (need to count verification attempts)

5. **Expiry Tracking Missing:**
   - ✅ `Document.expiryDate` exists
   - ❌ No expiry alerts in analytics
   - ❌ No expiry risk calculation

### Data Accuracy Risks

1. **Status Inconsistency:**
   - `Document.status` can differ from `CandidateProjectDocumentVerification.status`
   - **Risk:** Analytics might show wrong status if querying wrong table

2. **Timestamp Ambiguity:**
   - `Document.createdAt` = upload time
   - `CandidateProjectDocumentVerification.createdAt` = when verification record created (may be after upload)
   - **Risk:** Time calculations might be wrong

3. **History Completeness:**
   - `DocumentVerificationHistory` tracks all actions
   - But if a document is verified multiple times (re-verification), history has multiple entries
   - **Risk:** Need to filter for latest action, not all actions

4. **Mandatory vs Optional:**
   - `DocumentRequirement.mandatory` flag exists
   - But analytics doesn't distinguish mandatory vs optional
   - **Risk:** Compliance calculations might be wrong

---

# PHASE 2: EXECUTIVE ANALYTICS DESIGN

## 2.1 Executive Intelligence Requirements

**Executives need:**
- **Risk signals** (not raw counts)
- **Accountability** (who is responsible for delays)
- **Early warnings** (predictive indicators)
- **Actionable insights** (what to do next)

**Executives DON'T need:**
- Raw document counts
- Detailed verifier names
- Individual candidate names
- Technical implementation details

---

## 2.2 Core Executive Metrics

### 1. Project Risk Index (Composite Score: 0-100)

**Formula:**
```
Project Risk Score = 
  (Pending Mandatory Docs Weight × 40) +
  (SLA Breach Weight × 30) +
  (Resubmission Rate Weight × 20) +
  (Expiry Risk Weight × 10)

Where:
- Pending Mandatory Docs Weight = (pendingMandatoryDocs / totalMandatoryDocs) × 100
- SLA Breach Weight = (documentsExceedingSLA / totalPendingDocs) × 100
- Resubmission Rate Weight = (resubmissionCount / totalSubmittedDocs) × 100
- Expiry Risk Weight = (docsExpiringIn30Days / totalDocs) × 100
```

**Risk Levels:**
- **High (70-100):** Immediate intervention required
- **Medium (40-69):** Monitor closely
- **Low (0-39):** Normal operations

**Why It Matters:**
- Projects with high risk scores are likely to miss deadlines
- Early identification allows resource reallocation
- Prevents revenue loss from delayed deployments

---

### 2. Delivery & Revenue Delay Signals

**Metrics:**

a) **Candidates Blocked by Documents:**
```
blockedCandidates = COUNT(CandidateProjects WHERE 
  subStatus IN ('pending_documents', 'verification_in_progress', 'rejected_documents')
  AND project.deadline < NOW() + 30 days
)
```

b) **Average Onboarding Delay:**
```
avgOnboardingDelay = AVG(
  (firstVerifiedAt - assignedAt) 
  WHERE allDocumentsVerified = true
)
```

c) **Project Start Delay Risk:**
```
delayRisk = COUNT(CandidateProjects WHERE
  subStatus NOT IN ('documents_verified')
  AND project.deadline < NOW() + 14 days
  AND project.status = 'active'
)
```

**Why It Matters:**
- Delayed candidates = delayed revenue
- Predicts which projects will miss deadlines
- Allows proactive resource allocation

---

### 3. Recruiter Effectiveness Index

**Formula:**
```
Recruiter Effectiveness = 
  (Compliance Completion Rate × 40) +
  (First-Time Verification Rate × 30) +
  (Document Quality Score × 20) +
  (On-Time Submission Rate × 10)

Where:
- Compliance Completion Rate = (candidatesWithAllDocsVerified / totalAssignedCandidates) × 100
- First-Time Verification Rate = (docsVerifiedOnFirstAttempt / totalDocsSubmitted) × 100
- Document Quality Score = 100 - (resubmissionRate × 100)
- On-Time Submission Rate = (docsSubmittedBeforeDeadline / totalDocsRequired) × 100
```

**Ranking:**
- Top 20%: High performers (recognize)
- Middle 60%: Standard (monitor)
- Bottom 20%: Needs coaching (intervene)

**Why It Matters:**
- Identifies recruiters who need training
- Prevents bottlenecks at source
- Improves overall system efficiency

---

### 4. Verification Team Capacity vs Load

**Metrics:**

a) **Throughput per Verifier:**
```
verifierThroughput = COUNT(DocumentVerificationHistory WHERE
  performedBy = verifierId
  AND performedAt >= NOW() - 30 days
  AND action = 'verified'
) / 30 days
```

b) **Backlog Growth:**
```
backlogGrowth = COUNT(CandidateProjectDocumentVerification WHERE
  status = 'pending'
  AND createdAt < NOW() - 7 days
) - COUNT(CandidateProjectDocumentVerification WHERE
  status = 'pending'
  AND createdAt < NOW() - 14 days
)
```

c) **SLA Breach Responsibility:**
```
slaBreaches = COUNT(DocumentVerificationHistory WHERE
  action = 'verified'
  AND (performedAt - document.createdAt) > SLA_THRESHOLD_HOURS
)
```

**Why It Matters:**
- Identifies if verification team is overloaded
- Predicts when to hire more verifiers
- Prevents bottlenecks in verification process

---

### 5. Quality Debt Indicator

**Formula:**
```
Quality Debt = 
  (Fast Rejections × 0.3) +
  (Multiple Resubmissions × 0.4) +
  (Re-verification Frequency × 0.3)

Where:
- Fast Rejections = COUNT(docs rejected within 1 hour of submission)
- Multiple Resubmissions = COUNT(docs with resubmissionCount > 2)
- Re-verification Frequency = COUNT(docs verified > 1 time)
```

**Why It Matters:**
- Fast rejections = poor initial quality (recruiter issue)
- Multiple resubmissions = wasted time (both recruiter and verifier)
- Re-verification = documents expiring or changing (systemic issue)

---

# PHASE 3: DASHBOARD STRUCTURE & UX LOGIC

## 3.1 Executive Dashboard

### Section 1: Executive KPIs (Top Row)
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Projects at    │  │  Candidates     │  │  Avg Onboarding │
│  Risk (High)    │  │  Blocked         │  │  Delay          │
│                 │  │                 │  │                 │
│  12 Projects    │  │  45 Candidates   │  │  8.5 Days       │
│  ⚠️ High Risk   │  │  ⚠️ Blocked      │  │  ⚠️ +2.3 days   │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Verification   │  │  Recruiters     │  │  Quality Debt   │
│  Backlog        │  │  Needing Help   │  │  Score          │
│                 │  │                 │  │                 │
│  234 Docs       │  │  3 Recruiters   │  │  15.2 (Medium)  │
│  ⚠️ +12% growth │  │  ⚠️ Bottom 20%  │  │  ⚠️ Trending up  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Section 2: Project Risk Heatmap
```
┌─────────────────────────────────────────────────────────────┐
│  Project Risk Heatmap                                       │
│                                                             │
│  Project Name          │ Risk │ Blocked │ Deadline │ Action│
│  ──────────────────────────────────────────────────────────│
│  Emergency Dept Staff  │ 🔴 85│   12    │ 14 days  │ ⚠️   │
│  ICU Night Shift       │ 🟠 62│    8    │ 21 days  │ 📊   │
│  General Ward          │ 🟢 25│    2    │ 45 days  │ ✓    │
└─────────────────────────────────────────────────────────────┘
```

### Section 3: Recruiter Performance Ranking
```
┌─────────────────────────────────────────────────────────────┐
│  Recruiter Performance (Top 5 / Bottom 5)                  │
│                                                             │
│  Rank │ Recruiter    │ Effectiveness │ Compliance │ Trend  │
│  ──────────────────────────────────────────────────────────│
│   1   │ John Doe     │     92        │    98%     │ ↗️     │
│   2   │ Jane Smith   │     88        │    95%     │ ↗️     │
│  ...  │              │               │            │        │
│  18   │ Bob Wilson   │     35        │    45%     │ ↘️     │
│  19   │ Alice Brown  │     28        │    38%     │ ↘️     │
└─────────────────────────────────────────────────────────────┘
```

### Section 4: Early Warning Alerts
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Early Warning Alerts                                     │
│                                                             │
│  • 12 projects at high risk (deadline < 14 days)          │
│  • Verification backlog growing (+12% this week)           │
│  • 3 recruiters in bottom 20% for 2+ weeks                │
│  • 45 documents expiring in next 30 days                   │
└─────────────────────────────────────────────────────────────┘
```

**What's Hidden from Executives:**
- Individual verifier names
- Individual candidate names
- Detailed rejection reasons
- Technical implementation details
- Raw SQL queries

---

## 3.2 Operations / Compliance Dashboard

### Section 1: Workflow Stages
```
┌─────────────────────────────────────────────────────────────┐
│  Document Verification Pipeline                             │
│                                                             │
│  Pending Upload → In Verification → Verified → Complete   │
│     234             156              892        1,234       │
│     ⚠️ +12%         ⚠️ +5%          ✓          ✓           │
└─────────────────────────────────────────────────────────────┘
```

### Section 2: Bottleneck Analysis
```
┌─────────────────────────────────────────────────────────────┐
│  Bottleneck Identification                                  │
│                                                             │
│  Stage              │ Avg Time │ SLA Breach │ Action      │
│  ──────────────────────────────────────────────────────────│
│  Pending Upload     │  5.2 days│    12%     │ ⚠️ Alert    │
│  Verification       │  2.1 days│     3%     │ ✓ OK        │
│  Resubmission       │  3.8 days│    18%     │ ⚠️ Alert    │
└─────────────────────────────────────────────────────────────┘
```

### Section 3: Verifier Efficiency
```
┌─────────────────────────────────────────────────────────────┐
│  Verifier Performance                                       │
│                                                             │
│  Verifier      │ Throughput │ Avg Time │ Quality │ Status  │
│  ──────────────────────────────────────────────────────────│
│  Sarah Chen    │  45/day    │  1.2h    │  98%   │ ✓ High  │
│  Mike Johnson  │  38/day    │  1.5h    │  95%   │ ✓ Good  │
│  Lisa Wang     │  22/day    │  3.1h    │  92%   │ ⚠️ Slow │
└─────────────────────────────────────────────────────────────┘
```

### Section 4: Rejection & Resubmission Analysis
```
┌─────────────────────────────────────────────────────────────┐
│  Top Rejection Reasons                                      │
│                                                             │
│  Reason                    │ Count │ % of Total │ Trend    │
│  ──────────────────────────────────────────────────────────│
│  Document expired          │   45  │    18%    │ ↗️ +5%   │
│  Poor quality/illegible    │   38  │    15%    │ ↘️ -2%   │
│  Missing information       │   32  │    13%    │ → 0%     │
└─────────────────────────────────────────────────────────────┘
```

**What's Visible:**
- Detailed verifier names
- Detailed rejection reasons
- Individual document statuses
- Technical metrics

---

## 3.3 Recruiter Dashboard

### Section 1: My Candidates' Document Status
```
┌─────────────────────────────────────────────────────────────┐
│  My Candidates - Document Compliance                        │
│                                                             │
│  Candidate          │ Project        │ Status      │ Action │
│  ──────────────────────────────────────────────────────────│
│  John Smith         │ Emergency Dept │ 3/5 docs   │ ⚠️     │
│  Jane Doe           │ ICU Night      │ 5/5 docs ✓ │ ✓      │
│  Bob Wilson         │ General Ward   │ 2/5 docs    │ ⚠️     │
└─────────────────────────────────────────────────────────────┘
```

### Section 2: My Performance
```
┌─────────────────────────────────────────────────────────────┐
│  My Performance Metrics                                     │
│                                                             │
│  Compliance Rate:     85% (Team Avg: 78%)                  │
│  First-Time Verify:    72% (Team Avg: 68%)                  │
│  Quality Score:        78/100 (Team Avg: 75)               │
│  Rank:                 #8 of 20 recruiters                 │
└─────────────────────────────────────────────────────────────┘
```

### Section 3: Quality Feedback
```
┌─────────────────────────────────────────────────────────────┐
│  Recent Rejections (My Candidates)                          │
│                                                             │
│  Document Type │ Reason              │ Date      │ Action  │
│  ──────────────────────────────────────────────────────────│
│  Passport      │ Expired (6 months)   │ 2 days ago│ ⚠️      │
│  Resume        │ Missing experience   │ 5 days ago│ ⚠️      │
└─────────────────────────────────────────────────────────────┘
```

**What's Visible:**
- Only their own candidates
- Their own performance metrics
- Quality feedback for improvement

---

# PHASE 4: BACKEND IMPLEMENTATION PLAN

## 4.1 New Analytics Endpoints

### Endpoint 1: `GET /documents/analytics/executive`

**Purpose:** Executive-level KPIs and risk indicators

**Response:**
```typescript
{
  success: boolean;
  data: {
    // High-level KPIs
    projectsAtRisk: {
      high: number;      // Risk score >= 70
      medium: number;    // Risk score 40-69
      low: number;       // Risk score < 40
    };
    candidatesBlocked: number;
    avgOnboardingDelay: number;  // days
    verificationBacklog: {
      current: number;
      growth: number;     // % change from last week
    };
    recruitersNeedingHelp: number;  // Bottom 20%
    qualityDebtScore: number;       // 0-100
    
    // Early warnings
    alerts: Array<{
      type: 'project_risk' | 'backlog_growth' | 'recruiter_performance' | 'expiry';
      severity: 'high' | 'medium' | 'low';
      message: string;
      count?: number;
    }>;
  };
  message: string;
}
```

**Implementation Logic:**
```typescript
// Pseudo-code
async getExecutiveAnalytics() {
  const projects = await getProjectsWithDocumentStatus();
  const projectsAtRisk = calculateProjectRiskScores(projects);
  
  const candidatesBlocked = await countBlockedCandidates();
  const avgDelay = await calculateAvgOnboardingDelay();
  
  const backlog = await getVerificationBacklog();
  const backlogGrowth = calculateBacklogGrowth(backlog);
  
  const recruiters = await getRecruiterEffectiveness();
  const needingHelp = recruiters.filter(r => r.rank > 0.8 * totalRecruiters);
  
  const qualityDebt = await calculateQualityDebt();
  
  const alerts = generateEarlyWarnings({
    projectsAtRisk,
    backlogGrowth,
    recruitersNeedingHelp,
    expiringDocs
  });
  
  return { projectsAtRisk, candidatesBlocked, avgDelay, ... };
}
```

---

### Endpoint 2: `GET /documents/analytics/projects/risk`

**Purpose:** Project-level risk analysis

**Response:**
```typescript
{
  success: boolean;
  data: {
    projects: Array<{
      projectId: string;
      projectTitle: string;
      riskScore: number;        // 0-100
      riskLevel: 'high' | 'medium' | 'low';
      blockedCandidates: number;
      pendingMandatoryDocs: number;
      totalMandatoryDocs: number;
      slaBreaches: number;
      resubmissionRate: number;
      expiryRisk: number;
      deadline: string;         // ISO date
      daysUntilDeadline: number;
      recommendedAction: string;
    }>;
    summary: {
      totalProjects: number;
      highRiskCount: number;
      mediumRiskCount: number;
      lowRiskCount: number;
    };
  };
  message: string;
}
```

**Implementation Logic:**
```typescript
async getProjectRiskAnalysis() {
  const projects = await prisma.project.findMany({
    where: { status: 'active' },
    include: {
      documentRequirements: { where: { mandatory: true } },
      candidateProjects: {
        include: {
          documentVerifications: {
            include: { document: true }
          }
        }
      }
    }
  });
  
  const projectRisks = projects.map(project => {
    const mandatoryDocs = project.documentRequirements.length;
    const pendingDocs = countPendingMandatoryDocs(project);
    const slaBreaches = countSLABreaches(project);
    const resubmissionRate = calculateResubmissionRate(project);
    const expiryRisk = countExpiringDocs(project);
    
    const riskScore = calculateRiskScore({
      pendingDocs,
      mandatoryDocs,
      slaBreaches,
      resubmissionRate,
      expiryRisk
    });
    
    return {
      projectId: project.id,
      projectTitle: project.title,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      blockedCandidates: countBlockedCandidates(project),
      pendingMandatoryDocs: pendingDocs,
      totalMandatoryDocs: mandatoryDocs,
      slaBreaches,
      resubmissionRate,
      expiryRisk,
      deadline: project.deadline,
      daysUntilDeadline: calculateDaysUntil(project.deadline),
      recommendedAction: getRecommendedAction(riskScore)
    };
  });
  
  return { projects: projectRisks, summary: ... };
}
```

---

### Endpoint 3: `GET /documents/analytics/recruiters/effectiveness`

**Purpose:** Recruiter performance analysis

**Response:**
```typescript
{
  success: boolean;
  data: {
    recruiters: Array<{
      recruiterId: string;
      recruiterName: string;
      effectivenessScore: number;      // 0-100
      rank: number;                   // 1-based
      complianceRate: number;          // %
      firstTimeVerificationRate: number;  // %
      documentQualityScore: number;    // 0-100
      onTimeSubmissionRate: number;    // %
      totalCandidates: number;
      totalDocuments: number;
      avgDelayCaused: number;         // days
      trend: 'improving' | 'stable' | 'declining';
    }>;
    summary: {
      totalRecruiters: number;
      topPerformers: number;         // Top 20%
      needsHelp: number;              // Bottom 20%
    };
  };
  message: string;
}
```

---

### Endpoint 4: `GET /documents/analytics/verification/capacity`

**Purpose:** Verification team capacity analysis

**Response:**
```typescript
{
  success: boolean;
  data: {
    verifiers: Array<{
      verifierId: string;
      verifierName: string;
      throughput: number;              // docs/day
      avgVerificationTime: number;    // hours
      qualityScore: number;            // 0-100
      slaBreaches: number;
      currentLoad: number;             // pending docs assigned
      status: 'overloaded' | 'optimal' | 'underutilized';
    }>;
    teamMetrics: {
      totalBacklog: number;
      backlogGrowth: number;          // % change
      avgThroughput: number;
      totalSlaBreaches: number;
      capacityUtilization: number;    // %
    };
  };
  message: string;
}
```

---

### Endpoint 5: `GET /documents/analytics/quality`

**Purpose:** Quality debt and resubmission analysis

**Response:**
```typescript
{
  success: boolean;
  data: {
    qualityDebtScore: number;        // 0-100
    fastRejections: number;          // rejected within 1 hour
    multipleResubmissions: number;    // resubmissionCount > 2
    reVerificationFrequency: number;   // verified > 1 time
    rejectionReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
    resubmissionRate: number;         // %
    firstTimeVerificationRate: number; // %
  };
  message: string;
}
```

---

## 4.2 Daily Analytics Snapshot Model

**Why:** Some metrics are expensive to calculate on-the-fly (e.g., project risk scores for 1000+ projects). Daily snapshots improve performance.

**New Model:**
```prisma
model DocumentAnalyticsSnapshot {
  id          String   @id @default(cuid())
  snapshotDate DateTime @default(now())
  
  // Project-level aggregates
  totalProjects: Int
  highRiskProjects: Int
  mediumRiskProjects: Int
  lowRiskProjects: Int
  
  // Candidate-level aggregates
  totalCandidates: Int
  blockedCandidates: Int
  avgOnboardingDelay: Float  // days
  
  // Document-level aggregates
  totalDocuments: Int
  pendingDocuments: Int
  verifiedDocuments: Int
  rejectedDocuments: Int
  avgVerificationTime: Float  // hours
  
  // Recruiter aggregates
  totalRecruiters: Int
  topPerformers: Int
  needsHelp: Int
  
  // Verification team aggregates
  totalBacklog: Int
  backlogGrowth: Float  // %
  avgThroughput: Float  // docs/day
  
  // Quality metrics
  qualityDebtScore: Float
  resubmissionRate: Float
  firstTimeVerificationRate: Float
  
  createdAt DateTime @default(now())
  
  @@unique([snapshotDate])
  @@index([snapshotDate])
  @@map("document_analytics_snapshots")
}
```

**Snapshot Job (Daily at 2 AM):**
```typescript
@Cron('0 2 * * *')
async generateDailySnapshot() {
  const analytics = await this.calculateAllMetrics();
  
  await this.prisma.documentAnalyticsSnapshot.create({
    data: {
      snapshotDate: new Date(),
      ...analytics
    }
  });
}
```

**Usage:**
- Executive dashboard uses snapshot for historical trends
- Real-time endpoints still calculate on-the-fly for current data
- Snapshot enables "last 30 days trend" without expensive queries

---

## 4.3 Performance Considerations

1. **Indexing:**
   ```sql
   CREATE INDEX idx_doc_verification_status_created 
   ON candidate_project_document_verifications(status, created_at);
   
   CREATE INDEX idx_doc_history_action_performed 
   ON document_verification_history(action, performed_at);
   
   CREATE INDEX idx_candidate_projects_substatus 
   ON candidate_projects(sub_status_id, recruiter_id);
   ```

2. **Caching:**
   - Cache executive analytics for 15 minutes
   - Cache project risk scores for 1 hour
   - Invalidate on document verification events

3. **Query Optimization:**
   - Use aggregation queries instead of fetching all records
   - Use `GROUP BY` for counts
   - Use `EXISTS` instead of `JOIN` when checking presence

---

# PHASE 5: FRONTEND IMPLEMENTATION PLAN

## 5.1 Component Architecture

```
web/src/features/analytics/
├── api/
│   └── documents-analytics.api.ts        # RTK Query endpoints
├── components/
│   ├── executive/
│   │   ├── ExecutiveKpiCards.tsx
│   │   ├── ProjectRiskHeatmap.tsx
│   │   ├── RecruiterPerformanceRanking.tsx
│   │   └── EarlyWarningAlerts.tsx
│   ├── operations/
│   │   ├── WorkflowStages.tsx
│   │   ├── BottleneckAnalysis.tsx
│   │   ├── VerifierEfficiencyTable.tsx
│   │   └── RejectionAnalysisChart.tsx
│   └── recruiter/
│       ├── MyCandidatesStatus.tsx
│       ├── MyPerformanceMetrics.tsx
│       └── QualityFeedback.tsx
└── views/
    ├── ExecutiveDocumentAnalyticsPage.tsx
    ├── OperationsDocumentAnalyticsPage.tsx
    └── RecruiterDocumentAnalyticsPage.tsx
```

---

## 5.2 Data Flow

```
Backend API
    ↓
RTK Query Hook (useGetExecutiveAnalyticsQuery)
    ↓
Component State (React)
    ↓
UI Rendering (Charts/Tables)
```

**Example:**
```typescript
// api/documents-analytics.api.ts
export const documentsAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExecutiveAnalytics: builder.query<
      ApiResponse<ExecutiveAnalyticsData>,
      void
    >({
      query: () => '/documents/analytics/executive',
      providesTags: ['DocumentAnalytics'],
    }),
    // ... other endpoints
  }),
});

// components/executive/ExecutiveKpiCards.tsx
export function ExecutiveKpiCards() {
  const { data, isLoading } = useGetExecutiveAnalyticsQuery();
  
  if (isLoading) return <LoadingSkeleton />;
  
  const analytics = data?.data;
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <KpiCard
        label="Projects at Risk"
        value={analytics.projectsAtRisk.high}
        trend={analytics.projectsAtRisk.trend}
        severity="high"
      />
      {/* ... */}
    </div>
  );
}
```

---

## 5.3 State Management

- **RTK Query** for server state (caching, invalidation)
- **React State** for UI state (filters, selections)
- **No Redux** for analytics (RTK Query handles it)

---

# PHASE 6: VALIDATION & SANITY CHECKS

## 6.1 Metric Validation

### Project Risk Score
**Validation:**
- ✅ Cannot be gamed: Based on actual document status, not self-reported
- ⚠️ Edge case: Project with 0 required docs → Risk score = 0 (correct)
- ⚠️ Edge case: Project with all optional docs → Risk score = 0 (correct)

### Recruiter Effectiveness
**Validation:**
- ✅ Cannot be gamed: Based on actual verification outcomes
- ⚠️ Edge case: Recruiter with 0 assigned candidates → Score = 0 (correct)
- ⚠️ Edge case: Recruiter with all candidates in "pending_documents" → Low score (correct)

### Quality Debt
**Validation:**
- ✅ Cannot be gamed: Based on actual resubmission history
- ⚠️ Edge case: New system with no history → Quality debt = 0 (may be misleading)

---

## 6.2 Data Accuracy Checks

1. **Timestamp Consistency:**
   - Verify `Document.createdAt` <= `CandidateProjectDocumentVerification.createdAt`
   - Verify `DocumentVerificationHistory.performedAt` is within reasonable range

2. **Status Consistency:**
   - Verify `Document.status` matches latest `CandidateProjectDocumentVerification.status`
   - Verify `CandidateProjects.subStatus` matches document verification state

3. **Count Accuracy:**
   - Verify `totalDocuments` = `verified + pending + rejected`
   - Verify `totalCandidates` = sum of candidates per recruiter

---

## 6.3 Assumptions Documented

1. **SLA Threshold:** 48 hours for document verification (configurable)
2. **Risk Score Weights:** Pending (40%), SLA (30%), Resubmission (20%), Expiry (10%)
3. **Recruiter Ranking:** Based on effectiveness score, top 20% = high performers
4. **Expiry Risk:** Documents expiring within 30 days are "at risk"
5. **Backlog Growth:** Calculated week-over-week

---

# FINAL RECOMMENDATIONS

## Implementation Priority

1. **Phase 1 (Week 1-2):** Executive Analytics Endpoint + Dashboard
2. **Phase 2 (Week 3-4):** Project Risk Analysis + Operations Dashboard
3. **Phase 3 (Week 5-6):** Recruiter Effectiveness + Recruiter Dashboard
4. **Phase 4 (Week 7-8):** Quality Metrics + Verification Capacity
5. **Phase 5 (Week 9+):** Daily Snapshots + Historical Trends

## Success Criteria

- ✅ Executives can identify at-risk projects within 30 seconds
- ✅ Operations team can identify bottlenecks within 1 minute
- ✅ Recruiters can see their performance vs. team average
- ✅ All metrics update in real-time (or near real-time)
- ✅ Dashboard loads in < 2 seconds

---

**END OF ARCHITECTURE DOCUMENT**

