import { PartialType } from '@nestjs/swagger';
import { CreateCandidateQualificationDto } from './create-candidate-qualification.dto';

export class UpdateCandidateQualificationDto extends PartialType(
  CreateCandidateQualificationDto,
) {
  // Remove candidateId from update as it shouldn't be changed
  candidateId?: never;
}
