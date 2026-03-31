import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRecruiterDto {
  @ApiProperty({
    description: 'ID of the recruiter to assign',
    example: 'clx1234567890',
  })
  @IsString()
  recruiterId: string;

  @ApiProperty({
    description: 'Reason for assignment (optional)',
    example: 'Initial assignment after candidate creation',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Type of assignment (manual, cre_assigned, etc)',
    example: 'cre_assigned',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignmentType?: string;
}
