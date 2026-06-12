import { OmitType } from '@nestjs/swagger';
import { CreateCollectionDto } from './create-collection.dto';

/** Payload for a single intake event (collection + event 1, or add-event). */
export class CreateEventDto extends OmitType(CreateCollectionDto, [
  'candidateId',
] as const) {}
