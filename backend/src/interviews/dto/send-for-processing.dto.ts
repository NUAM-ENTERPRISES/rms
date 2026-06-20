import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkSendForProcessingDto {
  @ApiProperty({
    type: [String],
    description: 'Interview IDs to send for processing',
    example: ['clxyz123', 'clxyz456'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  interviewIds: string[];
}
