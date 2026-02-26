import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsArray, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SendType } from './forward-to-client.dto';

export enum DeliveryMethod {
  EMAIL_INDIVIDUAL = 'email_individual',
  EMAIL_COMBINED = 'email_combined',
  GOOGLE_DRIVE = 'google_drive',
}

export class ForwardSelectionDto {
  @ApiProperty({ example: 'cand_123' })
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty({ example: 'role_123', required: false })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;

  @ApiProperty({ enum: SendType, example: 'merged' })
  @IsEnum(SendType)
  @IsNotEmpty()
  sendType: SendType;

  @ApiProperty({ example: 'proj_123', required: false })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ required: false, type: [String], example: ['doc_1', 'doc_2'] })
  @IsArray()
  @IsOptional()
  documentIds?: string[];
}

export class BulkForwardToClientDto {
  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;

  @ApiProperty({ example: 'proj_456' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'Optional notes for the recipient', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ enum: DeliveryMethod, example: 'email_combined', default: DeliveryMethod.EMAIL_INDIVIDUAL })
  @IsEnum(DeliveryMethod)
  @IsOptional()
  deliveryMethod?: DeliveryMethod;

  @ApiProperty({ type: [ForwardSelectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ForwardSelectionDto)
  selections: ForwardSelectionDto[];

  @ApiProperty({ required: false, example: 'https://cdn.example.com/attachments/summary.csv' })
  @IsString()
  @IsOptional()
  csvUrl?: string;

  @ApiProperty({ required: false, example: 'batch-summary.csv' })
  @IsString()
  @IsOptional()
  csvName?: string;
}
