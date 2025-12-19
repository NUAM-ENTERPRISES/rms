import { PartialType } from '@nestjs/swagger';
import { CreateScreeningTemplateDto } from './create-template.dto';

export class UpdateScreeningTemplateDto extends PartialType(
  CreateScreeningTemplateDto,
) {}
