import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAgentCandidatePermissionsDto {
  @ApiProperty({
    description:
      'Grant direct permission to add candidates from the Agents page',
    example: true,
  })
  @IsBoolean()
  createAgentCandidatesEnabled!: boolean;
}
