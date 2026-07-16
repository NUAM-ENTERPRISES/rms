import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ProfessionTypesService } from './profession-types.service';

@ApiTags('Profession Types')
@Controller('profession-types')
export class ProfessionTypesController {
  constructor(
    private readonly professionTypesService: ProfessionTypesService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active profession types' })
  @ApiResponse({
    status: 200,
    description: 'Profession types retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            professionTypes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string', example: 'nurse' },
                  label: { type: 'string', example: 'Nurse' },
                  description: { type: 'string' },
                  sector: {
                    type: 'string',
                    enum: ['HEALTHCARE', 'NON_HEALTH_CARE'],
                    nullable: true,
                  },
                  sortOrder: { type: 'number' },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  })
  async findAll(@Query('sector') sector?: 'HEALTHCARE' | 'NON_HEALTH_CARE') {
    const data = await this.professionTypesService.findAll(sector);
    return {
      success: true,
      data,
    };
  }
}
