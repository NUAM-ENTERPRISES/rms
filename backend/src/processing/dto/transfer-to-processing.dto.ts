import { IsString, IsArray, IsOptional, IsNotEmpty, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferToProcessingDto {
  @ApiProperty({
    description: 'Array of candidate IDs to transfer',
    example: ['cand_1', 'cand_2'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  candidateIds: string[];

  @ApiProperty({
    description: 'The project ID associated with these candidates',
    example: 'proj_123',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'The specific role ID within the project',
    example: 'role_456',
  })
  @IsString()
  @IsNotEmpty()
  roleNeededId: string;

  @ApiProperty({
    description: 'The user ID of the processing team member being assigned',
    example: 'user_789',
  })
  @IsString()
  @IsNotEmpty()
  assignedProcessingTeamUserId: string;

  @ApiProperty({
    description: 'Optional notes for the transfer',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
