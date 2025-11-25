import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMockInterviewDto } from './create-mock-interview.dto';

export class UpdateMockInterviewDto extends PartialType(
  OmitType(CreateMockInterviewDto, ['candidateProjectMapId', 'coordinatorId']),
) {}
