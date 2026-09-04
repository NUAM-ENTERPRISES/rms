import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ConfirmImportDto {
  @ApiPropertyOptional({
    description:
      'Restrict the import to these row ids. Omit to import every row currently marked ready.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rowIds?: string[];
}

export class SetSheetOwnersDto {
  @ApiPropertyOptional({
    description:
      'Map of sheet name to recruiter user id, used when a manager uploads a multi-tab workbook.',
    example: { FERNANDEZ: 'clx123', VARUNDAS: 'clx456' },
  })
  @IsOptional()
  owners!: Record<string, string>;
}

export class SetBatchRecruiterDto {
  @ApiProperty({
    description:
      'Recruiter who will own every row in this batch. Skipped rows keep their skip status but get the new owner.',
  })
  @IsString()
  recruiterId!: string;
}
