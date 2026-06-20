import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseProjectStatusInput } from '../utils/project-status.util';

export class UpdateProjectLifecycleStatusDto {
  @ApiProperty({
    description:
      'Project lifecycle status (accepts enum or snake_case, e.g. IN_PROGRESS or in_progress)',
    enum: ['COMPLETED', 'ON_HOLD', 'IN_PROGRESS', 'CANCELLED'],
    example: 'IN_PROGRESS',
  })
  @Transform(({ value }) => parseProjectStatusInput(value))
  @IsEnum(['COMPLETED', 'ON_HOLD', 'IN_PROGRESS', 'CANCELLED'])
  status: 'COMPLETED' | 'ON_HOLD' | 'IN_PROGRESS' | 'CANCELLED';
}
