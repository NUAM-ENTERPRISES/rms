import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
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
import { QueryTransferPreviewDto } from './dto/query-transfer-preview.dto';
import { QueryTransferPeersDto } from './dto/query-transfer-peers.dto';
import { QueryTransferHistoryDto } from './dto/query-transfer-history.dto';
import { TransferCountryCoverageDto } from './dto/transfer-country-coverage.dto';

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

  @Get(':countryCode/transfer-history/:transferId/candidates')
  @Permissions(PERMISSIONS.READ_COUNTRY_COVERAGE)
  @ApiOperation({
    summary: 'List candidates for a coverage transfer',
    description:
      'Paginated per-candidate handoff lines for one transfer event (use when candidateCount is large).',
  })
  @ApiParam({ name: 'countryCode', example: 'IE' })
  @ApiParam({ name: 'transferId', description: 'Transfer history record ID' })
  @ApiResponse({ status: 200, description: 'Candidates retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async getTransferHistoryCandidates(
    @Param('countryCode') countryCode: string,
    @Param('transferId') transferId: string,
    @Query() query: QueryTransferHistoryDto,
  ) {
    return this.countryCoverageService.getTransferHistoryCandidates(
      countryCode,
      transferId,
      query,
    );
  }

  @Get(':countryCode/transfer-history')
  @Permissions(PERMISSIONS.READ_COUNTRY_COVERAGE)
  @ApiOperation({
    summary: 'List country coverage transfer history',
    description:
      'Paginated transfer events that moved coverage into or out of this country/GCC. Candidate handoffs are loaded separately via the candidates endpoint.',
  })
  @ApiParam({ name: 'countryCode', example: 'IE' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getTransferHistory(
    @Param('countryCode') countryCode: string,
    @Query() query: QueryTransferHistoryDto,
  ) {
    return this.countryCoverageService.getTransferHistory(countryCode, query);
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

  @Get(':sourceCountryCode/users/:userId/transfer-preview')
  @Permissions(PERMISSIONS.MANAGE_USERS)
  @ApiOperation({
    summary: 'Preview country coverage transfer',
    description:
      'Returns a paginated list of positive candidates to hand off (default 10 per page) and coverage rows that will be removed. Use selectAllPositive on transfer instead of shipping all candidate IDs. Peer recruiters are loaded separately via transfer-peers.',
  })
  @ApiParam({ name: 'sourceCountryCode', example: 'GCC' })
  @ApiParam({ name: 'userId', description: 'Source recruiter user ID' })
  @ApiResponse({ status: 200, description: 'Preview retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getTransferPreview(
    @Param('sourceCountryCode') sourceCountryCode: string,
    @Param('userId') userId: string,
    @Query() query: QueryTransferPreviewDto,
  ) {
    return this.countryCoverageService.getTransferPreview(
      sourceCountryCode,
      userId,
      query,
    );
  }

  @Get(':sourceCountryCode/users/:userId/transfer-peers')
  @Permissions(PERMISSIONS.MANAGE_USERS)
  @ApiOperation({
    summary: 'List peer recruiters for country coverage transfer',
    description:
      'Paginated ACTIVE recruiters who cover the same source country/GCC (excludes the source user). Supports search by name or email.',
  })
  @ApiParam({ name: 'sourceCountryCode', example: 'GCC' })
  @ApiParam({ name: 'userId', description: 'Source recruiter user ID' })
  @ApiResponse({ status: 200, description: 'Peers retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getTransferPeers(
    @Param('sourceCountryCode') sourceCountryCode: string,
    @Param('userId') userId: string,
    @Query() query: QueryTransferPeersDto,
  ) {
    return this.countryCoverageService.getTransferPeers(
      sourceCountryCode,
      userId,
      query,
    );
  }

  @Post(':sourceCountryCode/users/:userId/transfer')
  @Permissions(PERMISSIONS.MANAGE_USERS)
  @ApiOperation({
    summary: 'Transfer recruiter country coverage',
    description:
      'Hands off all positive candidates to a same-source peer recruiter, then moves the source recruiter’s coverage to the destination country.',
  })
  @ApiParam({ name: 'sourceCountryCode', example: 'GCC' })
  @ApiParam({ name: 'userId', description: 'Source recruiter user ID' })
  @ApiResponse({ status: 200, description: 'Transfer completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async transferCountryCoverage(
    @Param('sourceCountryCode') sourceCountryCode: string,
    @Param('userId') userId: string,
    @Body() dto: TransferCountryCoverageDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.countryCoverageService.transferCountryCoverage(
      sourceCountryCode,
      userId,
      dto,
      req.user.id,
    );
  }
}
