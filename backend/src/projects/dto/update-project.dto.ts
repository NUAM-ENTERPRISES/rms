import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/** Status changes use PATCH /projects/:id/status — excluded from general updates. */
export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['status'] as const),
) {}
