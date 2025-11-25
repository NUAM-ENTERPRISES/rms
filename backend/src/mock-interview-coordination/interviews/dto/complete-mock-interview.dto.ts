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
import { MOCK_INTERVIEW_DECISION } from '../../../common/constants/statuses';
import { ChecklistItemDto } from './create-mock-interview.dto';

export class CompleteMockInterviewDto {
  @ApiProperty({
    description: 'Overall rating (1-5 scale)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiProperty({
    description: 'Interview decision',
    enum: MOCK_INTERVIEW_DECISION,
    example: 'approved',
  })
  @IsEnum(MOCK_INTERVIEW_DECISION)
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
