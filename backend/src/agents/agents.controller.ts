import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { QueryAgentsDto } from './dto/query-agents.dto';
import { QueryAgentCandidatesDto } from './dto/query-agent-candidates.dto';
import { LinkAgentProjectsDto } from './dto/link-agent-projects.dto';
import { UpdateAgentProjectDto } from './dto/update-agent-project.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @Permissions('write:agents')
  @ApiOperation({
    summary: 'Create a new agent',
    description:
      'Creates an external partner (agent) record. Requires `write:agents`.',
  })
  @ApiBody({ type: CreateAgentDto })
  @ApiResponse({
    status: 201,
    description: 'Agent created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Agent created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clxxxxxxxx' },
            name: { type: 'string' },
            email: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing write:agents' })
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  @Get()
  @Permissions('read:agents')
  @ApiOperation({
    summary: 'List agents',
    description:
      'Paginated list with optional search, `isActive`, and `agentType` filters. Query shape is defined by `QueryAgentsDto`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agents retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              isActive: { type: 'boolean' },
              _count: {
                type: 'object',
                properties: { candidates: { type: 'number' } },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing read:agents' })
  findAll(@Query() query: QueryAgentsDto) {
    return this.agentsService.findAll(query);
  }

  @Get(':id/candidates')
  @Permissions('read:agents')
  @ApiOperation({
    summary: 'List candidates for an agent',
    description:
      'Returns candidates where `Candidate.agentId` matches this agent. Supports search and status filter; pagination via query.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agent ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent candidates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing read:agents' })
  getAgentCandidates(
    @Param('id') id: string,
    @Query() query: QueryAgentCandidatesDto,
  ) {
    return this.agentsService.getAgentCandidates(id, query);
  }

  @Get(':id/projects')
  @Permissions('read:agents')
  @ApiOperation({
    summary: 'List client projects linked to an agent',
    description:
      'Returns `AgentProject` rows (master data) with nested project and client summary.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agent ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent projects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              agentId: { type: 'string' },
              projectId: { type: 'string' },
              notes: { type: 'string', nullable: true },
              isActive: { type: 'boolean' },
              project: { type: 'object' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing read:agents' })
  getAgentProjects(@Param('id') id: string) {
    return this.agentsService.getAgentProjects(id);
  }

  @Post(':id/projects')
  @Permissions('edit:agents')
  @ApiOperation({
    summary: 'Link projects to an agent',
    description:
      'Upserts one or more `AgentProject` links. Unknown project IDs return 400.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agent ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiBody({ type: LinkAgentProjectsDto })
  @ApiResponse({
    status: 200,
    description: 'Links created/updated; response body matches GET `:id/projects`',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payload or project not found' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing edit:agents' })
  linkAgentProjects(@Param('id') id: string, @Body() dto: LinkAgentProjectsDto) {
    return this.agentsService.linkAgentProjects(id, dto);
  }

  @Patch(':id/projects/:projectId')
  @Permissions('edit:agents')
  @ApiOperation({
    summary: 'Update an agent–project link',
    description: 'Patch `notes` and/or `isActive` on an existing `AgentProject` row.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agent ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiBody({ type: UpdateAgentProjectDto })
  @ApiResponse({
    status: 200,
    description: 'Link updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Agent or agent–project link not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing edit:agents' })
  updateAgentProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateAgentProjectDto,
  ) {
    return this.agentsService.updateAgentProject(id, projectId, dto);
  }

  @Delete(':id/projects/:projectId')
  @Permissions('edit:agents')
  @ApiOperation({
    summary: 'Remove an agent–project link',
    description: 'Deletes the `AgentProject` row for this agent and project.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agent ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiResponse({
    status: 200,
    description: 'Link removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Agent project link removed successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Agent or link not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing edit:agents' })
  unlinkAgentProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.agentsService.unlinkAgentProject(id, projectId);
  }

  @Get(':id')
  @Permissions('read:agents')
  @ApiOperation({
    summary: 'Get agent by ID',
    description: 'Includes `_count.candidates` when returned from the service.',
  })
  @ApiParam({
    name: 'id',
    description: 'Agent ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            _count: {
              type: 'object',
              properties: { candidates: { type: 'number' } },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing read:agents' })
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('edit:agents')
  @ApiOperation({
    summary: 'Update an agent',
    description: 'Partial update; all body fields are optional (`UpdateAgentDto`).',
  })
  @ApiParam({
    name: 'id',
    description: 'Agent ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiBody({ type: UpdateAgentDto })
  @ApiResponse({
    status: 200,
    description: 'Agent updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing edit:agents' })
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentsService.update(id, updateAgentDto);
  }

  @Delete(':id')
  @Permissions('delete:agents')
  @ApiOperation({
    summary: 'Delete an agent',
    description:
      'Removes the agent row. Related `AgentProject` rows cascade; candidate `agentId` behavior depends on schema (typically set null or restrict).',
  })
  @ApiParam({
    name: 'id',
    description: 'Agent ID (cuid)',
    example: 'clxxxxxxxx',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Agent deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing delete:agents' })
  remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }
}
