import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SCREENING_DECISION } from '../../../common/constants/statuses';
import { ChecklistItemDto } from './create-screening.dto';

export class CompleteScreeningDto {
  @ApiProperty({
    description: 'Overall score (percentage out of 100)',
    example: 86,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  overallRating: number;
  @ApiProperty({
    description: 'Interview decision',
    enum: SCREENING_DECISION,
    example: 'approved',
  })
  @IsEnum(SCREENING_DECISION)
  decision: string;

  @ApiProperty({
    description: 'General remarks about the interview',
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    description: "Candidate's strengths",
    required: false,
  })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiProperty({
    description: 'Areas that need improvement',
    required: false,
  })
  @IsOptional()
  @IsString()
  areasOfImprovement?: string;

  @ApiProperty({
    description: 'Checklist items evaluation',
    type: [ChecklistItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems: ChecklistItemDto[];
}
