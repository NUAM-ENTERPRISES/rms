import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class VerifyOfferLetterDto {
  @ApiProperty({
    description: 'ID of the document (offer letter) to verify',
    example: 'doc_123abc',
  })
  @IsNotEmpty()
  @IsString()
  documentId: string;

  @ApiProperty({
    description: 'ID of the CandidateProjectMap',
    example: 'cpm_123abc',
  })
  @IsNotEmpty()
  @IsString()
  candidateProjectMapId: string;

  @ApiProperty({
    description: 'Optional notes for verification',
    example: 'Offer letter verified by HRD',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
