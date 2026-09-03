import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Multipart form fields accompanying the uploaded workbook. */
export class CreateImportBatchDto {
  @ApiPropertyOptional({
    description:
      'Recruiter who owns every row in this file. Defaults to the caller when they are a recruiter uploading their own sheet. Managers omit this and assign per sheet during review.',
  })
  @IsOptional()
  @IsString()
  defaultRecruiterId?: string;

  @ApiPropertyOptional({
    description:
      'Read only red (active) worksheet tabs and skip blue (archived) ones. Use for the full multi-recruiter workbook.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  activeTabsOnly?: boolean;
}
