import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateScreeningDto } from './create-screening.dto';

export class UpdateScreeningDto extends PartialType(
  OmitType(CreateScreeningDto, ['candidateProjectMapId', 'coordinatorId']),
) {}
