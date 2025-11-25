import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTrainingAssignmentDto } from './create-training.dto';

export class UpdateTrainingAssignmentDto extends PartialType(
  OmitType(CreateTrainingAssignmentDto, [
    'candidateProjectMapId',
    'mockInterviewId',
  ]),
) {}
