import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LiftCountryRestrictionDto {
  @ApiProperty({
    description: 'Reason for lifting the country restriction',
    example: 'Data Flow issue resolved after document correction.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason!: string;
}
