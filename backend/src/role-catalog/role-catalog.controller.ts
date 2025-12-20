import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RoleCatalogService } from './role-catalog.service';
import { QueryRolesDto } from './dto/query-roles.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Role Catalog')
@Controller('role-catalog')
export class RoleCatalogController {
  constructor(private readonly roleCatalogService: RoleCatalogService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all healthcare roles with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'List of healthcare roles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  label: { type: 'string' },
                  shortName: { type: 'string' },
                  roleDepartmentId: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async findAll(@Query() queryDto: QueryRolesDto) {
    const result = await this.roleCatalogService.findAll(queryDto);
    return {
      success: true,
      data: result,
      message: 'Roles retrieved successfully',
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a specific healthcare role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'Role retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
              label: { type: 'string' },
              shortName: { type: 'string' },
              roleDepartmentId: { type: 'string' },
            description: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            recommendedQualifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  weight: { type: 'number' },
                  isPreferred: { type: 'boolean' },
                  notes: { type: 'string' },
                  countryCode: { type: 'string' },
                  qualification: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      shortName: { type: 'string' },
                      level: { type: 'string' },
                      field: { type: 'string' },
                      program: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string) {
    const role = await this.roleCatalogService.findOne(id);
    if (!role) {
      return {
        success: false,
        data: null,
        message: 'Role not found',
      };
    }

    return {
      success: true,
      data: role,
      message: 'Role retrieved successfully',
    };
  }

  @Get(':id/recommended-qualifications')
  @Public()
  @ApiOperation({
    summary: 'Get recommended qualifications for a specific role',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    description: 'Country code for localized recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommended qualifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              weight: { type: 'number' },
              isPreferred: { type: 'boolean' },
              notes: { type: 'string' },
              countryCode: { type: 'string' },
              qualification: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  shortName: { type: 'string' },
                  level: { type: 'string' },
                  field: { type: 'string' },
                  program: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getRecommendedQualifications(
    @Param('id') roleId: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const qualifications =
      await this.roleCatalogService.getRecommendedQualifications(
        roleId,
        countryCode,
      );
    return {
      success: true,
      data: qualifications,
      message: 'Recommended qualifications retrieved successfully',
    };
  }
}
