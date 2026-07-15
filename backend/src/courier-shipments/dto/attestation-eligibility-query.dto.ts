import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AttestationEligibilityQueryDto {
  @ApiProperty({ description: 'Selected project id' })
  @IsString()
  @MinLength(1)
  projectId!: string;
}
