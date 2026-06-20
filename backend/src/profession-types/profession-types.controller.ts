import { Controller, Get } from '@nestjs/common';
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
  async findAll() {
    const data = await this.professionTypesService.findAll();
    return {
      success: true,
      data,
    };
  }
}
