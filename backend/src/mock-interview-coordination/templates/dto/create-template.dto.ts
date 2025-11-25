import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { MOCK_INTERVIEW_CATEGORY } from '../../../common/constants/statuses';

export class CreateMockInterviewTemplateDto {
  @ApiProperty({
    description: 'Role ID from RoleCatalog',
    example: 'ckx7r1234abcd',
  })
  @IsString()
  roleId: string;

  @ApiProperty({
    description: 'Category of the checklist item',
    enum: MOCK_INTERVIEW_CATEGORY,
    example: 'technical_skills',
  })
  @IsEnum(MOCK_INTERVIEW_CATEGORY)
  category: string;

  @ApiProperty({
    description: 'Criterion to evaluate',
    example: 'Medication Administration Knowledge',
  })
  @IsString()
  criterion: string;

  @ApiProperty({
    description: 'Display order',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({
    description: 'Whether the template is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
