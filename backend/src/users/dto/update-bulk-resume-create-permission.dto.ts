import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateBulkResumeCreatePermissionDto {
  @ApiProperty({
    description:
      'Grant direct bulk resume candidate creation permission to this user',
    example: true,
  })
  @IsBoolean()
  bulkResumeCreateEnabled!: boolean;
}
