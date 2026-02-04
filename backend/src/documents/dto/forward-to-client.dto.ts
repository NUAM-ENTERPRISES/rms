import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export enum SendType {
  MERGED = 'merged',
  INDIVIDUAL = 'individual',
}

export class ForwardToClientDto {
  @ApiProperty({ example: 'cand_123' })
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty({ example: 'proj_456' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;

  @ApiProperty({ enum: SendType, example: 'merged' })
  @IsEnum(SendType)
  @IsNotEmpty()
  sendType: SendType;

  @ApiProperty({ required: false, type: [String], example: ['doc_1', 'doc_2'] })
  @IsArray()
  @IsOptional()
  documentIds?: string[];

  @ApiProperty({ required: false, example: 'Please review these documents.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false, example: 'role_789' })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;
}
