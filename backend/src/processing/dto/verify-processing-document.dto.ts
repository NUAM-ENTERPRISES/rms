import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyProcessingDocumentDto {
  @ApiProperty({
    description: 'The ID of the document to verify',
    example: 'doc_123abc',
  })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({
    description: 'The ID of the processing step this document belongs to',
    example: 'step_123abc',
  })
  @IsString()
  @IsNotEmpty()
  processingStepId: string;

  @ApiPropertyOptional({
    description: 'Optional notes for verification',
    example: 'Document verified by processing team',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when this document was received by processing',
    example: '2026-03-30T12:34:56.000Z',
  })
  @IsOptional()
  @IsString()
  receivedAt?: string;
}
