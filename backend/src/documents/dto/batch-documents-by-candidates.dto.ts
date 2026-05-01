import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class BatchDocumentsByCandidatesDto {
  @ApiProperty({
    description: 'Candidate IDs to fetch documents for (one DB query, grouped in response)',
    example: ['cmolabc123', 'cmoldef456'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  candidateIds: string[];
}
