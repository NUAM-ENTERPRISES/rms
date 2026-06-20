import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class InitiateIntroductionVideoUploadDto {
  @ApiProperty({ description: 'Original file name including extension' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ description: 'Video MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(105 * 1024 * 1024)
  fileSize: number;

  @ApiPropertyOptional({ description: 'Optional remarks about the video' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  @ApiPropertyOptional({
    description: 'Project ID when linking upload to a project assignment',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Upload mode for project uploads',
    enum: ['upload', 'reupload'],
    default: 'upload',
  })
  @IsOptional()
  @IsEnum(['upload', 'reupload'])
  mode?: 'upload' | 'reupload';
}
