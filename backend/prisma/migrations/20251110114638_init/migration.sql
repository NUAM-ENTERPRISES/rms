-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'SUB_AGENCY', 'HEALTHCARE_ORGANIZATION', 'EXTERNAL_SOURCE');

-- CreateEnum
CREATE TYPE "IndividualRelationship" AS ENUM ('CURRENT_EMPLOYEE', 'FORMER_EMPLOYEE', 'NETWORK_CONTACT');

-- CreateEnum
CREATE TYPE "AgencyType" AS ENUM ('LOCAL', 'REGIONAL', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('HOSPITAL', 'CLINIC', 'NURSING_HOME', 'MEDICAL_CENTER');

-- CreateEnum
CREATE TYPE "FacilitySize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "ExternalSourceType" AS ENUM ('JOB_BOARD', 'SOCIAL_MEDIA', 'REFERRAL_PLATFORM', 'INDUSTRY_EVENT', 'COLD_OUTREACH', 'OTHER');

-- CreateEnum
CREATE TYPE "AcquisitionMethod" AS ENUM ('ORGANIC', 'PAID', 'PARTNERSHIP', 'REFERRAL');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('REFERRAL', 'PARTNERSHIP', 'DIRECT_CLIENT', 'EXTERNAL_SOURCE');

-- CreateEnum
CREATE TYPE "QualificationLevel" AS ENUM ('CERTIFICATE', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE');

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash" TEXT NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "countryCode" TEXT NOT NULL,
    "profileImage" TEXT,
    "mobileNumber" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leadId" TEXT,
    "headId" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_teams" (
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "user_teams_pkey" PRIMARY KEY ("userId","teamId")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointOfContact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acquisitionMethod" "AcquisitionMethod",
    "agencyType" "AgencyType",
    "billingAddress" TEXT,
    "commissionRate" DOUBLE PRECISION,
    "contractEndDate" TIMESTAMP(3),
    "contractStartDate" TIMESTAMP(3),
    "facilitySize" "FacilitySize",
    "facilityType" "FacilityType",
    "locations" JSONB NOT NULL DEFAULT '[]',
    "organization" TEXT,
    "paymentTerms" TEXT,
    "profession" TEXT,
    "relationship" "IndividualRelationship",
    "relationshipType" "RelationshipType",
    "sourceName" TEXT,
    "sourceNotes" TEXT,
    "sourceType" "ExternalSourceType",
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "taxId" TEXT,
    "type" "ClientType" NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "callingCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT NOT NULL,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "countryCode" TEXT,
    "projectType" TEXT NOT NULL DEFAULT 'private',
    "resumeEditable" BOOLEAN NOT NULL DEFAULT true,
    "groomingRequired" TEXT NOT NULL DEFAULT 'formal',
    "hideContactInfo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_needed" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "minExperience" INTEGER,
    "maxExperience" INTEGER,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "additionalRequirements" TEXT,
    "backgroundCheckRequired" BOOLEAN NOT NULL DEFAULT true,
    "benefits" TEXT,
    "drugScreeningRequired" BOOLEAN NOT NULL DEFAULT true,
    "educationRequirements" JSONB,
    "institutionRequirements" TEXT,
    "languageRequirements" JSONB,
    "licenseRequirements" JSONB,
    "notes" TEXT,
    "onCallRequired" BOOLEAN NOT NULL DEFAULT false,
    "physicalDemands" TEXT,
    "relocationAssistance" BOOLEAN NOT NULL DEFAULT false,
    "requiredCertifications" JSONB,
    "salaryRange" JSONB,
    "shiftType" TEXT,
    "specificExperience" JSONB,
    "employmentType" TEXT NOT NULL DEFAULT 'permanent',
    "contractDurationYears" INTEGER,
    "genderRequirement" TEXT NOT NULL DEFAULT 'all',
    "technicalSkills" JSONB,
    "visaType" TEXT NOT NULL DEFAULT 'contract',
    "requiredSkills" JSONB NOT NULL DEFAULT '[]',
    "candidateStates" JSONB NOT NULL DEFAULT '[]',
    "candidateReligions" JSONB NOT NULL DEFAULT '[]',
    "minHeight" DOUBLE PRECISION,
    "maxHeight" DOUBLE PRECISION,
    "minWeight" DOUBLE PRECISION,
    "maxWeight" DOUBLE PRECISION,

    CONSTRAINT "roles_needed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "currentStatus" TEXT NOT NULL DEFAULT 'untouched',
    "experience" INTEGER,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "currentEmployer" TEXT,
    "expectedSalary" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT,
    "profileImage" TEXT,
    "currentRole" TEXT,
    "currentSalary" INTEGER,
    "firstName" TEXT NOT NULL,
    "gpa" DOUBLE PRECISION,
    "graduationYear" INTEGER,
    "highestEducation" TEXT,
    "lastName" TEXT NOT NULL,
    "totalExperience" INTEGER,
    "university" TEXT,
    "countryCode" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experiences" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "salary" INTEGER,
    "location" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "achievements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_qualifications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "university" TEXT,
    "graduationYear" INTEGER,
    "gpa" DOUBLE PRECISION,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_project_map" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleNeededId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "documentsSubmittedDate" TIMESTAMP(3),
    "documentsVerifiedDate" TIMESTAMP(3),
    "hiredDate" TIMESTAMP(3),
    "nominatedBy" TEXT NOT NULL,
    "nominatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejectedBy" TEXT,
    "rejectedDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "selectedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'nominated',
    "assignedAt" TIMESTAMP(3),
    "recruiterId" TEXT,

    CONSTRAINT "candidate_project_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "verifiedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "type" TEXT NOT NULL DEFAULT 'technical',
    "outcome" TEXT,
    "notes" TEXT,
    "interviewer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "candidateProjectMapId" TEXT,
    "projectId" TEXT,
    "interviewerEmail" TEXT,
    "meetingLink" TEXT,
    "mode" TEXT DEFAULT 'video',

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing" (
    "id" TEXT NOT NULL,
    "qvpStatus" TEXT NOT NULL DEFAULT 'not_started',
    "medicalStatus" TEXT NOT NULL DEFAULT 'not_started',
    "visaStatus" TEXT NOT NULL DEFAULT 'not_started',
    "travelStatus" TEXT NOT NULL DEFAULT 'not_started',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actualJoiningDate" TIMESTAMP(3),
    "arrivalDate" TIMESTAMP(3),
    "candidateProjectMapId" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3),
    "expectedJoiningDate" TIMESTAMP(3),
    "flightBookedDate" TIMESTAMP(3),
    "joiningNotes" TEXT,
    "joiningStatus" TEXT NOT NULL DEFAULT 'pending',
    "medicalClearance" TEXT,
    "medicalCompletionDate" TIMESTAMP(3),
    "medicalNotes" TEXT,
    "medicalStartDate" TIMESTAMP(3),
    "qvpCompletionDate" TIMESTAMP(3),
    "qvpStartDate" TIMESTAMP(3),
    "travelNotes" TEXT,
    "visaApplicationDate" TIMESTAMP(3),
    "visaApprovalDate" TIMESTAMP(3),
    "visaExpiryDate" TIMESTAMP(3),
    "visaNotes" TEXT,
    "visaType" TEXT,

    CONSTRAINT "processing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idemKey" TEXT NOT NULL,
    "link" TEXT,
    "meta" JSONB,
    "readAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unread',

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_transfer_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromTeamId" TEXT NOT NULL,
    "toTeamId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "certName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "examDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "exportedToLearning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_pool" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsExperience" INTEGER NOT NULL,
    "currentEmployer" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "rating" INTEGER,
    "notes" TEXT,
    "sourceProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requirements" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_project_document_verifications" (
    "id" TEXT NOT NULL,
    "candidateProjectMapId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "rejectionReason" TEXT,
    "resubmissionRequested" BOOLEAN NOT NULL DEFAULT false,
    "resubmissionRequestedAt" TIMESTAMP(3),
    "resubmissionRequestedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_project_document_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "isClinical" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "level" "QualificationLevel" NOT NULL,
    "field" TEXT NOT NULL,
    "program" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_aliases" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qualification_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_country_profiles" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regulatedTitle" TEXT,
    "issuingBody" TEXT,
    "accreditationStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_country_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_equivalencies" (
    "id" TEXT NOT NULL,
    "fromQualificationId" TEXT NOT NULL,
    "toQualificationId" TEXT NOT NULL,
    "countryCode" TEXT,
    "isEquivalent" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_equivalencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_recommended_qualifications" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "countryCode" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_recommended_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_needed_education_requirements" (
    "id" TEXT NOT NULL,
    "roleNeededId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_needed_education_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocation_cursors" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleNeededId" TEXT NOT NULL,
    "lastIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allocation_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "religions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "religions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_recruiter_assignments" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "unassignedBy" TEXT,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_recruiter_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_status" (
    "id" SERIAL NOT NULL,
    "statusName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_countryCode_mobileNumber_idx" ON "users"("countryCode", "mobileNumber");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_countryCode_mobileNumber_key" ON "users"("countryCode", "mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE INDEX "candidates_teamId_idx" ON "candidates"("teamId");

-- CreateIndex
CREATE INDEX "candidates_currentStatus_idx" ON "candidates"("currentStatus");

-- CreateIndex
CREATE INDEX "candidates_countryCode_mobileNumber_idx" ON "candidates"("countryCode", "mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_countryCode_mobileNumber_key" ON "candidates"("countryCode", "mobileNumber");

-- CreateIndex
CREATE INDEX "work_experiences_candidateId_idx" ON "work_experiences"("candidateId");

-- CreateIndex
CREATE INDEX "work_experiences_companyName_idx" ON "work_experiences"("companyName");

-- CreateIndex
CREATE INDEX "work_experiences_jobTitle_idx" ON "work_experiences"("jobTitle");

-- CreateIndex
CREATE INDEX "candidate_qualifications_candidateId_idx" ON "candidate_qualifications"("candidateId");

-- CreateIndex
CREATE INDEX "candidate_qualifications_qualificationId_idx" ON "candidate_qualifications"("qualificationId");

-- CreateIndex
CREATE INDEX "candidate_project_map_status_idx" ON "candidate_project_map"("status");

-- CreateIndex
CREATE INDEX "candidate_project_map_nominatedBy_idx" ON "candidate_project_map"("nominatedBy");

-- CreateIndex
CREATE INDEX "candidate_project_map_projectId_roleNeededId_idx" ON "candidate_project_map"("projectId", "roleNeededId");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_project_map_candidateId_projectId_roleNeededId_key" ON "candidate_project_map"("candidateId", "projectId", "roleNeededId");

-- CreateIndex
CREATE INDEX "documents_candidateId_idx" ON "documents"("candidateId");

-- CreateIndex
CREATE INDEX "documents_docType_idx" ON "documents"("docType");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "interviews_candidateProjectMapId_idx" ON "interviews"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "interviews_projectId_idx" ON "interviews"("projectId");

-- CreateIndex
CREATE INDEX "interviews_scheduledTime_idx" ON "interviews"("scheduledTime");

-- CreateIndex
CREATE UNIQUE INDEX "processing_candidateProjectMapId_key" ON "processing"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "processing_candidateProjectMapId_idx" ON "processing"("candidateProjectMapId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idemKey_key" ON "notifications"("idemKey");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "outbox_events_type_idx" ON "outbox_events"("type");

-- CreateIndex
CREATE INDEX "outbox_events_processed_idx" ON "outbox_events"("processed");

-- CreateIndex
CREATE INDEX "team_transfer_requests_userId_idx" ON "team_transfer_requests"("userId");

-- CreateIndex
CREATE INDEX "team_transfer_requests_fromTeamId_idx" ON "team_transfer_requests"("fromTeamId");

-- CreateIndex
CREATE INDEX "team_transfer_requests_toTeamId_idx" ON "team_transfer_requests"("toTeamId");

-- CreateIndex
CREATE INDEX "team_transfer_requests_status_idx" ON "team_transfer_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "talent_pool_candidateId_key" ON "talent_pool"("candidateId");

-- CreateIndex
CREATE INDEX "document_requirements_projectId_idx" ON "document_requirements"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_projectId_docType_key" ON "document_requirements"("projectId", "docType");

-- CreateIndex
CREATE INDEX "candidate_project_document_verifications_candidateProjectMa_idx" ON "candidate_project_document_verifications"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "candidate_project_document_verifications_documentId_idx" ON "candidate_project_document_verifications"("documentId");

-- CreateIndex
CREATE INDEX "candidate_project_document_verifications_status_idx" ON "candidate_project_document_verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_project_document_verifications_candidateProjectMa_key" ON "candidate_project_document_verifications"("candidateProjectMapId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "role_catalog_name_key" ON "role_catalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_catalog_slug_key" ON "role_catalog"("slug");

-- CreateIndex
CREATE INDEX "role_catalog_category_idx" ON "role_catalog"("category");

-- CreateIndex
CREATE INDEX "role_catalog_isClinical_idx" ON "role_catalog"("isClinical");

-- CreateIndex
CREATE INDEX "role_catalog_isActive_idx" ON "role_catalog"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "qualifications_name_key" ON "qualifications"("name");

-- CreateIndex
CREATE INDEX "qualifications_level_idx" ON "qualifications"("level");

-- CreateIndex
CREATE INDEX "qualifications_field_idx" ON "qualifications"("field");

-- CreateIndex
CREATE INDEX "qualifications_isActive_idx" ON "qualifications"("isActive");

-- CreateIndex
CREATE INDEX "qualification_aliases_alias_idx" ON "qualification_aliases"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_aliases_qualificationId_alias_key" ON "qualification_aliases"("qualificationId", "alias");

-- CreateIndex
CREATE INDEX "qualification_country_profiles_countryCode_idx" ON "qualification_country_profiles"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_country_profiles_qualificationId_countryCode_key" ON "qualification_country_profiles"("qualificationId", "countryCode");

-- CreateIndex
CREATE INDEX "qualification_equivalencies_fromQualificationId_idx" ON "qualification_equivalencies"("fromQualificationId");

-- CreateIndex
CREATE INDEX "qualification_equivalencies_toQualificationId_idx" ON "qualification_equivalencies"("toQualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_equivalencies_fromQualificationId_toQualifica_key" ON "qualification_equivalencies"("fromQualificationId", "toQualificationId", "countryCode");

-- CreateIndex
CREATE INDEX "role_recommended_qualifications_roleId_idx" ON "role_recommended_qualifications"("roleId");

-- CreateIndex
CREATE INDEX "role_recommended_qualifications_qualificationId_idx" ON "role_recommended_qualifications"("qualificationId");

-- CreateIndex
CREATE INDEX "role_recommended_qualifications_weight_idx" ON "role_recommended_qualifications"("weight");

-- CreateIndex
CREATE UNIQUE INDEX "role_recommended_qualifications_roleId_qualificationId_coun_key" ON "role_recommended_qualifications"("roleId", "qualificationId", "countryCode");

-- CreateIndex
CREATE INDEX "role_needed_education_requirements_roleNeededId_idx" ON "role_needed_education_requirements"("roleNeededId");

-- CreateIndex
CREATE INDEX "role_needed_education_requirements_qualificationId_idx" ON "role_needed_education_requirements"("qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "role_needed_education_requirements_roleNeededId_qualificati_key" ON "role_needed_education_requirements"("roleNeededId", "qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "allocation_cursors_projectId_roleNeededId_key" ON "allocation_cursors"("projectId", "roleNeededId");

-- CreateIndex
CREATE UNIQUE INDEX "religions_name_key" ON "religions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_candidateId_idx" ON "candidate_recruiter_assignments"("candidateId");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_recruiterId_idx" ON "candidate_recruiter_assignments"("recruiterId");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_isActive_idx" ON "candidate_recruiter_assignments"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_status_statusName_key" ON "candidate_status"("statusName");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_needed" ADD CONSTRAINT "roles_needed_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_map" ADD CONSTRAINT "candidate_project_map_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_map" ADD CONSTRAINT "candidate_project_map_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_map" ADD CONSTRAINT "candidate_project_map_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "roles_needed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_map" ADD CONSTRAINT "candidate_project_map_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_project_map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing" ADD CONSTRAINT "processing_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_project_map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_pool" ADD CONSTRAINT "talent_pool_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_document_verifications" ADD CONSTRAINT "candidate_project_document_verifications_candidateProjectM_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_project_map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_document_verifications" ADD CONSTRAINT "candidate_project_document_verifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_aliases" ADD CONSTRAINT "qualification_aliases_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_country_profiles" ADD CONSTRAINT "qualification_country_profiles_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_country_profiles" ADD CONSTRAINT "qualification_country_profiles_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_equivalencies" ADD CONSTRAINT "qualification_equivalencies_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_equivalencies" ADD CONSTRAINT "qualification_equivalencies_fromQualificationId_fkey" FOREIGN KEY ("fromQualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_equivalencies" ADD CONSTRAINT "qualification_equivalencies_toQualificationId_fkey" FOREIGN KEY ("toQualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_recommended_qualifications" ADD CONSTRAINT "role_recommended_qualifications_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_recommended_qualifications" ADD CONSTRAINT "role_recommended_qualifications_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_recommended_qualifications" ADD CONSTRAINT "role_recommended_qualifications_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_needed_education_requirements" ADD CONSTRAINT "role_needed_education_requirements_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_needed_education_requirements" ADD CONSTRAINT "role_needed_education_requirements_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "roles_needed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_unassignedBy_fkey" FOREIGN KEY ("unassignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
