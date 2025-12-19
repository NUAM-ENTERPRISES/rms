import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { SCREENING_CATEGORY } from '../../../common/constants/statuses';

export class CreateTemplateItemDto {
  @ApiProperty({
    description: 'Category of the checklist item',
    enum: SCREENING_CATEGORY,
    example: 'technical_skills',
  })
  @IsEnum(SCREENING_CATEGORY)
  category: string;

  @ApiProperty({
    description: 'Criterion to evaluate',
    example: 'Medication Administration Knowledge',
  })
  @IsString()
  criterion: string;

  @ApiProperty({
    description: 'Display order within category',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  order?: number;
}
