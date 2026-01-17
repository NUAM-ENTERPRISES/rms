import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCountryDocumentRequirementDto {
  @ApiProperty({ example: 'SA', description: 'Country code (2 characters)' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ example: 'Passport', description: 'Type of document required' })
  @IsString()
  @IsNotEmpty()
  docType: string;

  @ApiProperty({ example: true, description: 'Whether the document is mandatory' })
  @IsBoolean()
  @IsOptional()
  mandatory?: boolean;

  @ApiProperty({ required: false, description: 'Optional processing step template id to link this requirement' })
  @IsString()
  @IsOptional()
  processingStepTemplateId?: string;

  @ApiProperty({ required: false, description: 'Additional instructions or description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateCountryDocumentRequirementDto {
  @ApiProperty({ example: 'Passport', required: false })
  @IsString()
  @IsOptional()
  docType?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  mandatory?: boolean;

  @ApiProperty({ required: false, description: 'Optional processing step template id to link this requirement' })
  @IsString()
  @IsOptional()
  processingStepTemplateId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
