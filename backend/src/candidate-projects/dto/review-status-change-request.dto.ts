import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReviewStatusChangeRequestDto {
  @ApiPropertyOptional({
    description: 'Optional notes from the reviewer when approving or rejecting',
  })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
