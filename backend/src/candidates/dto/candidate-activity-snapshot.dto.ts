import { ApiProperty } from '@nestjs/swagger';

export class CandidateActivitySnapshotDto {
  @ApiProperty({ example: 1, description: 'Total projects assigned to the candidate' })
  projectsAssigned: number;

  @ApiProperty({ example: 1, description: 'Projects in nomination / documentation stages' })
  inDocumentation: number;

  @ApiProperty({ example: 0, description: 'Projects in interview / screening / training' })
  inInterview: number;

  @ApiProperty({ example: 0, description: 'Projects in processing or deployed stages' })
  processingOrDeployed: number;

  @ApiProperty({ example: 0, description: 'Projects in offer or selected stage' })
  offersInPipeline: number;

  @ApiProperty({ example: 0, description: 'Projects in deployed / hired / travel stage' })
  placements: number;

  @ApiProperty({ example: 1, description: 'Documents with verified status' })
  verifiedDocuments: number;

  @ApiProperty({ example: 0, description: 'Documents pending review' })
  pendingDocuments: number;

  @ApiProperty({ example: 44, description: 'Profile completion percentage' })
  profileCompletion: number;

  @ApiProperty({ example: 1, description: 'Candidate status history entries (status log)' })
  pipelineUpdates: number;
}
