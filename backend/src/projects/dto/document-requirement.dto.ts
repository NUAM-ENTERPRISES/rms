import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentRequirementDto {
  @ApiProperty({
    description: 'Document type identifier',
    example: 'passport',
  })
  @IsString()
  docType: string;

  @ApiProperty({
    description: 'Whether this document is mandatory for the project',
    example: true,
  })
  @IsBoolean()
  mandatory: boolean;

  @ApiPropertyOptional({
    description: 'Additional description or notes for this document requirement',
    example: 'Valid passport with at least 6 months validity',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this was automatically added based on project settings',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;
}
