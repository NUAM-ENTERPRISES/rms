# Template System Redesign Summary

## ✅ New Design Implemented

### Schema Changes

**Before (Atomic Templates):**

- `MockInterviewChecklistTemplate` = One criterion per row
- Multiple rows = Multiple individual criteria

**After (Template Collections):**

- `MockInterviewTemplate` = Named collection with multiple questions
- `MockInterviewTemplateItem` = Individual questions within a template, organized by category
- `MockInterview.templateId` = Links interview to selected template

### New Structure

```
RoleCatalog (e.g., "Registered Nurse")
  └─> MockInterviewTemplate (e.g., "Standard RN Interview")
      ├─> TemplateItem (category: "technical_skills", criterion: "Medication Administration")
      ├─> TemplateItem (category: "technical_skills", criterion: "Vital Signs Monitoring")
      ├─> TemplateItem (category: "communication", criterion: "Patient Communication")
      └─> TemplateItem (category: "professionalism", criterion: "Ethical Conduct")
```

### Key Features

1. ✅ **Multiple templates per role** - A role can have many templates
2. ✅ **Multiple categories per template** - Each template can have different categories
3. ✅ **Multiple questions per category** - Each category can have multiple criteria
4. ✅ **No duplicate categories** - Enforced by application logic (can add unique constraint if needed)
5. ✅ **Template selection** - Coordinator selects a template when conducting interview

### Schema Details

```prisma
model MockInterviewTemplate {
  id          String
  roleId      String
  name        String        // e.g., "Standard RN Interview Template"
  description String?
  isActive    Boolean
  items       MockInterviewTemplateItem[]
  mockInterviews MockInterview[]

  @@unique([roleId, name]) // Prevent duplicate names per role
}

model MockInterviewTemplateItem {
  id         String
  templateId String
  category   String        // technical_skills, communication, etc.
  criterion  String        // The question to evaluate
  order      Int

  @@unique([templateId, category, criterion]) // Prevent exact duplicates
}

model MockInterview {
  // ... existing fields ...
  templateId String?       // Selected template
  template   MockInterviewTemplate?
}
```

## 🔄 What Needs to Be Updated

### 1. Backend Services

- [ ] Update `MockInterviewTemplatesService` to work with new structure
- [ ] Add methods to manage template items (add/remove questions)
- [ ] Update `MockInterviewsService` to handle template selection
- [ ] Add validation: no duplicate categories within a template

### 2. DTOs

- [ ] Update `CreateMockInterviewTemplateDto` (add name, description)
- [ ] Create `CreateTemplateItemDto` for adding questions
- [ ] Update `CreateMockInterviewDto` (add optional templateId)

### 3. Frontend

- [ ] Update TemplatesPage to show templates (not individual criteria)
- [ ] Create TemplateDetailPage to manage template items
- [ ] Update ConductMockInterviewPage to:
  - Show template selector
  - Load questions from selected template
  - Group by category

### 4. Migration

- [ ] Create migration to:
  - Create new tables
  - Migrate existing data (group by role, create default templates)
  - Add templateId to mock_interviews table

## 📋 Next Steps

1. **Create Migration** - Generate Prisma migration for schema changes
2. **Update Backend** - Refactor services to new structure
3. **Update Frontend** - Redesign UI for template collections
4. **Data Migration** - Convert existing templates to new format
5. **Testing** - Test template creation, selection, and interview flow

## 🎯 User Flow (New)

1. **Template Management**:

   - Coordinator creates template: "Standard RN Interview"
   - Adds category: "Technical Skills"
   - Adds questions to category
   - Adds another category: "Communication"
   - Adds questions to that category
   - Saves template

2. **Conducting Interview**:
   - Coordinator opens interview
   - Selects template from dropdown (e.g., "Standard RN Interview")
   - System loads all questions from template, grouped by category
   - Coordinator fills assessment
   - Completes interview

This design is much more intuitive and allows for better organization of interview questions!
