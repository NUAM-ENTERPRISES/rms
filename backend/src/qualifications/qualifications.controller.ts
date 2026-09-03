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
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QualificationsService } from './qualifications.service';
import { QueryQualificationsDto } from './dto/query-qualifications.dto';
import { QueryAdminQualificationsDto } from './dto/query-admin-qualifications.dto';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Qualifications')
@Controller('qualifications')
export class QualificationsController {
  constructor(private readonly qualificationsService: QualificationsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all qualifications with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'List of qualifications retrieved successfully',
  })
  async findAll(@Query() queryDto: QueryQualificationsDto) {
    const result = await this.qualificationsService.findAll(queryDto);
    return {
      success: true,
      data: result,
      message: 'Qualifications retrieved successfully',
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.READ_QUALIFICATIONS,
    PERMISSIONS.MANAGE_QUALIFICATIONS,
  )
  @ApiOperation({
    summary: 'List all qualifications including inactive (admin catalog)',
  })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['CERTIFICATE', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE'],
  })
  @ApiQuery({ name: 'field', required: false })
  async findAllForAdmin(@Query() query: QueryAdminQualificationsDto) {
    const data = await this.qualificationsService.findAllForAdmin(query);
    return {
      success: true,
      data,
      message: 'Qualifications retrieved successfully',
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a specific qualification by ID' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: 200,
    description: 'Qualification retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Qualification not found' })
  async findOne(@Param('id') id: string) {
    const qualification = await this.qualificationsService.findOne(id);
    if (!qualification) {
      return {
        success: false,
        data: null,
        message: 'Qualification not found',
      };
    }

    return {
      success: true,
      data: qualification,
      message: 'Qualification retrieved successfully',
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.MANAGE_QUALIFICATIONS,
    PERMISSIONS.WRITE_CANDIDATES,
    PERMISSIONS.MANAGE_CANDIDATES,
  )
  @ApiOperation({
    summary: 'Create a qualification',
    description:
      'Catalog managers or users who can create/update candidates may add a qualification (e.g. during candidate intake).',
  })
  @ApiResponse({ status: 201, description: 'Qualification created' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async create(@Body() dto: CreateQualificationDto) {
    const data = await this.qualificationsService.create(dto);
    return {
      success: true,
      data,
      message: 'Qualification created successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.MANAGE_QUALIFICATIONS)
  @ApiOperation({ summary: 'Update a qualification' })
  @ApiResponse({ status: 200, description: 'Qualification updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQualificationDto,
  ) {
    const data = await this.qualificationsService.update(id, dto);
    return {
      success: true,
      data,
      message: 'Qualification updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.MANAGE_QUALIFICATIONS)
  @ApiOperation({
    summary: 'Soft-delete a qualification (sets isActive=false)',
  })
  @ApiResponse({ status: 200, description: 'Qualification soft-deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async softDelete(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.qualificationsService.softDelete(id, req.user.id);
    return {
      success: true,
      data,
      message: 'Qualification deleted successfully',
    };
  }
}
