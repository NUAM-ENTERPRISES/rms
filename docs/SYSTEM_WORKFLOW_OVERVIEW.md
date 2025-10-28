# 🏥 **Affiniks RMS - System Workflow Overview**

> **Last Updated**: January 8, 2025  
> **Version**: 2.1.0  
> **System**: Affiniks Recruitment Management System

---

## 📋 **Document Purpose**

This document provides a comprehensive overview of how the Affiniks RMS system works, including all user roles, workflows, and business processes. This serves as the single source of truth for understanding the complete recruitment lifecycle from candidate creation to hiring.

---

## 🎯 **System Overview**

**Affiniks RMS** is a comprehensive healthcare recruitment management system designed to streamline the entire recruitment process for healthcare professionals. The system manages the complete lifecycle from candidate intake to final hiring, with specialized workflows for different roles and document verification processes.

**Key Business Purpose:**

- Streamline healthcare recruitment processes
- Ensure compliance with healthcare regulations
- Manage document verification workflows
- Track candidate progress through multiple stages
- Facilitate team collaboration and role-based access

---

## 👥 **User Roles & Responsibilities**

### **1. CEO/Director**

- **Access Level**: Full system access
- **Responsibilities**:
  - Strategic oversight
  - System configuration
  - Performance monitoring
  - Final decision authority

### **2. Manager**

- **Access Level**: Multi-team management
- **Responsibilities**:
  - Team oversight
  - Project management
  - User management
  - Performance tracking

### **3. Team Head**

- **Access Level**: Assigned teams only
- **Responsibilities**:
  - Team leadership
  - Candidate management
  - Project coordination
  - Quality assurance

### **4. Team Lead**

- **Access Level**: Task monitoring
- **Responsibilities**:
  - Recruiter management
  - Process oversight
  - Performance monitoring
  - Workload distribution

### **5. Recruiter**

- **Access Level**: Candidate handling
- **Responsibilities**:
  - Candidate creation and management
  - Project nominations
  - Document collection
  - Interview coordination

### **6. Documentation Executive**

- **Access Level**: Document verification
- **Responsibilities**:
  - Document verification
  - Compliance checking
  - Document status updates
  - Quality assurance

### **7. Processing Executive**

- **Access Level**: Post-selection processing
- **Responsibilities**:
  - Visa processing
  - Medical clearances
  - Travel arrangements
  - Final onboarding

---

## 🔄 **Complete System Workflow**

### **Phase 1: Project Setup & Planning**

#### **1.1 Client Onboarding**

- **Who**: Manager/Team Head
- **Process**:
  1. Create client profile (Healthcare Organization, Sub-Agency, Individual Referrer, External Source)
  2. Set up client-specific requirements
  3. Define project parameters
  4. Establish communication channels

#### **1.2 Project Creation**

- **Who**: Manager/Team Head
- **Process**:
  1. Create new project with client association
  2. Define role requirements (designation, count, experience, education)
  3. Set project deadlines and priorities
  4. Configure document requirements per project

### **Phase 2: Candidate Intake & Management**

#### **2.1 Candidate Creation**

- **Who**: Recruiter
- **Process**:
  1. **Manual Entry**: Create candidate profile with personal details
  2. **Educational Information**: Add qualifications, university, graduation year
  3. **Work Experience**: Add multiple work experience entries
  4. **Skills & Competencies**: Define technical and soft skills
  5. **Contact Information**: Phone, email, address
  6. **Profile Image**: Upload candidate photo
  7. **Source Tracking**: Mark as manual, Meta, or referral

#### **2.2 Candidate Assignment**

- **Who**: System (Auto-allocation) / Manager (Manual)
- **Process**:
  1. **Auto-Allocation**: System matches candidates to projects based on:
     - Education hierarchy (BSc → MSc → PhD)
     - Experience affinity (ICU Nurse ↔ Nurse)
     - Skills overlap
     - Availability status
  2. **Round-Robin Assignment**: Fair distribution among recruiters
  3. **Notification**: Recruiter receives assignment notification

### **Phase 3: Project Nomination & Document Workflow**

#### **3.1 Candidate Nomination**

- **Who**: Recruiter
- **Process**:
  1. **Review Project Requirements**: Check role needs, experience, education
  2. **Nominate Candidate**: Assign candidate to specific project role
  3. **Status Update**: Candidate status changes to "nominated"
  4. **Document Collection**: Recruiter requests required documents

#### **3.2 Document Submission**

- **Who**: Recruiter
- **Process**:
  1. **Document Upload**: Upload required documents (passport, licenses, degrees, etc.)
  2. **Document Categorization**: System categorizes by type (identity, professional, educational)
  3. **Status Update**: Documents marked as "pending" verification
  4. **Send for Verification**: Recruiter sends candidate for document verification

#### **3.3 Document Verification Assignment**

- **Who**: System (Auto-assignment)
- **Process**:
  1. **Executive Selection**: System finds Documentation Executive with least workload
  2. **Assignment Notification**: Executive receives notification
  3. **Status Update**: Candidate status changes to "pending_documents"

#### **3.4 Document Verification**

- **Who**: Documentation Executive
- **Process**:
  1. **Document Review**: Verify each document for authenticity and compliance
  2. **Verification Decision**: Mark as verified, rejected, or request resubmission
  3. **Status Updates**: Update individual document status
  4. **Overall Status**: System checks if all required documents are verified
  5. **Notification**: Recruiter notified of verification completion

### **Phase 4: Approval & Interview Process**

#### **4.1 Candidate Approval**

- **Who**: Recruiter
- **Process**:
  1. **Review Verification**: Check all documents are verified
  2. **Approve Candidate**: Mark candidate as approved for project
  3. **Status Update**: Candidate status changes to "approved"
  4. **Interview Scheduling**: Proceed to interview stage

#### **4.2 Interview Scheduling**

- **Who**: Recruiter
- **Process**:
  1. **Schedule Interview**: Set interview date, time, and mode (video/phone/in-person)
  2. **Interviewer Assignment**: Assign interviewer (internal or external)
  3. **Meeting Setup**: Create meeting link for video interviews
  4. **Status Update**: Candidate status changes to "interview_scheduled"
  5. **Notifications**: Send interview details to candidate and interviewer

#### **4.3 Interview Conduct**

- **Who**: Interviewer
- **Process**:
  1. **Interview Execution**: Conduct interview as scheduled
  2. **Assessment**: Evaluate candidate performance
  3. **Outcome Recording**: Mark as passed, failed, or reschedule
  4. **Status Update**: Candidate status changes based on outcome
  5. **Feedback**: Record interview notes and recommendations

### **Phase 5: Selection & Processing**

#### **5.1 Client Selection**

- **Who**: Client/Manager
- **Process**:
  1. **Candidate Review**: Client reviews approved and interviewed candidates
  2. **Selection Decision**: Client selects preferred candidate(s)
  3. **Status Update**: Selected candidate status changes to "selected"
  4. **Notification**: Recruiter and candidate notified of selection

#### **5.2 Processing Stage**

- **Who**: Processing Executive
- **Process**:
  1. **QVP (Quality Verification Process)**: Background checks and verification
  2. **Medical Clearance**: Medical examinations and fitness certificates
  3. **Visa Processing**: Visa applications and approvals
  4. **Travel Arrangements**: Flight bookings and travel logistics
  5. **Status Updates**: Track each processing stage
  6. **Final Onboarding**: Complete hiring process

#### **5.3 Final Hiring**

- **Who**: System/Manager
- **Process**:
  1. **Status Update**: Candidate status changes to "hired"
  2. **Project Completion**: Mark project role as filled
  3. **Notifications**: All stakeholders notified of successful hiring
  4. **Documentation**: Complete hiring documentation

---

## 🔄 **Status Workflow States**

### **Candidate-Project Status Flow**

```
NOMINATED → PENDING_DOCUMENTS → DOCUMENTS_SUBMITTED → VERIFICATION_IN_PROGRESS → DOCUMENTS_VERIFIED → APPROVED → INTERVIEW_SCHEDULED → INTERVIEW_COMPLETED → INTERVIEW_PASSED → SELECTED → PROCESSING → HIRED
```

### **Rejection Paths**

- **Document Rejection**: `REJECTED_DOCUMENTS` (can resubmit)
- **Interview Rejection**: `REJECTED_INTERVIEW` (final)
- **Selection Rejection**: `REJECTED_SELECTION` (final)

### **Other States**

- **WITHDRAWN**: Candidate withdraws from process
- **ON_HOLD**: Temporary hold on process

---

## 🔔 **Notification System**

### **Real-time Notifications**

- **WebSocket Integration**: Real-time updates to users
- **Email Notifications**: Important status changes
- **In-app Notifications**: System notifications within the platform

### **Key Notification Events**

1. **Candidate Assigned**: Recruiter notified of new candidate assignment
2. **Document Verification**: Executive notified of documents to verify
3. **Verification Complete**: Recruiter notified of verification results
4. **Interview Scheduled**: Candidate and interviewer notified
5. **Selection Made**: All stakeholders notified of client selection
6. **Processing Updates**: Regular updates on processing stages

---

## 📊 **Key Business Rules**

### **Document Verification Rules**

- **Mandatory Documents**: Project-specific requirements
- **Verification Standards**: Healthcare compliance requirements
- **Resubmission Process**: Clear guidelines for document corrections
- **Expiry Tracking**: Monitor document validity periods

### **Candidate Matching Rules**

- **Education Hierarchy**: Higher degrees satisfy lower requirements
- **Experience Affinity**: Related roles count toward experience
- **Skills Overlap**: Minimum skill requirements must be met
- **Availability**: Only available candidates are considered

### **Access Control Rules**

- **Role-based Permissions**: Each role has specific access levels
- **Team Scoping**: Users can only access their assigned teams
- **Data Privacy**: Sensitive information protected by permissions
- **Audit Trail**: All actions logged for compliance

---

## 🎯 **Success Metrics**

### **Recruitment Efficiency**

- **Time to Hire**: Average days from nomination to hiring
- **Conversion Rates**: Percentage of candidates who complete the process
- **Document Verification Speed**: Average time for document processing
- **Interview Success Rate**: Percentage of candidates passing interviews

### **System Performance**

- **User Adoption**: Active users per role
- **Process Compliance**: Adherence to workflow rules
- **Data Quality**: Accuracy of candidate information
- **System Reliability**: Uptime and error rates

---

## 🔧 **System Integration Points**

### **External Systems**

- **Meta Integration**: Candidate sourcing from Meta platforms
- **Email Systems**: Notification delivery
- **File Storage**: Digital Ocean Spaces for document storage
- **Video Conferencing**: Interview scheduling integration

### **Internal Systems**

- **Authentication**: JWT-based user authentication
- **Audit System**: Comprehensive activity logging
- **Queue System**: Background job processing
- **Database**: PostgreSQL with Prisma ORM

---

## 📈 **Future Enhancements**

### **Planned Features**

1. **Advanced Analytics**: Detailed reporting and insights
2. **Mobile Application**: Mobile access for field recruiters
3. **AI-Powered Matching**: Enhanced candidate-project matching
4. **Integration APIs**: Third-party system integrations
5. **Advanced Notifications**: SMS and push notification support

---

## 📚 **Documentation References**

- **Technical Architecture**: `BE_GUIDELINES.md`, `FE_GUIDELINES.md`
- **Database Schema**: `DATABASE_SCHEMA.md`
- **Development Status**: `DEVELOPMENT_STATUS.md`
- **API Documentation**: Swagger/OpenAPI documentation
- **Deployment Guide**: `DIGITALOCEAN_SPACES_SETUP.md`

---

## ✅ **Definition of Done (Workflow)**

- ✅ **Complete Candidate Journey**: From creation to hiring
- ✅ **Role-based Access**: Proper permissions for each user type
- ✅ **Document Workflow**: Full verification process
- ✅ **Notification System**: Real-time updates for all stakeholders
- ✅ **Status Management**: Clear workflow states and transitions
- ✅ **Audit Trail**: Complete activity logging
- ✅ **System Integration**: External and internal system connections
- ✅ **Performance Monitoring**: Key metrics and success indicators

---

_This document serves as the comprehensive reference for understanding the Affiniks RMS system workflow and should be updated whenever new features or processes are added to the system._
