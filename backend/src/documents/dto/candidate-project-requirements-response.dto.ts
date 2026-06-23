import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CandidateProjectRequirementRowDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  docType: string;

  @ApiProperty()
  mandatory: boolean;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  isAutomatic: boolean;

  @ApiProperty()
  documentName: string;

  @ApiProperty()
  documentType: string;

  @ApiPropertyOptional()
  uploadRequested?: boolean;

  @ApiPropertyOptional()
  uploadRequestReason?: string;

  @ApiPropertyOptional()
  uploadRequestedAt?: string;
}

export class CandidateProjectVerificationDocumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  docType: string;

  @ApiPropertyOptional()
  docName?: string | null;

  @ApiProperty()
  fileName: string;

  @ApiPropertyOptional()
  fileUrl?: string;

  @ApiPropertyOptional()
  mimeType?: string | null;

  @ApiPropertyOptional()
  documentNumber?: string | null;

  @ApiPropertyOptional()
  issuedAt?: Date | null;

  @ApiPropertyOptional()
  expiryDate?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  documentDisplayName: string;

  @ApiProperty()
  documentType: string;
}

export class CandidateProjectVerificationRowDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiProperty()
  candidateProjectMapId: string;

  @ApiProperty()
  resubmissionRequested: boolean;

  @ApiProperty({ type: CandidateProjectVerificationDocumentDto })
  document: CandidateProjectVerificationDocumentDto;
}

export class CandidateProjectRequirementsSummaryDto {
  @ApiProperty()
  candidateProjectMapId: string;

  @ApiProperty()
  totalRequired: number;

  @ApiProperty()
  totalSubmitted: number;

  @ApiProperty()
  totalVerified: number;

  @ApiProperty()
  totalRejected: number;

  @ApiProperty()
  totalPending: number;

  @ApiProperty()
  allDocumentsVerified: boolean;

  @ApiProperty()
  canApproveCandidate: boolean;

  @ApiProperty()
  isSendedForDocumentVerification: boolean;

  @ApiProperty()
  isDocumentationReviewed: boolean;

  @ApiProperty()
  documentationStatus: string;

  @ApiProperty()
  documentationStatusCode: string;
}

export class CandidateProjectRequirementsCandidateProjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  project: { introductionVideoRequired: boolean };

  @ApiPropertyOptional()
  recruiter?: { id: string; name: string; email: string } | null;

  @ApiPropertyOptional()
  roleNeeded?: {
    id: string;
    designation: string;
    roleCatalog?: { id: string; name: string; label: string } | null;
  } | null;

  @ApiPropertyOptional()
  mainStatus?: { name: string; label: string } | null;

  @ApiPropertyOptional()
  subStatus?: { name: string; label: string } | null;
}

export class CandidateProjectRequirementsResponseDto {
  @ApiProperty({ type: CandidateProjectRequirementsCandidateProjectDto })
  candidateProject: CandidateProjectRequirementsCandidateProjectDto;

  @ApiProperty()
  introductionVideoRequired: boolean;

  @ApiPropertyOptional({ type: CandidateProjectVerificationRowDto })
  introductionVideo?: CandidateProjectVerificationRowDto | null;

  @ApiProperty({ type: [CandidateProjectRequirementRowDto] })
  requirements: CandidateProjectRequirementRowDto[];

  @ApiProperty({ type: [CandidateProjectVerificationRowDto] })
  verifications: CandidateProjectVerificationRowDto[];

  @ApiProperty({ type: CandidateProjectRequirementsSummaryDto })
  summary: CandidateProjectRequirementsSummaryDto;
}
