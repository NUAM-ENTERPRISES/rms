import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QualificationsService } from './qualifications.service';
import { QueryQualificationsDto } from './dto/query-qualifications.dto';
import { Public } from '../auth/decorators/public.decorator';

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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            qualifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  shortName: { type: 'string' },
                  level: { type: 'string' },
                  field: { type: 'string' },
                  program: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  aliases: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        alias: { type: 'string' },
                        isCommon: { type: 'boolean' },
                      },
                    },
                  },
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
  async findAll(@Query() queryDto: QueryQualificationsDto) {
    const result = await this.qualificationsService.findAll(queryDto);
    return {
      success: true,
      data: result,
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            shortName: { type: 'string' },
            level: { type: 'string' },
            field: { type: 'string' },
            program: { type: 'string' },
            description: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            aliases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  alias: { type: 'string' },
                  isCommon: { type: 'boolean' },
                },
              },
            },
            countryProfiles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  countryCode: { type: 'string' },
                  regulatedTitle: { type: 'string' },
                  issuingBody: { type: 'string' },
                  accreditationStatus: { type: 'string' },
                  notes: { type: 'string' },
                  country: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
            equivalencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  toQualification: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      shortName: { type: 'string' },
                      level: { type: 'string' },
                      field: { type: 'string' },
                    },
                  },
                  countryCode: { type: 'string' },
                  isEquivalent: { type: 'boolean' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
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
}
