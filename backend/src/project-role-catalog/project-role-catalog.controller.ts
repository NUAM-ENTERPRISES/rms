import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectRoleCatalogService } from './project-role-catalog.service';
import { QueryProjectRoleCatalogDto } from './dto/query-project-role-catalog.dto';

@ApiTags('Project Role Catalog')
@ApiBearerAuth()
@Controller('project-role-catalog')
export class ProjectRoleCatalogController {
  constructor(private readonly projectRoleService: ProjectRoleCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all project roles',
    description: 'Retrieve the complete catalog of project roles with categories.',
  })
  @ApiResponse({
    status: 200,
    description: 'Project roles retrieved successfully',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for role name or category',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by role category',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  async findAll(@Query() query: QueryProjectRoleCatalogDto) {
    return this.projectRoleService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get project role by ID',
    description: 'Retrieve a specific project role from the catalog using its ID.',
  })
  @ApiParam({ name: 'id', description: 'Project role ID', example: 'prc_123' })
  @ApiResponse({
    status: 200,
    description: 'Project role retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Project role not found' })
  async findOne(@Param('id') id: string) {
    return this.projectRoleService.findOne(id);
  }
}
