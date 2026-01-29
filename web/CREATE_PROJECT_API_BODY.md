# Create Project API - Complete Request Body Structure

## Endpoint
**POST** `/projects`

## Authentication
Bearer Token Required

## Required Permission
`manage:projects`

---

## Complete Request Body Structure

```typescript
{
  // ==================== BASIC PROJECT INFO ====================
  
  "title": "string",                    // ✅ REQUIRED - Project title (min 2 chars)
  
  "description": "string",              // ⚪ OPTIONAL - Project description
  
  "deadline": "2024-12-31T23:59:59.000Z", // ⚪ OPTIONAL - ISO 8601 date-time string
  
  "status": "active",                   // ⚪ OPTIONAL - Default: "active"
                                        // Options: "active" | "completed" | "cancelled"
  
  "priority": "medium",                 // ⚪ OPTIONAL - Default: "medium"
                                        // Options: "low" | "medium" | "high" | "urgent"
  
  // ==================== RELATIONSHIPS ====================
  
  "clientId": "string",                 // ⚪ OPTIONAL - Client ID (CUID format)
  
  "teamId": "string",                   // ⚪ OPTIONAL - Team ID (CUID format)
  
  "countryCode": "US",                  // ⚪ OPTIONAL - ISO-2 country code (exactly 2 chars)
                                        // Examples: "US", "CA", "GB", "IN", "SA"
  
  // ==================== PROJECT SETTINGS ====================
  
  "projectType": "private",             // ⚪ OPTIONAL - Default: "private"
                                        // Options: "private" | "ministry"
  
  "resumeEditable": true,               // ⚪ OPTIONAL - Default: true
                                        // Can resume be edited per requirements?
  
  "groomingRequired": "formal",         // ⚪ OPTIONAL - Default: "formal"
                                        // Options: "formal" | "casual" | "not_specified"
  
  "hideContactInfo": true,              // ⚪ OPTIONAL - Default: true
                                        // Hide email/mobile for private projects?
  
  "requiredScreening": false,           // ⚪ OPTIONAL - Default: false
                                        // Is additional candidate screening required?
  
  // ==================== ROLES NEEDED ====================
  
  "rolesNeeded": [                      // ⚪ OPTIONAL - Array of role requirements
    {
      // --- Basic Role Info (REQUIRED for each role) ---
      "designation": "string",          // ✅ REQUIRED - Job title/designation
      "quantity": 5,                    // ✅ REQUIRED - Number of positions (min: 1)
      
      // --- Priority & Experience ---
      "priority": "medium",             // ⚪ OPTIONAL - Default: "medium"
                                        // Options: "low" | "medium" | "high" | "urgent"
      
      "minExperience": 2,               // ⚪ OPTIONAL - Min years (min: 0)
      "maxExperience": 10,              // ⚪ OPTIONAL - Max years (min: 0)
      
      "specificExperience": "[\"ICU\", \"ER\", \"Leadership\"]", // ⚪ OPTIONAL - JSON string array
      
      // --- Education Requirements ---
      "educationRequirementsList": [    // ⚪ OPTIONAL - Array of qualifications
        {
          "qualificationId": "string",  // ✅ REQUIRED - Qualification ID from catalog
          "mandatory": true             // ✅ REQUIRED - Is this qualification mandatory?
        }
      ],
      
      "institutionRequirements": "string", // ⚪ OPTIONAL - Institution criteria
      
      // --- Certifications & Skills ---
      "requiredCertifications": "[\"RN\", \"BLS\", \"ACLS\"]", // ⚪ OPTIONAL - JSON string array
      
      "skills": "[\"Nursing\", \"Patient Care\"]",             // ⚪ OPTIONAL - JSON string array
      "technicalSkills": "[\"EPIC\", \"Ventilator\"]",         // ⚪ OPTIONAL - JSON string array
      "requiredSkills": "[\"Emergency Response\"]",            // ⚪ OPTIONAL - JSON string array
      
      // --- Language & Licenses ---
      "languageRequirements": "[\"English\", \"Spanish\"]",    // ⚪ OPTIONAL - JSON string array
      "licenseRequirements": "[\"State RN License\"]",         // ⚪ OPTIONAL - JSON string array
      
      // --- Background Checks ---
      "backgroundCheckRequired": true,  // ⚪ OPTIONAL - Default: true
      "drugScreeningRequired": true,    // ⚪ OPTIONAL - Default: true
      
      // --- Work Schedule ---
      "shiftType": "day",               // ⚪ OPTIONAL
                                        // Options: "day" | "night" | "rotating" | "flexible"
      
      "onCallRequired": false,          // ⚪ OPTIONAL - Default: false
      
      "physicalDemands": "string",      // ⚪ OPTIONAL - Physical requirements description
      
      // --- Compensation ---
      "salaryRange": "{\"min\": 60000, \"max\": 80000, \"currency\": \"USD\"}", // ⚪ OPTIONAL - JSON string
                                        // MUST be a stringified JSON object with min, max, currency
                                        // Use: JSON.stringify({min: 60000, max: 80000, currency: "USD"})
      "benefits": "string",             // ⚪ OPTIONAL - Benefits description
      "relocationAssistance": false,    // ⚪ OPTIONAL - Default: false
      
      // --- Employment Type ---
      "employmentType": "permanent",    // ⚪ OPTIONAL - Default: "permanent"
                                        // Options: "contract" | "permanent"
      
      "contractDurationYears": 2,       // ⚪ OPTIONAL - For contract roles only (1-10 years)
      
      "visaType": "direct_visa",           // ⚪ OPTIONAL - Default: "direct_visa"
                                        // Options: "direct_visa" | "company_visa"
      
      // --- Candidate Requirements ---
      "genderRequirement": "all",       // ⚪ OPTIONAL - Default: "all"
                                        // Options: "female" | "male" | "all"
      
      "candidateStates": "[\"state1\", \"state2\"]",     // ⚪ OPTIONAL - JSON string array
      "candidateReligions": "[\"religion1\"]",           // ⚪ OPTIONAL - JSON string array
      
      // --- Physical Attributes ---
      "minHeight": 150,                 // ⚪ OPTIONAL - Min height in cm (min: 0)
      "maxHeight": 200,                 // ⚪ OPTIONAL - Max height in cm (min: 0)
      "minWeight": 50,                  // ⚪ OPTIONAL - Min weight in kg (min: 0)
      "maxWeight": 100,                 // ⚪ OPTIONAL - Max weight in kg (min: 0)
      
      // --- Additional ---
      "additionalRequirements": "string", // ⚪ OPTIONAL - Any other requirements
      "notes": "string"                 // ⚪ OPTIONAL - Additional notes
    }
  ],
  
  // ==================== DOCUMENT REQUIREMENTS ====================
  
  "documentRequirements": [             // ⚪ OPTIONAL - Array of required documents
    {
      "docType": "string",              // ✅ REQUIRED - Document type identifier
                                        // Examples: "passport", "degree", "license", "certificate"
      
      "mandatory": true,                // ✅ REQUIRED - Is this document mandatory?
      
      "description": "string"           // ⚪ OPTIONAL - Additional notes/requirements
    }
  ]
}
```

---

## Field Legend

- ✅ **REQUIRED** - Must be provided
- ⚪ **OPTIONAL** - Can be omitted (will use default if applicable)

---

## Example: Minimal Request

```json
{
  "title": "Emergency Department Staffing"
}
```

---

## Example: Simple Project with One Role

```json
{
  "title": "Emergency Department Staffing",
  "description": "Staffing for emergency department at City General Hospital",
  "deadline": "2024-12-31T23:59:59.000Z",
  "status": "active",
  "priority": "high",
  "clientId": "clm123abc456def789",
  "teamId": "clm456def789ghi012",
  "countryCode": "US",
  "projectType": "private",
  "requiredScreening": false,
  "rolesNeeded": [
    {
      "designation": "Registered Nurse",
      "quantity": 5,
      "priority": "high",
      "minExperience": 2,
      "maxExperience": 10,
      "employmentType": "permanent",
      "genderRequirement": "all"
    }
  ]
}
```

---

## Example: Complete Project with All Fields

```json
{
  "title": "ICU Nursing Staff Recruitment - Saudi Arabia",
  "description": "Urgent requirement for experienced ICU nurses for a major hospital in Riyadh",
  "deadline": "2025-03-31T23:59:59.000Z",
  "status": "active",
  "priority": "urgent",
  "clientId": "clm123abc456def789",
  "teamId": "clm456def789ghi012",
  "countryCode": "SA",
  "projectType": "private",
  "resumeEditable": true,
  "groomingRequired": "formal",
  "hideContactInfo": true,
  "requiredScreening": true,
  "rolesNeeded": [
    {
      "designation": "ICU Registered Nurse",
      "quantity": 10,
      "priority": "urgent",
      "minExperience": 3,
      "maxExperience": 15,
      "specificExperience": "[\"ICU\", \"Critical Care\", \"Ventilator Management\", \"ECMO\"]",
      "educationRequirementsList": [
        {
          "qualificationId": "clm789ghi012jkl345",
          "mandatory": true
        },
        {
          "qualificationId": "clm890hij123klm456",
          "mandatory": false
        }
      ],
      "institutionRequirements": "Accredited nursing program from recognized institution",
      "requiredCertifications": "[\"RN\", \"BLS\", \"ACLS\", \"PALS\"]",
      "skills": "[\"Critical Care Nursing\", \"Patient Assessment\", \"Emergency Response\", \"Family Communication\"]",
      "technicalSkills": "[\"EPIC EMR\", \"Ventilator Management\", \"Hemodynamic Monitoring\", \"CRRT\"]",
      "requiredSkills": "[\"ICU Nursing\", \"Critical Thinking\", \"Team Collaboration\"]",
      "languageRequirements": "[\"English\", \"Arabic\"]",
      "licenseRequirements": "[\"Valid RN License\", \"SCFHS Registration\"]",
      "backgroundCheckRequired": true,
      "drugScreeningRequired": true,
      "shiftType": "rotating",
      "shiftType": "rotating",
      "onCallRequired": true,
      "physicalDemands": "Must be able to stand for 12 hours, lift 50 pounds, and perform CPR",
      "salaryRange": "{\"min\": 5000, \"max\": 8000, \"currency\": \"USD\"}",
      "benefits": "Tax-free salary, accommodation, flight tickets, health insurance, 30 days annual leave",
      "employmentType": "contract",
      "contractDurationYears": 2,
      "visaType": "direct_visa",
      "genderRequirement": "all",
      "candidateStates": "[\"Kerala\", \"Tamil Nadu\", \"Karnataka\", \"Maharashtra\"]",
      "candidateReligions": "[\"all\"]",
      "minHeight": 155,
      "maxHeight": 190,
      "minWeight": 50,
      "maxWeight": 100,
      "additionalRequirements": "Must be willing to work night shifts and weekends. Previous Middle East experience preferred.",
      "notes": "Priority screening for candidates with ECMO and CRRT experience"
    },
    {
      "designation": "ICU Head Nurse",
      "quantity": 2,
      "priority": "high",
      "minExperience": 5,
      "maxExperience": 20,
      "specificExperience": "[\"ICU Management\", \"Staff Supervision\", \"Quality Improvement\"]",
      "educationRequirementsList": [
        {
          "qualificationId": "clm789ghi012jkl345",
          "mandatory": true
        },
        {
          "qualificationId": "clm901ijk234lmn567",
          "mandatory": true
        }
      ],
      "requiredCertifications": "[\"RN\", \"BLS\", \"ACLS\", \"PALS\", \"Leadership Certification\"]",
      "skills": "[\"Leadership\", \"Staff Management\", \"Quality Assurance\", \"Policy Development\"]",
      "technicalSkills": "[\"EPIC EMR\", \"Quality Metrics\", \"Budget Management\"]",
      "languageRequirements": "[\"English\", \"Arabic\"]",
      "employmentType": "contract",
      "contractDurationYears": 3,
      "salaryRange": "{\"min\": 7000, \"max\": 10000, \"currency\": \"USD\"}",
      "genderRequirement": "all"
    }
  ],
  "documentRequirements": [
    {
      "docType": "passport",
      "mandatory": true,
      "description": "Valid passport with at least 6 months validity from travel date"
    },
    {
      "docType": "nursing_degree",
      "mandatory": true,
      "description": "Bachelor's degree in Nursing or equivalent from accredited institution"
    },
    {
      "docType": "rn_license",
      "mandatory": true,
      "description": "Current and valid Registered Nurse license from home country"
    },
    {
      "docType": "bls_certificate",
      "mandatory": true,
      "description": "Valid BLS certification from AHA or equivalent"
    },
    {
      "docType": "acls_certificate",
      "mandatory": true,
      "description": "Valid ACLS certification"
    },
    {
      "docType": "experience_certificate",
      "mandatory": true,
      "description": "Experience certificates from all previous employers"
    },
    {
      "docType": "police_clearance",
      "mandatory": true,
      "description": "Police clearance certificate not older than 6 months"
    },
    {
      "docType": "medical_fitness",
      "mandatory": true,
      "description": "Medical fitness certificate from approved medical center"
    },
    {
      "docType": "recommendation_letter",
      "mandatory": false,
      "description": "Letters of recommendation from previous supervisors"
    }
  ]
}
```

---

## Important Notes for Frontend Development

### 1. **JSON String Fields**
Several fields require JSON string format (not plain arrays/objects):
- `specificExperience`
- `requiredCertifications`
- `skills`
- `technicalSkills`
- `requiredSkills`
- `languageRequirements`
- `licenseRequirements`
- `salaryRange`
- `candidateStates`
- `candidateReligions`

**Example:**
```javascript
// ❌ WRONG
"skills": ["Nursing", "Patient Care"]

// ✅ CORRECT
"skills": "[\"Nursing\", \"Patient Care\"]"
// or
"skills": JSON.stringify(["Nursing", "Patient Care"])

// For salaryRange (MUST be JSON object):
// ❌ WRONG
"salaryRange": "50000-80000 USD/year"
"salaryRange": {min: 60000, max: 80000, currency: "USD"}

// ✅ CORRECT
"salaryRange": "{\"min\": 60000, \"max\": 80000, \"currency\": \"USD\"}"
// or in JavaScript/TypeScript:
"salaryRange": JSON.stringify({min: 60000, max: 80000, currency: "USD"})
```

### 2. **Date Format**
Use ISO 8601 format for `deadline`:
```javascript
// ✅ CORRECT
"deadline": "2024-12-31T23:59:59.000Z"
"deadline": new Date("2024-12-31").toISOString()
```

### 3. **Default Values**
If you omit optional fields, these defaults will be used:
- `status`: `"active"`
- `priority`: `"medium"`
- `projectType`: `"private"`
- `resumeEditable`: `true`
- `groomingRequired`: `"formal"`
- `hideContactInfo`: `true`
- `requiredScreening`: `false`
- `backgroundCheckRequired`: `true` (in roles)
- `drugScreeningRequired`: `true` (in roles)
- `onCallRequired`: `false` (in roles)
- `relocationAssistance`: `false` (in roles)
- `employmentType`: `"permanent"` (in roles)
- `genderRequirement`: `"all"` (in roles)
- `visaType`: `"direct_visa"` (project-level)

### 4. **Validation Rules**
- `title`: Minimum 2 characters
- `countryCode`: Exactly 2 characters (ISO-2 format)
- `quantity`: Minimum 1
- `minExperience`, `maxExperience`: Minimum 0
- `contractDurationYears`: 1-10 years
- `minHeight`, `maxHeight`, `minWeight`, `maxWeight`: Minimum 0

### 5. **Enum Values**

**Status:**
```javascript
["active", "completed", "cancelled"]
```

**Priority:**
```javascript
["low", "medium", "high", "urgent"]
```

**Project Type:**
```javascript
["private", "ministry"]
```

**Grooming Required:**
```javascript
["formal", "casual", "not_specified"]
```

**Employment Type:**
```javascript
["contract", "permanent"]
```

**Shift Type:**
```javascript
["day", "night", "rotating", "flexible"]
```

**Gender Requirement:**
```javascript
["female", "male", "all"]
```

**Visa Type:**
```javascript
["contract", "permanent"]
```

---

## Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clm123abc456def789",
    "title": "Emergency Department Staffing",
    "description": "Staffing for emergency department",
    "status": "active",
    "deadline": "2024-12-31T23:59:59.000Z",
    "client": {
      "id": "clm123abc456def789",
      "name": "City General Hospital",
      "type": "hospital"
    },
    "creator": {
      "id": "clm456def789ghi012",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "team": {
      "id": "clm789ghi012jkl345",
      "name": "Healthcare Recruitment Team"
    },
    "rolesNeeded": [
      {
        "id": "clm890hij123klm456",
        "designation": "Registered Nurse",
        "quantity": 5,
        "priority": "high"
      }
    ],
    "requiredScreening": false,
    "createdAt": "2025-12-20T10:30:00.000Z",
    "updatedAt": "2025-12-20T10:30:00.000Z"
  },
  "message": "Project created successfully"
}
```

### Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "title must be longer than or equal to 2 characters"
    }
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Client not found"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

---

## Frontend Implementation Tips

### 1. **Form State Management**

```typescript
interface ProjectFormData {
  // Basic Info
  title: string;
  description?: string;
  deadline?: Date;
  status?: 'active' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Relationships
  clientId?: string;
  teamId?: string;
  countryCode?: string;
  
  // Settings
  projectType?: 'private' | 'ministry';
  resumeEditable?: boolean;
  groomingRequired?: 'formal' | 'casual' | 'not_specified';
  hideContactInfo?: boolean;
  requiredScreening?: boolean;
  
  // Arrays
  rolesNeeded?: RoleNeeded[];
  documentRequirements?: DocumentRequirement[];
const transformToAPI = (formData: ProjectFormData) => {
  return {
    ...formData,
    deadline: formData.deadline?.toISOString(),
    rolesNeeded: formData.rolesNeeded?.map(role => ({
      ...role,
      specificExperience: role.specificExperience ? 
        JSON.stringify(role.specificExperience) : undefined,
      requiredCertifications: role.requiredCertifications ?
        JSON.stringify(role.requiredCertifications) : undefined,
      skills: role.skills ? JSON.stringify(role.skills) : undefined,
      // salaryRange MUST be stringified object
      salaryRange: role.salaryRange ? 
        JSON.stringify({
          min: role.salaryRange.min,
          max: role.salaryRange.max,
          currency: role.salaryRange.currency
        }) : undefined,
      technicalSkills: role.technicalSkills ? 
        JSON.stringify(role.technicalSkills) : undefined,
      requiredSkills: role.requiredSkills ? 
        JSON.stringify(role.requiredSkills) : undefined,
      languageRequirements: role.languageRequirements ?
        JSON.stringify(role.languageRequirements) : undefined,
      licenseRequirements: role.licenseRequirements ?
        JSON.stringify(role.licenseRequirements) : undefined,
      candidateStates: role.candidateStates ?
        JSON.stringify(role.candidateStates) : undefined,
      candidateReligions: role.candidateReligions ?
        JSON.stringify(role.candidateReligions) : undefined,
    }))
  };
};      JSON.stringify(role.requiredCertifications) : undefined,
      skills: role.skills ? JSON.stringify(role.skills) : undefined,
      salaryRange: role.salaryRange ? JSON.stringify(role.salaryRange) : undefined,
      // ... stringify other array fields
    }))
  };
};
```

### 3. **Validation**

Use validation library (e.g., Zod, Yup) matching backend rules:

```typescript
import { z } from 'zod';

const roleSchema = z.object({
  designation: z.string(),
  quantity: z.number().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  salaryRange: z.string().nullable().optional(),
  // ... other fields
});

const projectSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  rolesNeeded: z.array(roleSchema).optional(),
  // ... other fields
});
```

---

## Quick Reference: Required vs Optional

### Always Required
- `title` (only this field is truly required!)

### Required IF Parent Array Exists

**In `rolesNeeded` array:**
- `designation` ✅
- `quantity` ✅

**In `educationRequirementsList` array:**
- `qualificationId` ✅
- `mandatory` ✅

**In `documentRequirements` array:**
- `docType` ✅
- `mandatory` ✅

### Everything Else
⚪ **OPTIONAL** - Can be omitted or null

---

This documentation should provide your frontend team with everything they need to implement the project creation form! 🚀
