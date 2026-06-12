import { PartialType } from '@nestjs/swagger';
import { CreateCollectionDto } from './create-collection.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdateCollectionDto extends PartialType(
  OmitType(CreateCollectionDto, ['candidateId'] as const),
) {}
