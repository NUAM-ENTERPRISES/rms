import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class QueryPassportLookupDto {
  @ApiProperty({
    description: 'Passport number to look up (min 3 characters after trim)',
    example: 'A1234567',
  })
  @IsString()
  @MinLength(3)
  passportNumber!: string;
}
