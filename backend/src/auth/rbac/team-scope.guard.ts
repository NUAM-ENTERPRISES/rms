import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RbacUtil } from './rbac.util';

@Injectable()
export class TeamScopeGuard implements CanActivate {
  constructor(private rbacUtil: RbacUtil) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get the resource team ID from the request
    const resourceTeamId = this.getResourceTeamId(request);

    if (!resourceTeamId) {
      // If no team ID is present, allow access (could be a global resource)
      return true;
    }

    const hasTeamAccess = await this.rbacUtil.checkTeamAccess(
      user.id,
      resourceTeamId,
    );

    if (!hasTeamAccess) {
      throw new ForbiddenException('Access denied to this team resource');
    }

    return true;
  }

  private getResourceTeamId(request: any): string | null {
    // Try to get team ID from different sources
    return (
      request.body?.teamId ||
      request.params?.teamId ||
      request.query?.teamId ||
      request.body?.project?.teamId ||
      request.body?.candidate?.teamId ||
      null
    );
  }
}
