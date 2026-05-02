import { ApiProperty } from '@nestjs/swagger';
import { SessionAvailability } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetSessionAvailabilityDto {
  @ApiProperty({
    enum: SessionAvailability,
    description: 'Current session availability (break / on-call excludes user from idle)',
    example: SessionAvailability.BREAK,
  })
  @IsEnum(SessionAvailability)
  availability: SessionAvailability;
}
