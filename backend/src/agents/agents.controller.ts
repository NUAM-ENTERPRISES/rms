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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new agent' })
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  @Get()
  @Permissions('read:agents')
  @ApiOperation({ summary: 'Get all agents' })
  findAll(@Query() query: QueryAgentsDto) {
    return this.agentsService.findAll(query);
  }

  @Get(':id/candidates')
  @Permissions('read:agents')
  @ApiOperation({ summary: 'Get candidates for an agent' })
  getAgentCandidates(
    @Param('id') id: string,
    @Query() query: QueryAgentCandidatesDto,
  ) {
    return this.agentsService.getAgentCandidates(id, query);
  }

  @Get(':id')
  @Permissions('read:agents')
  @ApiOperation({ summary: 'Get agent by ID' })
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('edit:agents')
  @ApiOperation({ summary: 'Update an agent' })
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentsService.update(id, updateAgentDto);
  }

  @Delete(':id')
  @Permissions('delete:agents')
  @ApiOperation({ summary: 'Delete an agent' })
  remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }
}
