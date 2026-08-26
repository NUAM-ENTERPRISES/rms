import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { ProfessionTypesService } from './profession-types.service';
import { CreateProfessionTypeDto } from './dto/create-profession-type.dto';
import { UpdateProfessionTypeDto } from './dto/update-profession-type.dto';
import { QueryProfessionTypesDto } from './dto/query-profession-types.dto';

@ApiTags('Profession Types')
@Controller('profession-types')
export class ProfessionTypesController {
  constructor(
    private readonly professionTypesService: ProfessionTypesService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active profession types' })
  @ApiQuery({
    name: 'sector',
    required: false,
    enum: ['HEALTHCARE', 'NON_HEALTH_CARE'],
    description: 'Filter by sector. Omit for all.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number. Provide with limit to paginate.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default 10 when paginating). Max 100.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profession types retrieved successfully',
  })
  async findAll(@Query() query: QueryProfessionTypesDto) {
    const data = await this.professionTypesService.findAll(query);
    return {
      success: true,
      data,
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.READ_MASTER_CATALOG,
    PERMISSIONS.MANAGE_MASTER_CATALOG,
    PERMISSIONS.READ_SYSTEM_CONFIG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({ summary: 'List all profession types (including inactive)' })
  @ApiQuery({
    name: 'sector',
    required: false,
    enum: ['HEALTHCARE', 'NON_HEALTH_CARE'],
    description: 'Filter by sector. Omit for all.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name, label, or description',
  })
  async findAllForAdmin(
    @Query('sector') sector?: 'HEALTHCARE' | 'NON_HEALTH_CARE',
    @Query('search') search?: string,
  ) {
    const data = await this.professionTypesService.findAllForAdmin({
      sector,
      search,
    });
    return {
      success: true,
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.MANAGE_MASTER_CATALOG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({ summary: 'Create a profession type' })
  @ApiResponse({ status: 201, description: 'Profession type created' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async create(@Body() dto: CreateProfessionTypeDto) {
    const data = await this.professionTypesService.create(dto);
    return {
      success: true,
      data,
      message: 'Profession type created successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.MANAGE_MASTER_CATALOG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({ summary: 'Update a profession type' })
  @ApiResponse({ status: 200, description: 'Profession type updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProfessionTypeDto,
  ) {
    const data = await this.professionTypesService.update(id, dto);
    return {
      success: true,
      data,
      message: 'Profession type updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.MANAGE_MASTER_CATALOG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({ summary: 'Soft-delete a profession type (sets isActive=false)' })
  @ApiResponse({ status: 200, description: 'Profession type soft-deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async softDelete(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.professionTypesService.softDelete(id, req.user.id);
    return {
      success: true,
      data,
      message: 'Profession type deleted successfully',
    };
  }
}
