import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompleteTrainingSessionDto } from './complete-session.dto';

export class BulkUpdateSessionItem extends CompleteTrainingSessionDto {
  @ApiProperty({
    description: 'ID of the training session',
    example: 'ckx7r1234abcd',
  })
  @IsString()
  sessionId: string;
}

export class BulkCompleteSessionsDto {
  @ApiProperty({
    description: 'Array of session completion detailed records',
    type: [BulkUpdateSessionItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateSessionItem)
  sessions: BulkUpdateSessionItem[];
}
