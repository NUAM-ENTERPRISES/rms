import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectDeadlineAutoCompleteService {
  /** Deadline expiry no longer changes project status; kept for API compatibility. */
  async autoCompleteExpiredProjects(): Promise<number> {
    return 0;
  }
}
