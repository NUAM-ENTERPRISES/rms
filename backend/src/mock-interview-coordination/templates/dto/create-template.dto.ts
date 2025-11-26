import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTemplateItemDto } from './create-template-item.dto';

export class CreateMockInterviewTemplateDto {
  @ApiProperty({
    description: 'Role ID from RoleCatalog',
    example: 'ckx7r1234abcd',
  })
  @IsString()
  roleId: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Standard RN Interview Template',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Comprehensive assessment for Registered Nurse candidates',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the template is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Template items (questions)',
    type: [CreateTemplateItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateItemDto)
  items?: CreateTemplateItemDto[];
}
