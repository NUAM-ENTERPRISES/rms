import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CountriesService,
  PaginatedCountries,
  CountryWithStats,
} from './countries.service';
import { QueryCountriesDto } from './dto/query-countries.dto';
import { Country } from '@prisma/client';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get paginated list of countries',
    description:
      'Retrieve countries with optional filtering by search term, region, and active status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Countries retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            countries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'US' },
                  name: { type: 'string', example: 'United States' },
                  region: { type: 'string', example: 'North America' },
                  callingCode: { type: 'string', example: '+1' },
                  currency: { type: 'string', example: 'USD' },
                  timezone: { type: 'string', example: 'America/New_York' },
                  isActive: { type: 'boolean', example: true },
                  projectCount: { type: 'number', example: 5 },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 50 },
                total: { type: 'number', example: 195 },
                totalPages: { type: 'number', example: 4 },
              },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Countries retrieved successfully',
        },
      },
    },
  })
  async findAll(@Query() query: QueryCountriesDto): Promise<{
    success: boolean;
    data: PaginatedCountries;
    message: string;
  }> {
    const data = await this.countriesService.findAll(query);
    return {
      success: true,
      data,
      message: 'Countries retrieved successfully',
    };
  }

  @Get('active')
  @Public()
  @ApiOperation({
    summary: 'Get all active countries',
    description:
      'Retrieve all active countries without pagination (for dropdowns)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active countries retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'US' },
              name: { type: 'string', example: 'United States' },
              region: { type: 'string', example: 'North America' },
              callingCode: { type: 'string', example: '+1' },
              currency: { type: 'string', example: 'USD' },
              timezone: { type: 'string', example: 'America/New_York' },
              isActive: { type: 'boolean', example: true },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Active countries retrieved successfully',
        },
      },
    },
  })
  async getActiveCountries(): Promise<{
    success: boolean;
    data: Country[];
    message: string;
  }> {
    const data = await this.countriesService.getActiveCountries();
    return {
      success: true,
      data,
      message: 'Active countries retrieved successfully',
    };
  }

  @Get('by-region')
  @Public()
  @ApiOperation({
    summary: 'Get countries grouped by region',
    description: 'Retrieve active countries grouped by their regions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Countries by region retrieved successfully',
  })
  async getCountriesByRegion(): Promise<{
    success: boolean;
    data: Record<string, Country[]>;
    message: string;
  }> {
    const data = await this.countriesService.getCountriesByRegion();
    return {
      success: true,
      data,
      message: 'Countries by region retrieved successfully',
    };
  }

  @Get(':code')
  @Public()
  @ApiOperation({
    summary: 'Get country by code',
    description: 'Retrieve a specific country by its ISO-2 code',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO-2 country code (e.g., US, IN, GB)',
    example: 'US',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'US' },
            name: { type: 'string', example: 'United States' },
            region: { type: 'string', example: 'North America' },
            callingCode: { type: 'string', example: '+1' },
            currency: { type: 'string', example: 'USD' },
            timezone: { type: 'string', example: 'America/New_York' },
            isActive: { type: 'boolean', example: true },
            projectCount: { type: 'number', example: 5 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Country retrieved successfully' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Country not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: "Country with code 'XX' not found",
        },
      },
    },
  })
  async findOne(@Param('code') code: string): Promise<{
    success: boolean;
    data: CountryWithStats;
    message: string;
  }> {
    try {
      const data = await this.countriesService.findOne(code);
      return {
        success: true,
        data,
        message: 'Country retrieved successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Country with code '${code}' not found`);
    }
  }
}
