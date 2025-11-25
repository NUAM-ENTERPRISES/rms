import { PartialType } from '@nestjs/swagger';
import { CreateMockInterviewTemplateDto } from './create-template.dto';

export class UpdateMockInterviewTemplateDto extends PartialType(
  CreateMockInterviewTemplateDto,
) {}
