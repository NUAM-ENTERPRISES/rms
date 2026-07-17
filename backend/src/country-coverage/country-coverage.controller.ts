import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { CountryCoverageService } from './country-coverage.service';
import { QueryCountryCoverageDto } from './dto/query-country-coverage.dto';
import { QueryCountryCoverageUsersDto } from './dto/query-country-coverage-users.dto';

@ApiTags('Country Coverage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('country-coverage')
export class CountryCoverageController {
  constructor(
    private readonly countryCoverageService: CountryCoverageService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.READ_COUNTRY_COVERAGE)
  @ApiOperation({
    summary: 'Get country coverage summary',
    description:
      'Returns countries with active user counts, optionally filtered to GCC, by search, or by sector.',
  })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getSummary(@Query() query: QueryCountryCoverageDto) {
    return this.countryCoverageService.getCountrySummaries(query);
  }

  @Get(':countryCode/users')
  @Permissions(PERMISSIONS.READ_COUNTRY_COVERAGE)
  @ApiOperation({
    summary: 'List users covering a country',
    description:
      'Paginated list of active users with coverage for the given country code.',
  })
  @ApiParam({ name: 'countryCode', example: 'SA' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUsersByCountry(
    @Param('countryCode') countryCode: string,
    @Query() query: QueryCountryCoverageUsersDto,
  ) {
    return this.countryCoverageService.getUsersByCountry(countryCode, query);
  }
}
