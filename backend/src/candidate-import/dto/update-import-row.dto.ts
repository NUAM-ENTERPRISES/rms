import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Reviewer corrections for a single parsed row.
 *
 * Every field is optional: the UI sends only what changed. Catalog fields take
 * resolved IDs, never free text, so a correction can never introduce a new
 * catalog value by accident.
 */
export class UpdateImportRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{0,3}$/, {
    message: 'countryCode must look like +91.',
  })
  countryCode?: string;

  @ApiPropertyOptional({ example: '7893578949' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6,15}$/, {
    message: 'mobileNumber must be 6-15 digits with no separators.',
  })
  mobileNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid address.' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNumber?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @ApiPropertyOptional({ description: 'Resolved ProfessionType id.' })
  @IsOptional()
  @IsString()
  professionTypeId?: string;

  @ApiPropertyOptional({ description: 'Resolved Qualification id.' })
  @IsOptional()
  @IsString()
  qualificationId?: string;

  @ApiPropertyOptional({
    description: 'Resolved RoleCatalog id; the department is derived from it.',
  })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

  @ApiPropertyOptional({ description: 'Recruiter who will own this candidate.' })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiPropertyOptional({ example: ['SA', 'AE'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCountries?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licensingExam?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dataFlow?: boolean;

  @ApiPropertyOptional({
    description: 'Stored on the initial status history entry, not the profile.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  @ApiPropertyOptional({
    description:
      'Exclude this row from the import, e.g. a duplicate the reviewer wants to keep out.',
  })
  @IsOptional()
  @IsBoolean()
  skip?: boolean;
}
