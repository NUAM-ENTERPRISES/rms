# Mock Interview Coordination - UI Design Visual Guide

**Quick Visual Reference for UI/UX Design**

---

## 🎨 Design Language

### **Modern SaaS Aesthetic**

```
Inspired by: Linear, Stripe Dashboard, Notion
Key traits: Clean, Spacious, Card-based, Subtle shadows, Smooth transitions
```

### **Color Palette** (Using existing Tailwind tokens)

```css
/* Primary Actions */
--primary: 217 91% 60%; /* Blue - Call to action buttons */
--success: 142 76% 36%; /* Green - Success states */
--warning: 38 92% 50%; /* Amber - Warning states */
--danger: 0 84% 60%; /* Red - Destructive actions */

/* Neutrals */
--background: 220 14% 97%; /* Zinc-50 - Page background */
--foreground: 222 47% 11%; /* Zinc-900 - Primary text */
--muted: 220 14% 96%; /* Zinc-100 - Secondary background */
--border: 220 14% 90%; /* Zinc-200 - Borders */
```

---

## 📱 Page Layouts

### **1. Mock Interview Dashboard**

```
┌────────────────────────────────────────────────────────┐
│  Header: "Mock Interviews Dashboard"                  │
│  Subheader: "Manage and conduct candidate interviews" │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐      │
│  │ 📋        │  │ ✅        │  │ 📊        │      │
│  │  PENDING  │  │ COMPLETED │  │  APPROVAL │      │
│  │           │  │           │  │   RATE    │      │
│  │    12     │  │    45     │  │   78%     │      │
│  └────────────┘  └────────────┘  └────────────┘      │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │  Upcoming This Week         [View All →]     │     │
│  ├──────────────────────────────────────────────┤     │
│  │                                                │     │
│  │  ┌──────────────────────────────────────┐    │     │
│  │  │ 👤 John Doe                          │    │     │
│  │  │ Registered Nurse                     │    │     │
│  │  │ ─────────────────────────────────────│    │     │
│  │  │ 📅 Tomorrow, 10:00 AM                │    │     │
│  │  │ 🏥 ABC Hospital                      │    │     │
│  │  │                                       │    │     │
│  │  │ [Start Interview]  [Reschedule]      │    │     │
│  │  └──────────────────────────────────────┘    │     │
│  │                                                │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
└────────────────────────────────────────────────────────┘

Components:
- 3 stat cards (shadow-sm, rounded-xl)
- Upcoming interviews section (card with border)
- Interview preview cards (hover: shadow-md, scale-[1.02])
- Primary button (blue), Secondary button (zinc)
```

### **2. Conduct Interview Page**

```
┌────────────────────────────────────────────────────────┐
│  < Back to Interviews                                  │
│  Conduct Mock Interview                                │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────┐      │
│  │  👤 Candidate Information            [Card]  │      │
│  │  ─────────────────────────────────────────   │      │
│  │  Name: John Doe                              │      │
│  │  Role: Registered Nurse                      │      │
│  │  Project: ABC Hospital                       │      │
│  │  Experience: 5 years                         │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
│  ┌─────────────────────────────────────────────┐      │
│  │  Evaluation Checklist                        │      │
│  ├─────────────────────────────────────────────┤      │
│  │                                               │      │
│  │  📚 Technical Skills                         │      │
│  │                                               │      │
│  │  ┌──────────────────────────────────────┐   │      │
│  │  │ ☑️ Clinical knowledge                │   │      │
│  │  │ Rating: ⭐⭐⭐⭐⭐                    │   │      │
│  │  │ Notes: [Excellent understanding...]  │   │      │
│  │  └──────────────────────────────────────┘   │      │
│  │                                               │      │
│  │  ┌──────────────────────────────────────┐   │      │
│  │  │ ☑️ Patient assessment                │   │      │
│  │  │ Rating: ⭐⭐⭐⭐○                    │   │      │
│  │  │ Notes: [text input]                  │   │      │
│  │  └──────────────────────────────────────┘   │      │
│  │                                               │      │
│  │  💬 Communication                             │      │
│  │  [Similar checklist items...]                 │      │
│  │                                               │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
│  ┌─────────────────────────────────────────────┐      │
│  │  Overall Assessment                          │      │
│  │  ─────────────────────────────────────────   │      │
│  │  Overall Rating: ⭐⭐⭐⭐○                  │      │
│  │                                               │      │
│  │  Strengths:                                   │      │
│  │  [Textarea with 4 rows]                       │      │
│  │                                               │      │
│  │  Areas of Improvement:                        │      │
│  │  [Textarea with 4 rows]                       │      │
│  │                                               │      │
│  │  Final Decision:                              │      │
│  │  ┌────────────────────────────────────┐      │      │
│  │  │ ( ) ✅ Approved for Interview      │      │      │
│  │  │ ( ) 📚 Needs Training              │      │      │
│  │  │ ( ) ❌ Reject                       │      │      │
│  │  └────────────────────────────────────┘      │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
│  [Save Draft] [Submit & Complete Interview →]         │
│                                                         │
└────────────────────────────────────────────────────────┘

Design Notes:
- Progressive disclosure (expand checklist items)
- Auto-save draft every 30s
- Confirmation dialog before submit
- Success toast: "Interview completed successfully!"
- Redirect to dashboard
```

### **3. Interview Templates**

```
┌────────────────────────────────────────────────────────┐
│  Interview Templates             [+ Create Template]   │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Filter by Role: [All Roles ▾]        🔍 Search...     │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │  Registered Nurse Template           [Edit]  │     │
│  ├──────────────────────────────────────────────┤     │
│  │  ✓ 8 criteria | Updated: Nov 15, 2024       │     │
│  │                                                │     │
│  │  📚 Technical Skills (4 items)                │     │
│  │  • Clinical knowledge and application         │     │
│  │  • Patient assessment and care planning       │     │
│  │  • Medication administration                  │     │
│  │  • Emergency procedures                       │     │
│  │                                                │     │
│  │  💬 Communication (2 items)                   │     │
│  │  • Effective patient communication            │     │
│  │  • Team collaboration                         │     │
│  │                                                │     │
│  │  👔 Professionalism (2 items)                 │     │
│  │  • Ethical standards adherence                │     │
│  │  • Professional demeanor                      │     │
│  │                                                │     │
│  │  [Edit] [Duplicate] [Delete]                  │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │  Staff Nurse Template                [Edit]  │     │
│  │  [Similar structure...]                       │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
└────────────────────────────────────────────────────────┘

Interactions:
- Click card → Expand/collapse details
- Edit button → Open modal/drawer
- Duplicate → Pre-fill create form
- Delete → Confirmation dialog
- Drag & drop to reorder checklist items
```

---

## 🎯 Component Specifications

### **Status Badges**

```tsx
// Visual variants
<Badge variant="blue">⏱️ Scheduled</Badge>
<Badge variant="amber">🔄 In Progress</Badge>
<Badge variant="zinc">✅ Completed</Badge>
<Badge variant="green">✅ Approved</Badge>
<Badge variant="orange">📚 Needs Training</Badge>
<Badge variant="red">❌ Rejected</Badge>
```

### **Interview Card** (Reusable)

```
┌──────────────────────────────────────────────┐
│  👤 John Doe                          [Menu] │
│  Registered Nurse                            │
│  ──────────────────────────────────────────  │
│  📅 Tomorrow, 10:00 AM                       │
│  🏥 ABC Hospital                             │
│  Status: ⏱️ Scheduled                        │
│                                               │
│  [Primary Action] [Secondary Action]         │
└──────────────────────────────────────────────┘

Tailwind Classes:
- Card: "rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
- Header: "flex items-start justify-between"
- Content: "space-y-3 pt-4"
- Actions: "flex gap-2 mt-4 pt-4 border-t border-border"
```

### **Training Progress Bar**

```tsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="font-medium">Progress</span>
    <span className="text-muted-foreground">80%</span>
  </div>
  <Progress value={80} className="h-2" />
  <p className="text-xs text-muted-foreground">4 of 5 sessions completed</p>
</div>
```

### **Checklist Item** (Evaluation)

```
┌────────────────────────────────────────┐
│ ☑️ Clinical knowledge and application  │
│                                         │
│ Rating: ⭐⭐⭐⭐⭐ [1-5 stars]        │
│                                         │
│ Notes:                                  │
│ ┌─────────────────────────────────┐   │
│ │ [Textarea]                      │   │
│ │ Excellent understanding of...   │   │
│ └─────────────────────────────────┘   │
└────────────────────────────────────────┘

States:
- Unchecked: "opacity-60"
- Checked: "opacity-100"
- Hover: "bg-accent"
```

---

## 🧩 Reusable Components

### **From Existing Design System**

| Component  | Usage                | Customization                                       |
| ---------- | -------------------- | --------------------------------------------------- |
| `Card`     | All containers       | Use `shadow-sm` for subtle depth                    |
| `Button`   | Actions              | Primary (blue), Secondary (zinc), Destructive (red) |
| `Badge`    | Status indicators    | Custom colors per status                            |
| `Dialog`   | Modals               | Use for confirmations, forms                        |
| `Sheet`    | Side panels          | Use for details, filters                            |
| `Table`    | Data lists           | Use for session history                             |
| `Tabs`     | Content organization | Dashboard sections                                  |
| `Select`   | Dropdowns            | Role filters, coordinators                          |
| `Textarea` | Long text            | Remarks, notes, feedback                            |
| `Progress` | Training progress    | Custom colors per priority                          |
| `Tooltip`  | Help text            | Use liberally for clarity                           |
| `Avatar`   | User photos          | Candidate photos                                    |
| `Alert`    | Notifications        | Use for warnings, errors                            |

---

## 🎬 Animations & Transitions

### **Hover Effects**

```css
/* Card hover */
.hover\:shadow-md {
  transition: box-shadow 200ms ease-in-out;
}

/* Button hover */
.hover\:scale-\[1\.02\] {
  transition: transform 200ms ease-in-out;
}

/* List item hover */
.hover\:bg-accent {
  transition: background-color 150ms ease-in-out;
}
```

### **Loading States**

```tsx
// Skeleton for cards
<div className="animate-pulse space-y-4">
  <div className="h-32 bg-muted rounded-xl" />
  <div className="h-32 bg-muted rounded-xl" />
</div>

// Spinner for buttons
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### **Success Animations**

```tsx
// After completing interview
toast.success("Interview completed successfully!", {
  description: "Candidate status has been updated.",
  icon: "✅",
  duration: 3000,
});

// Confetti (optional for major achievements)
import confetti from "canvas-confetti";
confetti({ particleCount: 100, spread: 70 });
```

---

## 📏 Spacing & Layout

### **Container Widths**

```typescript
// Dashboard: Full width with max constraint
className = "container mx-auto px-4 max-w-7xl";

// Detail pages: Centered, narrower
className = "container mx-auto px-4 max-w-4xl";

// Forms: Even narrower
className = "container mx-auto px-4 max-w-2xl";
```

### **Grid Layouts**

```tsx
// Stats cards (3 columns)
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <StatCard />
  <StatCard />
  <StatCard />
</div>

// Interview cards (2 columns)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <InterviewCard />
  <InterviewCard />
</div>

// List view (single column)
<div className="space-y-4">
  <InterviewCard />
  <InterviewCard />
</div>
```

---

## 📱 Responsive Breakpoints

```typescript
// Mobile first approach
sm: "640px",   // Small devices
md: "768px",   // Tablets
lg: "1024px",  // Laptops
xl: "1280px",  // Desktops
2xl: "1536px"  // Large screens

// Usage example
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

---

## 🎭 Empty States

### **No Interviews**

```
┌────────────────────────────────────────┐
│                                         │
│          📋                             │
│                                         │
│   No mock interviews scheduled yet     │
│                                         │
│   Get started by creating interview    │
│   templates or wait for recruiters     │
│   to assign candidates.                │
│                                         │
│   [View Templates]                     │
│                                         │
└────────────────────────────────────────┘
```

### **No Templates**

```
┌────────────────────────────────────────┐
│                                         │
│          📝                             │
│                                         │
│   No interview templates yet           │
│                                         │
│   Create your first template to get    │
│   started with mock interviews.        │
│                                         │
│   [+ Create Template]                  │
│                                         │
└────────────────────────────────────────┘
```

---

## ♿ Accessibility Requirements

### **Keyboard Navigation**

```typescript
// Tab order
Tab → Focus next interactive element
Shift+Tab → Focus previous element
Enter → Activate button/link
Escape → Close dialog/modal
Space → Toggle checkbox/radio
Arrow Keys → Navigate within lists/menus
```

### **Screen Reader Labels**

```tsx
// Good examples
<Button aria-label="Start mock interview for John Doe">
  Start Interview
</Button>

<Input
  aria-label="Search interviews"
  placeholder="Search..."
/>

<div role="status" aria-live="polite">
  {loading ? "Loading interviews..." : `${count} interviews found`}
</div>
```

### **Focus Management**

```tsx
// After opening modal
useEffect(() => {
  modalRef.current?.focus();
}, [isOpen]);

// After closing modal
useEffect(() => {
  if (!isOpen) {
    triggerRef.current?.focus();
  }
}, [isOpen]);
```

---

## 🔔 Notification Patterns

### **Real-time Updates**

```typescript
// When new interview is assigned
toast.info("New mock interview assigned", {
  description: "John Doe - Registered Nurse",
  action: {
    label: "View",
    onClick: () => navigate(`/mock-interviews/${id}`),
  },
});

// When interview is completed
toast.success("Interview completed", {
  description: "Results have been recorded successfully.",
});

// When training is completed
toast.success("Training completed", {
  description: "John Doe is ready for reassessment.",
});
```

---

## 🎨 Icon Usage

### **Consistent Icon Set** (Lucide React)

```typescript
import {
  ClipboardCheck, // Mock interviews main icon
  Calendar, // Scheduling
  CheckCircle2, // Completion/success
  XCircle, // Rejection/failure
  BookOpen, // Training
  Users, // Candidates
  FileText, // Templates
  TrendingUp, // Progress/stats
  Clock, // Pending/scheduled
  AlertCircle, // Warnings
  Info, // Information
  Settings, // Configuration
  Filter, // Filtering
  Search, // Search
  Download, // Export
  Upload, // Import
} from "lucide-react";
```

---

## 🚀 Performance Optimizations

### **Code Splitting**

```typescript
// Lazy load heavy pages
const MockInterviewsPage = lazy(() => import("./views/MockInterviewsPage"));

// Wrap in Suspense
<Suspense fallback={<LoadingScreen />}>
  <MockInterviewsPage />
</Suspense>;
```

### **Virtualization** (for long lists)

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

// Only render visible items
const virtualizer = useVirtualizer({
  count: interviews.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
});
```

---

## 🎯 Call-to-Action Hierarchy

### **Primary Actions** (Most important)

```tsx
<Button size="lg" className="bg-primary text-primary-foreground">
  Start Interview
</Button>
```

### **Secondary Actions** (Supportive)

```tsx
<Button variant="outline" size="default">
  Reschedule
</Button>
```

### **Tertiary Actions** (Least emphasis)

```tsx
<Button variant="ghost" size="sm">
  View Details
</Button>
```

---

## 📊 Data Visualization

### **Statistics Display**

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
      <TrendingUp className="h-4 w-4 text-green-600" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">78%</div>
    <p className="text-xs text-muted-foreground">+12% from last month</p>
  </CardContent>
</Card>
```

---

## ✅ UI Checklist

### **Before Launch**

- [ ] All pages responsive (mobile, tablet, desktop)
- [ ] Dark mode support (if applicable)
- [ ] Loading states for all async operations
- [ ] Error states with recovery options
- [ ] Empty states with guidance
- [ ] Success confirmations
- [ ] Keyboard navigation tested
- [ ] Screen reader tested
- [ ] Color contrast validated (WCAG AA)
- [ ] Performance benchmarks met (<3s TTI)
- [ ] All interactive elements have hover states
- [ ] All buttons have focus rings
- [ ] All forms have validation
- [ ] All modals can be dismissed
- [ ] All toasts auto-dismiss or are dismissible

---

**Visual Guide Version**: 1.0  
**Last Updated**: November 24, 2024  
**Companion Document**: MOCK_INTERVIEW_FRONTEND_ANALYSIS_AND_PLAN.md
