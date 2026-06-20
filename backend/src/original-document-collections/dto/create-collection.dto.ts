import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  COLLECTION_TYPES,
  COLLECTION_TYPE,
  COURIER_PARTNERS,
  DIRECT_OFFICES,
} from '../constants/collection-types';
import { CollectionItemDto } from './collection-item.dto';

export class CreateCollectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty({ enum: COLLECTION_TYPES })
  @IsIn(COLLECTION_TYPES)
  collectionType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  collectedByUserId: string;

  @ApiProperty()
  @IsDateString()
  collectedAt: string;

  @ApiPropertyOptional({ enum: DIRECT_OFFICES })
  @ValidateIf((o) => o.collectionType === COLLECTION_TYPE.DIRECT)
  @IsIn(DIRECT_OFFICES)
  directOffice?: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (o) =>
      o.collectionType === COLLECTION_TYPE.DIRECT &&
      o.directOffice === 'other',
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  directOfficeOther?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.collectionType === COLLECTION_TYPE.INTERVIEW_COORDINATOR)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  interviewVenue?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.collectionType === COLLECTION_TYPE.AGENT)
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (o) => o.collectionType === COLLECTION_TYPE.AGENT && !o.agentId,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  agentNameManual?: string;

  @ApiPropertyOptional({ enum: COURIER_PARTNERS })
  @ValidateIf((o) => o.collectionType === COLLECTION_TYPE.COURIER)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  courierPartner?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.collectionType === COLLECTION_TYPE.COURIER)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @ApiPropertyOptional({ type: [CollectionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionItemDto)
  items?: CollectionItemDto[];
}
