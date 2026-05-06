import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAgentDto } from './create-agent.dto';

/** Patch body excludes `projectLinks` — use POST /agents/:id/projects to manage links. */
export class UpdateAgentDto extends PartialType(
  OmitType(CreateAgentDto, ['projectLinks'] as const),
) {}
