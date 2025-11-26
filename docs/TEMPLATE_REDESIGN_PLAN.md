# Template System Redesign Plan

## Current Design (Atomic Templates)

- Each `MockInterviewChecklistTemplate` = one criterion/question
- Multiple templates for a role = multiple individual criteria

## New Design (Template Collections)

- **Template** = A named collection of questions organized by categories
- **TemplateItem** = Individual questions/criteria within a template
- A role can have many templates
- Each template can have multiple categories
- Each category can have multiple questions
- No duplicate categories within a single template

## New Schema Structure

```prisma
/// Mock Interview Template - A collection of questions for a role
model MockInterviewTemplate {
  id          String   @id @default(cuid())
  roleId      String
  role        RoleCatalog @relation(fields: [roleId], references: [id], onDelete: Cascade)

  name        String   // e.g., "Standard RN Interview Template"
  description String?  // Optional description
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items       MockInterviewTemplateItem[]

  @@unique([roleId, name]) // Prevent duplicate template names for same role
  @@index([roleId])
  @@index([isActive])
  @@map("mock_interview_templates")
}

/// Questions/Criteria within a template, organized by category
model MockInterviewTemplateItem {
  id         String   @id @default(cuid())
  templateId String
  template   MockInterviewTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  category   String   // technical_skills, communication, professionalism, role_specific
  criterion  String   // The question/criterion to evaluate
  order      Int      @default(0) // Order within category

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([templateId, category, criterion]) // Prevent duplicate criteria in same category
  @@index([templateId])
  @@index([category])
  @@map("mock_interview_template_items")
}
```

## Key Changes

1. **Template becomes a collection** with a name and description
2. **TemplateItems** are the individual questions, grouped by category
3. **Unique constraint** on `[templateId, category, criterion]` prevents exact duplicates
4. **Categories can repeat** across different templates, but not within the same template (enforced by application logic)

## Workflow Changes

### Before (Current):

1. Coordinator creates individual criteria one by one
2. When conducting interview, all criteria for role are shown
3. No grouping or selection

### After (New):

1. Coordinator creates a **template** with a name (e.g., "Standard RN Interview")
2. Coordinator adds **multiple categories** to the template
3. Coordinator adds **multiple questions** to each category
4. When conducting interview, coordinator **selects a template**
5. All questions from selected template are shown, grouped by category

## Migration Strategy

1. Create new tables: `mock_interview_templates` and `mock_interview_template_items`
2. Migrate existing data:
   - Group existing templates by role
   - Create a default template for each role
   - Move existing criteria to template items
3. Update backend services
4. Update frontend UI
5. Deprecate old endpoints (keep for backward compatibility initially)

## API Changes

### New Endpoints:

```
POST   /api/mock-interview-templates              - Create template
GET    /api/mock-interview-templates              - List templates
GET    /api/mock-interview-templates/:id          - Get template with items
PATCH  /api/mock-interview-templates/:id           - Update template
DELETE /api/mock-interview-templates/:id          - Delete template

POST   /api/mock-interview-templates/:id/items     - Add item to template
PATCH  /api/mock-interview-templates/:id/items/:itemId - Update item
DELETE /api/mock-interview-templates/:id/items/:itemId - Remove item

GET    /api/mock-interview-templates/role/:roleId - Get templates for role
```

### Updated Interview Flow:

```
POST   /api/mock-interviews                        - Schedule interview (now includes templateId)
GET    /api/mock-interviews/:id                   - Get interview (includes selected template)
```

## Frontend Changes

1. **Templates Page**: Show templates as cards (not individual criteria)
2. **Template Detail Page**: Show template with categories and questions
3. **Template Editor**: Add/remove categories and questions
4. **Conduct Interview Page**: Select template first, then show questions grouped by category
