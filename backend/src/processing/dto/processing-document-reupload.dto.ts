import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUrl, IsDateString } from 'class-validator';

export class ProcessingDocumentReuploadDto {
  @ApiProperty({ description: 'The ID of the existing document being replaced' })
  @IsString()
  @IsNotEmpty()
  oldDocumentId: string;

  @ApiProperty({ description: 'The candidate project map (nomination) id this document relates to' })
  @IsString()
  @IsNotEmpty()
  candidateProjectMapId: string;

  @ApiProperty({ description: 'File name of the new uploaded document' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: 'Public URL to the new document file' })
  @IsUrl()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  docType?: string;
}
