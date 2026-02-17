import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateClientDecisionDto {
  @ApiProperty({
    description: "Decision from client",
    enum: ['shortlisted', 'not_shortlisted'],
    example: 'shortlisted',
  })
  @IsString()
  @IsIn(['shortlisted', 'not_shortlisted'])
  decision!: 'shortlisted' | 'not_shortlisted';

  @ApiPropertyOptional({ description: 'Optional notes / reason' })
  @IsString()
  @IsOptional()
  notes?: string;
}
