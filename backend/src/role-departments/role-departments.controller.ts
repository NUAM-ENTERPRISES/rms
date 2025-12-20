import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RoleDepartmentsService } from './role-departments.service';
import { QueryRoleDepartmentDto } from './dto/query-role-department.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Role Departments')
@Controller('role-departments')
export class RoleDepartmentsController {
  constructor(private readonly service: RoleDepartmentsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all role departments (optionally include role catalog)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search departments by name or label' })
  @ApiQuery({ name: 'includeRoles', required: false, description: 'Include role catalog entries', example: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Role departments retrieved successfully' })
  async findAll(@Query() query: QueryRoleDepartmentDto) {
    const result = await this.service.findAll(query);
    return {
      success: true,
      data: result,
      message: 'Role departments retrieved successfully',
    };
  }

  @Get('ping')
  @Public()
  ping() {
    return { success: true, message: 'role-departments OK' };
  }
}
