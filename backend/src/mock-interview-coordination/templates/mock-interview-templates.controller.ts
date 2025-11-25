import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MockInterviewTemplatesService } from './mock-interview-templates.service';
import { CreateMockInterviewTemplateDto } from './dto/create-template.dto';
import { UpdateMockInterviewTemplateDto } from './dto/update-template.dto';
import { QueryMockInterviewTemplatesDto } from './dto/query-templates.dto';
import { Permissions } from '../../auth/rbac/permissions.decorator';

@ApiTags('Mock Interview Templates')
@ApiBearerAuth()
@Controller('mock-interview-templates')
export class MockInterviewTemplatesController {
  constructor(
    private readonly templatesService: MockInterviewTemplatesService,
  ) {}

  @Post()
  @Permissions('write:interview_templates')
  @ApiOperation({
    summary: 'Create a new mock interview template',
    description:
      'Create a new checklist template for a specific role. Interview Coordinators only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Template with same criterion already exists for this role',
  })
  create(@Body() createDto: CreateMockInterviewTemplateDto) {
    return this.templatesService.create(createDto);
  }

  @Get()
  @Permissions('read:interview_templates')
  @ApiOperation({
    summary: 'Get all mock interview templates',
    description:
      'Retrieve all checklist templates with optional filtering by role, category, or active status.',
  })
  @ApiQuery({
    name: 'roleId',
    required: false,
    description: 'Filter by role ID',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  findAll(@Query() query: QueryMockInterviewTemplatesDto) {
    return this.templatesService.findAll(query);
  }

  @Get('role/:roleId')
  @Permissions('read:interview_templates')
  @ApiOperation({
    summary: 'Get all templates for a specific role',
    description:
      'Retrieve all active checklist templates for a specific role, ordered by display order.',
  })
  @ApiParam({
    name: 'roleId',
    description: 'Role ID from RoleCatalog',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  findByRole(@Param('roleId') roleId: string) {
    return this.templatesService.findByRole(roleId);
  }

  @Get(':id')
  @Permissions('read:interview_templates')
  @ApiOperation({
    summary: 'Get a single template by ID',
    description: 'Retrieve a specific mock interview template by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('write:interview_templates')
  @ApiOperation({
    summary: 'Update a template',
    description:
      'Update an existing mock interview template. Interview Coordinators only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate criterion for this role',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMockInterviewTemplateDto,
  ) {
    return this.templatesService.update(id, updateDto);
  }

  @Delete(':id')
  @Permissions('manage:interview_templates')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a template',
    description:
      'Delete a mock interview template. Interview Coordinators only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post('bulk/:roleId')
  @Permissions('write:interview_templates')
  @ApiOperation({
    summary: 'Bulk create/update templates for a role',
    description:
      'Create or update multiple templates for a specific role at once. Interview Coordinators only.',
  })
  @ApiParam({
    name: 'roleId',
    description: 'Role ID from RoleCatalog',
  })
  @ApiResponse({
    status: 201,
    description: 'Templates created/updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  bulkCreate(
    @Param('roleId') roleId: string,
    @Body() templates: Omit<CreateMockInterviewTemplateDto, 'roleId'>[],
  ) {
    return this.templatesService.bulkCreate(roleId, templates);
  }
}
