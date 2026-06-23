import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CandidateCountryRestrictionsService } from './candidate-country-restrictions.service';
import { LiftCountryRestrictionDto } from './dto/lift-country-restriction.dto';
import { ListCountryRestrictionsQueryDto } from './dto/list-country-restrictions-query.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { Roles } from '../auth/rbac/roles.decorator';
import { RolesGuard } from '../auth/rbac/roles.guard';
import { COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES } from '../common/constants/role-ids';

@ApiTags('Candidate Country Restrictions')
@ApiBearerAuth()
@Controller('candidates/:candidateId/country-restrictions')
export class CandidateCountryRestrictionsController {
  constructor(
    private readonly countryRestrictionsService: CandidateCountryRestrictionsService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.READ_CANDIDATES)
  @ApiOperation({ summary: 'List country restrictions for a candidate' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include lifted (inactive) restrictions',
  })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    type: String,
    description: 'Filter by ISO country code',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Restrictions returned' })
  async list(
    @Param('candidateId') candidateId: string,
    @Query() query: ListCountryRestrictionsQueryDto,
  ) {
    const data = await this.countryRestrictionsService.findRestrictions(
      candidateId,
      query,
    );
    return { success: true, data };
  }

  @Delete(':countryCode')
  @UseGuards(RolesGuard)
  @Roles(...COUNTRY_RESTRICTION_PROFILE_EDIT_ROLES)
  @Permissions(PERMISSIONS.WRITE_CANDIDATES)
  @ApiOperation({ summary: 'Lift an active country restriction (Manager / Recruiter Manager)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Restriction lifted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No active restriction' })
  async lift(
    @Param('candidateId') candidateId: string,
    @Param('countryCode') countryCode: string,
    @Body() body: LiftCountryRestrictionDto,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.countryRestrictionsService.liftRestriction(
      candidateId,
      countryCode,
      req.user.id,
      body.reason.trim(),
    );
    return { success: true, data, message: 'Country restriction lifted' };
  }
}
