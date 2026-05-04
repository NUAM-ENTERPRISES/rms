import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LanguageProficiency, RecruiterCountrySectorScope } from '@prisma/client';

export class RecruiterLanguageItemDto {
  @ApiProperty({ example: 'ml', description: 'ISO 639-1 code from languages table' })
  @IsString()
  @MinLength(2)
  @MaxLength(8)
  languageCode!: string;

  @ApiProperty({ enum: LanguageProficiency, example: LanguageProficiency.PRIMARY })
  @IsEnum(LanguageProficiency)
  proficiency!: LanguageProficiency;
}

export class UserCountryCoverageItemDto {
  @ApiProperty({ example: 'SA', description: 'Country code from countries table' })
  @IsString()
  @MinLength(2)
  @MaxLength(8)
  countryCode!: string;

  @ApiProperty({
    enum: RecruiterCountrySectorScope,
    isArray: true,
    example: [RecruiterCountrySectorScope.HEALTHCARE],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsEnum(RecruiterCountrySectorScope, { each: true })
  sectorScopes!: RecruiterCountrySectorScope[];
}

export class UpdateRecruiterCapabilitiesDto {
  @ApiProperty({ type: [RecruiterLanguageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecruiterLanguageItemDto)
  languages!: RecruiterLanguageItemDto[];

  @ApiProperty({ type: [UserCountryCoverageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserCountryCoverageItemDto)
  countryCoverages!: UserCountryCoverageItemDto[];
}
