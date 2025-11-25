import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { MOCK_INTERVIEW_CATEGORY } from '../../../common/constants/statuses';

export class QueryMockInterviewTemplatesDto {
  @ApiProperty({
    description: 'Filter by role ID',
    example: 'ckx7r1234abcd',
    required: false,
  })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiProperty({
    description: 'Filter by category',
    enum: MOCK_INTERVIEW_CATEGORY,
    required: false,
  })
  @IsOptional()
  @IsEnum(MOCK_INTERVIEW_CATEGORY)
  category?: string;

  @ApiProperty({
    description: 'Filter by active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
