import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateDocumentsControlCapabilitiesDto {
  @ApiProperty({
    description: 'Grant access to Original Document Intake features',
    example: true,
  })
  @IsBoolean()
  originalDocumentIntakeEnabled!: boolean;

  @ApiProperty({
    description: 'Grant access to Courier Management features',
    example: false,
  })
  @IsBoolean()
  courierManagementEnabled!: boolean;
}
