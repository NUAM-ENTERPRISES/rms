import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LogOperationsCallDto {
  @ApiProperty({
    description: 'Note describing the call attempt outcome',
    example: 'Called twice, no answer. Left voicemail.',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  note: string;

  @ApiProperty({
    description: 'CRE contacted the candidate via phone call',
    example: true,
  })
  @IsBoolean()
  usedPhone: boolean;

  @ApiProperty({
    description: 'CRE contacted the candidate via WhatsApp',
    example: false,
  })
  @IsBoolean()
  usedWhatsapp: boolean;
}
