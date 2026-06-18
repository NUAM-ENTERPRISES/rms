import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateDocumentsControlPermissionsDto {
  @ApiProperty({
    description: 'Grant direct Original Document Intake permissions to this user',
    example: true,
  })
  @IsBoolean()
  originalDocumentIntakeEnabled!: boolean;

  @ApiProperty({
    description: 'Grant direct Courier Management permissions to this user',
    example: false,
  })
  @IsBoolean()
  courierManagementEnabled!: boolean;
}
