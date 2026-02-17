import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CandidateDecisionDto {
  @ApiProperty({ description: 'CandidateProjectMap ID' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'Decision', enum: ['shortlisted', 'not_shortlisted'] })
  @IsString()
  @IsIn(['shortlisted', 'not_shortlisted'])
  decision!: 'shortlisted' | 'not_shortlisted';

  @ApiProperty({ description: 'Optional notes / reason', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkUpdateClientDecisionDto {
  @ApiProperty({ type: [CandidateDecisionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateDecisionDto)
  updates!: CandidateDecisionDto[];
}
