import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class BulkSendCsvProfilesDto {
  @ApiProperty({
    type: [String],
    example: ['cpm_abc123', 'cpm_def456'],
    description: 'Candidate-project map IDs to include in the bulk CSV export',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  candidateProjectMapIds: string[];
}
