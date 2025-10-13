import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

export class EducationRequirementDto {
  @ApiProperty({
    description: 'Qualification ID from the qualifications catalog',
    example: 'clm123abc456def789',
  })
  @IsString()
  qualificationId: string;

  @ApiProperty({
    description:
      'Whether this qualification is mandatory (true) or preferred (false)',
    example: true,
  })
  @IsBoolean()
  mandatory: boolean;
}
