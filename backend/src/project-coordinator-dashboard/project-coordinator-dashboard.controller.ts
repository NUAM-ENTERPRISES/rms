import { Controller, Get, Query, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { ProjectCoordinatorDashboardService } from './project-coordinator-dashboard.service';
import {
  MyProjectsQueryDto,
  ProjectPipelineQueryDto,
  ProjectRoleHiringStatusQueryDto,
} from './dto/project-coordinator-dashboard-query.dto';

@ApiTags('Project Coordinator Dashboard')
@ApiBearerAuth()
@Controller('project-coordinator/dashboard')
export class ProjectCoordinatorDashboardController {
  constructor(
    private readonly projectCoordinatorDashboardService: ProjectCoordinatorDashboardService,
  ) {}

  @Get('stats')
  @Permissions('read:projects')
  @ApiOperation({ summary: 'Get scoped dashboard stats for the project coordinator' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  getStats(@Request() req: { user: { id: string } }) {
    return this.projectCoordinatorDashboardService.getStats(req.user.id);
  }

  @Get('projects-by-status')
  @Permissions('read:projects')
  @ApiOperation({ summary: 'Get project counts grouped by status for the coordinator' })
  @ApiResponse({ status: 200, description: 'Project status breakdown retrieved' })
  getProjectsByStatus(@Request() req: { user: { id: string } }) {
    return this.projectCoordinatorDashboardService.getProjectsByStatus(
      req.user.id,
    );
  }

  @Get('clients-overview')
  @Permissions('read:projects')
  @ApiOperation({ summary: 'Get client project overview for the coordinator' })
  @ApiResponse({ status: 200, description: 'Clients overview retrieved' })
  getClientsOverview(@Request() req: { user: { id: string } }) {
    return this.projectCoordinatorDashboardService.getClientsOverview(
      req.user.id,
    );
  }

  @Get('my-projects')
  @Permissions('read:projects')
  @ApiOperation({ summary: 'List coordinator-owned projects for dashboard pickers' })
  @ApiResponse({ status: 200, description: 'Coordinator projects retrieved' })
  getMyProjects(
    @Request() req: { user: { id: string } },
    @Query() query: MyProjectsQueryDto,
  ) {
    return this.projectCoordinatorDashboardService.getMyProjects(
      req.user.id,
      query,
    );
  }

  @Get('project-pipeline')
  @Permissions('read:projects')
  @ApiOperation({
    summary: 'Get candidate pipeline stage counts for a coordinator-owned project',
  })
  @ApiResponse({ status: 200, description: 'Project pipeline retrieved' })
  getProjectPipeline(
    @Request() req: { user: { id: string } },
    @Query() query: ProjectPipelineQueryDto,
  ) {
    return this.projectCoordinatorDashboardService.getProjectPipeline(
      req.user.id,
      query,
    );
  }

  @Get('project-role-hiring-status')
  @Permissions('read:projects')
  @ApiOperation({
    summary: 'Get project role hiring status for coordinator-owned active projects',
  })
  @ApiResponse({ status: 200, description: 'Project role hiring status retrieved' })
  getProjectRoleHiringStatus(
    @Request() req: { user: { id: string } },
    @Query() query: ProjectRoleHiringStatusQueryDto,
  ) {
    return this.projectCoordinatorDashboardService.getProjectRoleHiringStatus(
      req.user.id,
      query,
    );
  }
}
