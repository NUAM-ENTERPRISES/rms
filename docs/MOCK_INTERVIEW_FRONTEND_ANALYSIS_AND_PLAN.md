# Mock Interview Coordination - Frontend Analysis & Implementation Plan

**Project**: Affiniks RMS  
**Feature**: Mock Interview Coordination & Training  
**Date**: November 24, 2024  
**Status**: Planning & Design Phase

---

## 📋 Table of Contents

1. [Current Frontend Architecture Analysis](#current-frontend-architecture-analysis)
2. [Compliance with FE_GUIDELINES](#compliance-with-fe_guidelines)
3. [Role-Based Access Control](#role-based-access-control)
4. [Feature Structure & Organization](#feature-structure--organization)
5. [UI/UX Design Structure](#uiux-design-structure)
6. [Implementation Plan](#implementation-plan)
7. [API Integration Strategy](#api-integration-strategy)
8. [Testing Strategy](#testing-strategy)

---

## 1. Current Frontend Architecture Analysis

### 📁 **Project Structure**

The RMS frontend follows a **domain-driven, feature-first architecture** as mandated by `FE_GUIDELINES.md`:

```
/src
  /app                       # App configuration (store, router, providers)
    /api/baseApi.ts         # ✅ Single RTK Query API (all endpoints inject here)
    store.ts                # Redux store

  /entities                  # Domain models & business rules
    /candidate              # Candidate domain logic
    /project                # Project domain logic

  /features                  # Self-contained feature modules
    /candidates             # Candidate management
    /projects               # Project management
    /interviews             # Client interviews (existing)
    /documents              # Document verification
    /teams                  # Team management
    /clients                # Client management
    /notifications          # Notification system

  /layout                    # App shell (Header, Sidebar, Breadcrumbs)
  /components                # Design system (atoms, molecules, organisms)
  /hooks                     # Shared hooks (useCan, usePermissions)
  /config/nav.ts            # ✅ Navigation configuration (role-based)
```

### 🎯 **Key Architectural Patterns Identified**

#### ✅ **1. Single API Pattern** (RTK Query Injection)

```typescript
// ALL features use baseApi.injectEndpoints()
export const candidatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidates: builder.query<Candidate[], void>({
      query: () => "/candidates",
      providesTags: ["Candidate"],
    }),
  }),
});
```

#### ✅ **2. Role-Based Navigation**

```typescript
// /config/nav.ts
{
  id: "interviews",
  label: "Interviews",
  path: "/interviews",
  icon: Calendar,
  roles: ["CEO", "Director", "Manager", "Recruiter"],
  // Filtered via useNav() hook in Sidebar
}
```

#### ✅ **3. Feature-First Structure**

```
/features/candidates/
  /data
    candidates.endpoints.ts    # RTK Query endpoints
    dto.ts                     # Wire types
    transforms.ts              # DTO <-> domain mapping
  /services                    # Pure business logic
  /hooks                       # Feature-specific UI logic
  /components                  # Feature UI components
  /views                       # Page components
  /types                       # Feature types
```

#### ✅ **4. Permission Guards**

- `useCan(permission)` - Check if user has permission
- `useHasRole(role)` - Check if user has role
- `<Can>` - Declarative permission wrapper
- `<ProtectedRoute>` - Route-level guards

---

## 2. Compliance with FE_GUIDELINES

### ✅ **Architecture Compliance Matrix**

| Guideline                    | Current Status        | Mock Interview Implementation           |
| ---------------------------- | --------------------- | --------------------------------------- |
| **Single API Source**        | ✅ Uses `baseApi`     | ✅ Will use `baseApi.injectEndpoints()` |
| **No Cross-Feature Imports** | ✅ Features isolated  | ✅ Only import from entities/shared     |
| **Feature-First Structure**  | ✅ Followed           | ✅ Will follow exact structure          |
| **Pure Business Logic**      | ✅ In entity services | ✅ Will separate I/O from logic         |
| **Composition-Only Views**   | ✅ Views are thin     | ✅ Views will only compose              |
| **Tailwind Tokens Only**     | ✅ No inline styles   | ✅ Will use design tokens               |
| **RTK Query Tags**           | ✅ Cache invalidation | ✅ Will use tags properly               |
| **React Hook Form + Zod**    | ✅ For all forms      | ✅ Will use for all forms               |
| **Role-Based Nav**           | ✅ useNav() filtering | ✅ Will add Interview Coordinator items |
| **Accessibility**            | ✅ WCAG AA            | ✅ Will maintain standards              |

### ✅ **Design System Compliance**

| Component                | Source              | Usage                     |
| ------------------------ | ------------------- | ------------------------- |
| Buttons, Inputs, Dialogs | ShadCN              | ✅ Reuse existing         |
| Forms                    | React Hook Form     | ✅ Reuse patterns         |
| Tables                   | ShadCN Table        | ✅ Reuse for checklists   |
| Modals/Sheets            | ShadCN Dialog/Sheet | ✅ Reuse                  |
| Notifications            | Sonner              | ✅ Existing integration   |
| Icons                    | Lucide React        | ✅ Consistent iconography |

---

## 3. Role-Based Access Control

### 🔐 **Interview Coordinator Role**

**Backend Permissions** (from seed):

```typescript
permissions: [
  "read:mock_interviews",
  "write:mock_interviews",
  "manage:mock_interviews",
  "schedule:mock_interviews",
  "conduct:mock_interviews",
  "read:interview_templates",
  "write:interview_templates",
  "manage:interview_templates",
  "read:training",
  "write:training",
  "manage:training",
  "assign:training",
  "complete:training",
  "read:candidates", // View candidate details
  "read:projects", // View project details
];
```

### 📍 **Navigation Structure for Interview Coordinator**

```typescript
// /config/nav.ts - NEW SECTION
{
  id: "mock-interviews",
  label: "Mock Interviews",
  icon: ClipboardCheck,  // New icon
  permissions: ["read:mock_interviews"],
  children: [
    {
      id: "mock-interviews-dashboard",
      label: "Dashboard",
      path: "/mock-interviews/dashboard",
      permissions: ["read:mock_interviews"],
    },
    {
      id: "mock-interviews-list",
      label: "My Interviews",
      path: "/mock-interviews",
      permissions: ["read:mock_interviews"],
    },
    {
      id: "mock-interviews-templates",
      label: "Interview Templates",
      path: "/mock-interviews/templates",
      permissions: ["read:interview_templates"],
    },
    {
      id: "training-assignments",
      label: "Training Assignments",
      path: "/training/assignments",
      permissions: ["read:training"],
    },
  ],
},
```

### 🚫 **Hidden from Other Roles**

- Navigation items automatically filtered by `useNav()` hook
- No manual role checking needed
- Backend enforces permissions even if UI is bypassed

---

## 4. Feature Structure & Organization

### 📁 **New Feature Directories**

```
/src/features/
  /mock-interview-coordination/    # NEW PARENT FEATURE
    /templates/                     # Template management
      /data
        templates.endpoints.ts      # RTK Query endpoints
        dto.ts                      # Wire types from backend
        transforms.ts               # DTO <-> domain transforms
      /components
        TemplateList.tsx
        TemplateForm.tsx
        TemplateCard.tsx
        ChecklistItemForm.tsx
      /views
        TemplatesPage.tsx
        CreateTemplatePage.tsx
        EditTemplatePage.tsx
      /hooks
        useTemplateForm.ts
        useRoleTemplates.ts
      /types
        index.ts
      index.ts

    /interviews/                    # Mock interview management
      /data
        mock-interviews.endpoints.ts
        dto.ts
        transforms.ts
      /components
        MockInterviewCard.tsx
        MockInterviewForm.tsx
        MockInterviewDetails.tsx
        CompletionForm.tsx
        ChecklistSection.tsx
        AssessmentForm.tsx
      /views
        MockInterviewsPage.tsx
        MockInterviewDetailsPage.tsx
        CompleteMockInterviewPage.tsx
        MockInterviewDashboard.tsx
      /hooks
        useMockInterview.ts
        useCompletionForm.ts
      /types
      index.ts

    /training/                      # Training management
      /data
        training.endpoints.ts
        dto.ts
        transforms.ts
      /components
        TrainingAssignmentCard.tsx
        TrainingForm.tsx
        TrainingSessionForm.tsx
        TrainingProgress.tsx
      /views
        TrainingAssignmentsPage.tsx
        TrainingDetailsPage.tsx
        CreateTrainingPage.tsx
      /hooks
        useTrainingForm.ts
        useTrainingProgress.ts
      /types
      index.ts

    /shared                         # Shared between sub-features
      /components
        CoordinatorStats.tsx
        StatusBadge.tsx
      /hooks
        useCoordinatorData.ts
      /types
        common.ts
      index.ts
```

### 🔗 **Integration Points**

#### **1. Candidate-Project Integration**

```typescript
// Existing: /features/candidates/views/CandidateProjectDetailsPage.tsx
// ADD: "Send to Mock Interview" button (for recruiters)

// Existing: /features/candidates/components/CandidateProjectPipeline.tsx
// ADD: Mock Interview stage visualization
```

#### **2. Navigation Integration**

```typescript
// /config/nav.ts
// ADD: Mock Interviews parent item with children
```

#### **3. Notifications Integration**

```typescript
// /features/notifications/
// ADD: Mock interview notification types
// ADD: Training notification types
```

---

## 5. UI/UX Design Structure

### 🎨 **Design System Tokens**

```css
/* Already defined in project */
--background: 220 14% 97%; /* zinc-50 */
--foreground: 222 47% 11%; /* zinc-900 */
--primary: 217 91% 60%; /* blue-500/600-ish */
--muted: 220 14% 96%; /* zinc-100 */
--border: 220 14% 90%; /* zinc-200 */
--danger: 0 84% 60%; /* red-500/600-ish */
--success: 142 76% 36%; /* green-600 */
--warning: 38 92% 50%; /* amber-500 */
```

### 📐 **Layout Structure**

#### **1. Mock Interview Dashboard** (`/mock-interviews/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│  Mock Interviews Dashboard                                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │  Pending     │ │  Completed   │ │  Approval    │         │
│  │  Interviews  │ │  This Month  │ │  Rate        │         │
│  │     12       │ │     45       │ │    78%       │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Upcoming Interviews                  [View All →]  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ John Doe - Registered Nurse                │    │    │
│  │  │ Tomorrow, 10:00 AM                         │    │    │
│  │  │ Project: ABC Hospital                       │    │    │
│  │  │ [Start Interview] [Reschedule]             │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                       │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ Jane Smith - Staff Nurse                   │    │    │
│  │  │ Nov 28, 2:00 PM                            │    │    │
│  │  │ Project: XYZ Clinic                         │    │    │
│  │  │ [Start Interview] [Reschedule]             │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Recent Completions                  [View All →]  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  [Table with recent completions + decisions]        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### **2. My Interviews List** (`/mock-interviews`)

```
┌─────────────────────────────────────────────────────────────┐
│  My Mock Interviews                                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┬──────────────────┬───────────────────┐  │
│  │  [Tabs]        │  Filters:        │  Search:          │  │
│  │  • Pending(12) │  ☐ Today         │  [Search box]     │  │
│  │  • Completed   │  ☐ This Week     │                   │  │
│  │  • All         │  ☐ Passed Only   │                   │  │
│  └────────────────┴──────────────────┴───────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Card Grid / Table View Toggle: [⊞] [≡]            │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 📋 John Doe - Registered Nurse              │    │    │
│  │  │ ─────────────────────────────────────────── │    │    │
│  │  │ Project: ABC Hospital | Tomorrow 10:00 AM   │    │    │
│  │  │ Status: ⏱️ Scheduled                        │    │    │
│  │  │                                              │    │    │
│  │  │ [View Details] [Start Interview]            │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                       │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ ✅ Jane Smith - Staff Nurse                 │    │    │
│  │  │ ─────────────────────────────────────────── │    │    │
│  │  │ Project: XYZ Clinic | Completed Nov 20      │    │    │
│  │  │ Decision: ✅ Approved | Rating: ⭐⭐⭐⭐⭐  │    │    │
│  │  │                                              │    │    │
│  │  │ [View Report]                               │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### **3. Conduct Mock Interview** (`/mock-interviews/:id/conduct`)

```
┌─────────────────────────────────────────────────────────────┐
│  Conduct Mock Interview - John Doe                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Candidate Information                             │    │
│  │  ───────────────────────────────────────────────── │    │
│  │  Name: John Doe                                     │    │
│  │  Role: Registered Nurse                             │    │
│  │  Project: ABC Hospital                              │    │
│  │  Experience: 5 years                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Evaluation Checklist                              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  Technical Skills                                    │    │
│  │  ┌───────────────────────────────────────────────┐ │    │
│  │  │ ☑ Clinical knowledge and application          │ │    │
│  │  │   Rating: ⭐⭐⭐⭐⭐ [1-5]                      │ │    │
│  │  │   Notes: [text input]                         │ │    │
│  │  └───────────────────────────────────────────────┘ │    │
│  │  ┌───────────────────────────────────────────────┐ │    │
│  │  │ ☑ Patient assessment and care planning       │ │    │
│  │  │   Rating: ⭐⭐⭐⭐○ [1-5]                      │ │    │
│  │  │   Notes: [text input]                         │ │    │
│  │  └───────────────────────────────────────────────┘ │    │
│  │                                                       │    │
│  │  Communication                                       │    │
│  │  ┌───────────────────────────────────────────────┐ │    │
│  │  │ ☐ Effective patient and family communication │ │    │
│  │  │   Rating: ⭐⭐⭐○○ [1-5]                      │ │    │
│  │  │   Notes: [text input]                         │ │    │
│  │  └───────────────────────────────────────────────┘ │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Overall Assessment                                │    │
│  │  ───────────────────────────────────────────────── │    │
│  │  Overall Rating: ⭐⭐⭐⭐○ [1-5]                   │    │
│  │                                                       │    │
│  │  Strengths:                                          │    │
│  │  [textarea]                                          │    │
│  │                                                       │    │
│  │  Areas of Improvement:                               │    │
│  │  [textarea]                                          │    │
│  │                                                       │    │
│  │  Remarks:                                            │    │
│  │  [textarea]                                          │    │
│  │                                                       │    │
│  │  Decision:                                           │    │
│  │  ( ) ✅ Approved for Client Interview               │    │
│  │  ( ) 📚 Needs Training                              │    │
│  │  ( ) ❌ Reject                                       │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Save Draft]  [Submit & Complete Interview]                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### **4. Interview Templates** (`/mock-interviews/templates`)

```
┌─────────────────────────────────────────────────────────────┐
│  Interview Templates                    [+ Create Template] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Filter by Role: [Dropdown: All Roles ▾]              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Registered Nurse Template                   [Edit] │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ✓ 8 criteria | Last updated: Nov 15, 2024         │    │
│  │                                                       │    │
│  │  Technical Skills (4)                                │    │
│  │  • Clinical knowledge and application                │    │
│  │  • Patient assessment and care planning              │    │
│  │  • Medication administration                         │    │
│  │  • Emergency procedures                              │    │
│  │                                                       │    │
│  │  Communication (2)                                   │    │
│  │  • Effective patient and family communication        │    │
│  │  • Team collaboration                                │    │
│  │                                                       │    │
│  │  Professionalism (2)                                 │    │
│  │  • Adherence to ethical standards                    │    │
│  │  • Professional demeanor                             │    │
│  │                                                       │    │
│  │  [Edit Template] [Duplicate] [Delete]               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Staff Nurse Template                        [Edit] │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ✓ 6 criteria | Last updated: Nov 10, 2024         │    │
│  │  [Similar structure...]                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### **5. Training Assignments** (`/training/assignments`)

```
┌─────────────────────────────────────────────────────────────┐
│  Training Assignments                   [+ Assign Training] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┬──────────────────┬───────────────────┐  │
│  │  Status Filter │  Priority:       │  Search:          │  │
│  │  • Active (8)  │  ☐ High          │  [Search box]     │  │
│  │  • Completed   │  ☐ Medium        │                   │  │
│  │  • All         │  ☐ Low           │                   │  │
│  └────────────────┴──────────────────┴───────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📚 John Doe - Interview Skills Training            │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  Priority: 🔴 High | Assigned: Nov 20, 2024        │    │
│  │  Target Completion: Dec 5, 2024                     │    │
│  │                                                       │    │
│  │  Focus Areas:                                        │    │
│  │  • Communication skills                              │    │
│  │  • Interview etiquette                               │    │
│  │                                                       │    │
│  │  Progress: ████████░░ 80% (4/5 sessions)            │    │
│  │                                                       │    │
│  │  [View Details] [Add Session] [Complete]            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📚 Jane Smith - Technical Skills Training          │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  Priority: 🟡 Medium | Assigned: Nov 18, 2024      │    │
│  │  [Similar structure...]                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 🎨 **Color Scheme & Visual Language**

| Status              | Color                           | Badge Style       |
| ------------------- | ------------------------------- | ----------------- |
| **Scheduled**       | `bg-blue-100 text-blue-700`     | ⏱️ Scheduled      |
| **In Progress**     | `bg-amber-100 text-amber-700`   | 🔄 In Progress    |
| **Completed**       | `bg-zinc-100 text-zinc-700`     | ✅ Completed      |
| **Approved**        | `bg-green-100 text-green-700`   | ✅ Approved       |
| **Needs Training**  | `bg-orange-100 text-orange-700` | 📚 Needs Training |
| **Rejected**        | `bg-red-100 text-red-700`       | ❌ Rejected       |
| **High Priority**   | `bg-red-100 text-red-700`       | 🔴 High           |
| **Medium Priority** | `bg-yellow-100 text-yellow-700` | 🟡 Medium         |
| **Low Priority**    | `bg-green-100 text-green-700`   | 🟢 Low            |

### 🧩 **Component Reuse**

| Component  | Source       | Usage in Mock Interviews         |
| ---------- | ------------ | -------------------------------- |
| `Card`     | ShadCN       | Interview cards, template cards  |
| `Table`    | ShadCN       | Checklist, training sessions     |
| `Dialog`   | ShadCN       | Completion modals, confirmations |
| `Form`     | ShadCN + RHF | All forms                        |
| `Badge`    | ShadCN       | Status badges, priority badges   |
| `Tabs`     | ShadCN       | Dashboard tabs, interview tabs   |
| `Select`   | ShadCN       | Role selector, filters           |
| `Textarea` | ShadCN       | Remarks, notes                   |
| `Button`   | ShadCN       | All actions                      |
| `Tooltip`  | ShadCN       | Help text, icon explanations     |
| `Progress` | ShadCN       | Training progress bars           |
| `Avatar`   | ShadCN       | Candidate photos                 |
| `Alert`    | ShadCN       | Warning messages                 |

---

## 6. Implementation Plan

### 📅 **Phase-Based Rollout**

#### **Phase 1: Foundation** (Week 1)

**Goal**: Set up feature structure and basic data layer

1. ✅ Create feature directory structure
2. ✅ Define DTOs and types
3. ✅ Create RTK Query endpoints (inject into baseApi)
4. ✅ Create domain models in `/entities`
5. ✅ Add navigation configuration
6. ✅ Create routing structure

**Deliverables**:

- Feature folder structure
- API endpoints working
- Navigation visible to Interview Coordinator role only
- Basic routing setup

---

#### **Phase 2: Templates Management** (Week 1-2)

**Goal**: Interview Coordinators can manage templates

1. ✅ Create Templates List Page
2. ✅ Create Template Form (Create/Edit)
3. ✅ Create Checklist Item Management
4. ✅ Implement template CRUD operations
5. ✅ Add role filtering
6. ✅ Add bulk operations

**Components to Create**:

```
/features/mock-interview-coordination/templates/
  /components
    TemplateList.tsx               # List all templates
    TemplateCard.tsx               # Single template card
    TemplateForm.tsx               # Create/Edit form
    ChecklistItemForm.tsx          # Add/Edit checklist criteria
    ChecklistItemList.tsx          # Display checklist items
    RoleFilter.tsx                 # Filter by role
  /views
    TemplatesPage.tsx              # Main templates page
    CreateTemplatePage.tsx         # Create new template
    EditTemplatePage.tsx           # Edit existing template
```

**Forms Required**:

- Template creation (role, category, criteria)
- Checklist item creation
- Bulk template import

---

#### **Phase 3: Mock Interviews Core** (Week 2-3)

**Goal**: Core mock interview functionality

1. ✅ Create Mock Interviews Dashboard
2. ✅ Create My Interviews List
3. ✅ Create Interview Details Page
4. ✅ Create Completion/Assessment Form
5. ✅ Implement checklist evaluation
6. ✅ Implement status updates
7. ✅ Add notification integration

**Components to Create**:

```
/features/mock-interview-coordination/interviews/
  /components
    MockInterviewCard.tsx          # Interview card display
    MockInterviewDetails.tsx       # Detailed view
    CompletionForm.tsx             # Complete interview form
    ChecklistSection.tsx           # Checklist evaluation
    AssessmentForm.tsx             # Overall assessment
    InterviewStats.tsx             # Statistics dashboard
    UpcomingInterviews.tsx         # Upcoming list
  /views
    MockInterviewDashboard.tsx     # Main dashboard
    MockInterviewsPage.tsx         # My interviews list
    MockInterviewDetailsPage.tsx   # Interview details
    CompleteMockInterviewPage.tsx  # Conduct interview
```

---

#### **Phase 4: Training Management** (Week 3-4)

**Goal**: Training assignment and tracking

1. ✅ Create Training Assignments List
2. ✅ Create Training Details Page
3. ✅ Create Training Form
4. ✅ Create Session Management
5. ✅ Implement progress tracking
6. ✅ Add status management

**Components to Create**:

```
/features/mock-interview-coordination/training/
  /components
    TrainingAssignmentCard.tsx     # Training card
    TrainingForm.tsx               # Assign training form
    TrainingSessionForm.tsx        # Add session form
    TrainingProgress.tsx           # Progress visualization
    SessionList.tsx                # Session history
  /views
    TrainingAssignmentsPage.tsx    # Main list page
    TrainingDetailsPage.tsx        # Detail view
    CreateTrainingPage.tsx         # Create assignment
```

---

#### **Phase 5: Integration & UX Polish** (Week 4-5)

**Goal**: Integrate with existing features

1. ✅ Add "Send to Mock Interview" to Candidate-Project view
2. ✅ Update Candidate Pipeline visualization
3. ✅ Add mock interview status badges
4. ✅ Integrate notification system
5. ✅ Add real-time updates (WebSocket)
6. ✅ Polish UX and transitions
7. ✅ Add loading states and error handling
8. ✅ Add empty states
9. ✅ Add confirmation dialogs

**Integration Points**:

```
/features/candidates/
  /views/CandidateProjectDetailsPage.tsx
    → ADD: "Send to Mock Interview" button (recruiters only)

  /components/CandidateProjectPipeline.tsx
    → ADD: Mock interview stage visualization
    → ADD: Training stage visualization

/features/notifications/
  → ADD: Mock interview notification handlers
  → ADD: Training notification handlers
```

---

#### **Phase 6: Testing & Documentation** (Week 5)

**Goal**: Ensure quality and maintainability

1. ✅ Write unit tests (Vitest + RTL)
2. ✅ Write integration tests
3. ✅ Write E2E tests for critical flows
4. ✅ Add Storybook stories for components
5. ✅ Update documentation
6. ✅ Conduct accessibility audit
7. ✅ Performance testing

**Testing Strategy**:

```
__tests__/
  templates/
    TemplatesList.test.tsx
    TemplateForm.test.tsx
    useTemplateForm.test.ts

  interviews/
    MockInterviewDashboard.test.tsx
    CompletionForm.test.tsx
    useMockInterview.test.ts

  training/
    TrainingAssignments.test.tsx
    TrainingForm.test.tsx
    useTrainingForm.test.ts
```

---

## 7. API Integration Strategy

### 📡 **RTK Query Endpoint Pattern**

All endpoints MUST follow the mandated pattern:

```typescript
// ✅ CORRECT: baseApi.injectEndpoints() pattern

// /features/mock-interview-coordination/interviews/data/mock-interviews.endpoints.ts
import { baseApi } from "@/app/api/baseApi";
import { MockInterviewDto, CompleteMockInterviewDto } from "./dto";
import { MockInterviewTransforms } from "./transforms";

export const mockInterviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMockInterviews: builder.query<MockInterview[], QueryParams>({
      query: (params) => ({
        url: "/mock-interviews",
        params,
      }),
      transformResponse: (response: ApiResponse<MockInterviewDto[]>) =>
        response.data.map(MockInterviewTransforms.toDomain),
      providesTags: ["MockInterview"],
    }),

    getMockInterview: builder.query<MockInterview, string>({
      query: (id) => `/mock-interviews/${id}`,
      transformResponse: (response: ApiResponse<MockInterviewDto>) =>
        MockInterviewTransforms.toDomain(response.data),
      providesTags: (result, error, id) => [{ type: "MockInterview", id }],
    }),

    completeMockInterview: builder.mutation<
      MockInterview,
      { id: string; data: CompleteMockInterviewDto }
    >({
      query: ({ id, data }) => ({
        url: `/mock-interviews/${id}/complete`,
        method: "POST",
        body: data,
      }),
      transformResponse: (response: ApiResponse<MockInterviewDto>) =>
        MockInterviewTransforms.toDomain(response.data),
      invalidatesTags: (result, error, { id }) => [
        { type: "MockInterview", id },
        "MockInterview",
        "Candidate", // Invalidate candidate cache (status changed)
      ],
    }),
  }),
});

export const {
  useGetMockInterviewsQuery,
  useGetMockInterviewQuery,
  useCompleteMockInterviewMutation,
} = mockInterviewsApi;
```

### 📋 **Cache Invalidation Strategy**

```typescript
tagTypes: [
  // Existing
  "Candidate",
  "Project",

  // NEW
  "MockInterview",
  "MockInterviewTemplate",
  "Training",
  "TrainingSession",
];
```

**Invalidation Rules**:

- Completing mock interview → invalidates `MockInterview` + `Candidate`
- Creating training → invalidates `Training` + `Candidate`
- Updating template → invalidates `MockInterviewTemplate`
- Adding session → invalidates `Training` + `TrainingSession`

---

## 8. Testing Strategy

### ✅ **Testing Pyramid**

```
        /\
       /  \      E2E (5%)
      /    \     - Critical user flows
     /------\
    /        \   Integration (20%)
   /----------\  - Feature workflows
  /            \
 /--------------\ Unit (75%)
                 - Components, hooks, services
```

### 🧪 **Test Coverage Requirements**

| Type              | Target         | Focus                        |
| ----------------- | -------------- | ---------------------------- |
| Unit Tests        | 80%+           | Components, hooks, utilities |
| Integration Tests | Critical flows | Form submission, API calls   |
| E2E Tests         | Happy paths    | End-to-end user journeys     |

### 📝 **Example Test Cases**

#### **1. Template Management**

```typescript
describe("TemplatesPage", () => {
  it("should display templates filtered by role", async () => {
    // Test role filtering
  });

  it("should create a new template", async () => {
    // Test template creation
  });

  it("should show validation errors for invalid input", async () => {
    // Test form validation
  });

  it("should only be accessible to Interview Coordinators", async () => {
    // Test role-based access
  });
});
```

#### **2. Mock Interview Completion**

```typescript
describe("CompleteMockInterviewPage", () => {
  it("should load interview details and checklist template", async () => {
    // Test data loading
  });

  it("should evaluate all checklist items", async () => {
    // Test checklist evaluation
  });

  it("should submit completion with decision", async () => {
    // Test submission
  });

  it("should update candidate status on completion", async () => {
    // Test status update
  });
});
```

---

## 9. Accessibility Checklist

### ♿ **WCAG AA Compliance**

- ✅ Semantic HTML (`<main>`, `<section>`, `<nav>`)
- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Focus management (modals, forms)
- ✅ ARIA labels for all interactive elements
- ✅ Color contrast >= 4.5:1 for text
- ✅ Screen reader support
- ✅ Error messages accessible
- ✅ Form labels properly associated
- ✅ Loading states announced
- ✅ Reduced motion support

---

## 10. Performance Considerations

### ⚡ **Optimization Strategies**

1. **Code Splitting**

   ```typescript
   const MockInterviewsPage = lazy(() => import("./views/MockInterviewsPage"));
   ```

2. **Memoization**

   ```typescript
   const memoizedChecklist = useMemo(
     () => computeChecklist(interview, template),
     [interview, template]
   );
   ```

3. **Virtualization** (for long lists)

   ```typescript
   import { useVirtualizer } from "@tanstack/react-virtual";
   ```

4. **Debounced Search**

   ```typescript
   const debouncedSearch = useDebounce(searchTerm, 300);
   ```

5. **Optimistic Updates**
   ```typescript
   completeMockInterview({
     optimisticUpdate: {
       id,
       status: "completed",
     },
   });
   ```

---

## 11. Security Considerations

### 🔒 **Security Measures**

1. **Backend Permission Enforcement** (primary)
2. **Frontend Permission Checks** (UX only)
3. **Form Validation** (Zod schemas)
4. **XSS Protection** (no `dangerouslySetInnerHTML`)
5. **CSRF Protection** (backend tokens)
6. **Access Token in Memory** (not localStorage)
7. **Sanitized User Input**

---

## 12. Deployment Checklist

### 🚀 **Pre-Deployment**

- [ ] All tests passing
- [ ] Linter passing
- [ ] TypeScript errors resolved
- [ ] Accessibility audit completed
- [ ] Performance benchmarks met
- [ ] Browser compatibility verified
- [ ] Mobile responsiveness tested
- [ ] Documentation updated
- [ ] Storybook stories added
- [ ] Environment variables configured

---

## 13. Success Metrics

### 📊 **KPIs to Track**

| Metric                    | Target  |
| ------------------------- | ------- |
| Page Load Time            | < 2s    |
| Time to Interactive       | < 3s    |
| Accessibility Score       | 100     |
| Test Coverage             | > 80%   |
| Bundle Size Increase      | < 100KB |
| User Task Completion Rate | > 95%   |

---

## 14. Risks & Mitigation

| Risk                             | Impact | Mitigation                                              |
| -------------------------------- | ------ | ------------------------------------------------------- |
| **Complex State Management**     | High   | Use RTK Query for server state, local state for UI only |
| **Performance with Large Lists** | Medium | Implement virtualization, pagination                    |
| **Cross-Feature Dependencies**   | Medium | Strict adherence to architecture, no cross-imports      |
| **API Changes**                  | Low    | Transform layer isolates domain from API changes        |
| **Browser Compatibility**        | Low    | Polyfills, modern browser requirements                  |

---

## 15. Future Enhancements

### 🔮 **Phase 2 Features** (Post-MVP)

1. **Advanced Analytics**

   - Interview performance trends
   - Training effectiveness metrics
   - Coordinator performance dashboards

2. **AI-Powered Features**

   - Interview transcript analysis
   - Automatic checklist suggestions
   - Training recommendations

3. **Collaboration Features**

   - Multi-coordinator interviews
   - Peer reviews
   - Feedback loops

4. **Advanced Scheduling**

   - Calendar integration
   - Automated reminders
   - Availability management

5. **Reporting & Export**
   - PDF report generation
   - Excel exports
   - Custom report builder

---

## 16. Conclusion

This implementation plan ensures:

✅ **Full compliance** with `FE_GUIDELINES.md` and `BE_GUIDELINES.md`  
✅ **Role-based access** (only Interview Coordinator sees features)  
✅ **Modern, professional SaaS UI** (Apple/Stripe-inspired)  
✅ **Maintainable architecture** (feature-first, domain-driven)  
✅ **Testable code** (80%+ coverage)  
✅ **Accessible** (WCAG AA)  
✅ **Performant** (code-split, optimized)

**Next Steps**: Get approval, then begin Phase 1 implementation.

---

**Document Version**: 1.0  
**Last Updated**: November 24, 2024  
**Author**: AI Assistant (following FE_GUIDELINES.md)
