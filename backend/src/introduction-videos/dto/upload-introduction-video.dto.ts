import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadIntroductionVideoDto {
  @ApiPropertyOptional({
    description: 'Optional remarks about the introduction video',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
