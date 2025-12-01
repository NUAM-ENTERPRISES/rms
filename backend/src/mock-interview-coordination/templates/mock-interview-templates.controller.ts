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
import { CreateTemplateItemDto } from './dto/create-template-item.dto';
import { UpdateTemplateItemDto } from './dto/update-template-item.dto';
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
      'Create a new checklist template for a specific role. Interview Coordinators only. The request may include an items array — multiple items in the same category are allowed.',
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
    description: 'Template with the same name already exists for this role',
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
  async findAll(@Query() query: QueryMockInterviewTemplatesDto) {
    const templates = await this.templatesService.findAll(query);
    return {
      success: true,
      data: templates,
      message: 'Templates retrieved successfully',
    };
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
  async findByRole(@Param('roleId') roleId: string) {
    const templates = await this.templatesService.findByRole(roleId);
    return {
      success: true,
      data: templates,
      message: 'Templates retrieved successfully',
    };
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
  async findOne(@Param('id') id: string) {
    const template = await this.templatesService.findOne(id);
    return {
      success: true,
      data: template,
      message: 'Template retrieved successfully',
    };
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

  @Post(':id/items')
  @Permissions('write:interview_templates')
  @ApiOperation({
    summary: 'Add an item to a template',
    description:
      'Add a new question/item to an existing template. Interview Coordinators only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Item added successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Category or criterion already exists',
  })
  addItem(
    @Param('id') templateId: string,
    @Body() createItemDto: CreateTemplateItemDto,
  ) {
    return this.templatesService.addItem(templateId, createItemDto);
  }

  @Patch(':id/items/:itemId')
  @Permissions('write:interview_templates')
  @ApiOperation({
    summary: 'Update a template item',
    description: 'Update an existing question/item in a template.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Template item ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template or item not found',
  })
  updateItem(
    @Param('id') templateId: string,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateTemplateItemDto,
  ) {
    return this.templatesService.updateItem(templateId, itemId, updateItemDto);
  }

  @Delete(':id/items/:itemId')
  @Permissions('write:interview_templates')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an item from a template',
    description: 'Delete a question/item from a template.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Template item ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Item deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template or item not found',
  })
  removeItem(@Param('id') templateId: string, @Param('itemId') itemId: string) {
    return this.templatesService.removeItem(templateId, itemId);
  }
}
