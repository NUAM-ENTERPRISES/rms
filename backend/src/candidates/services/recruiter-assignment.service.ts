import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CANDIDATE_STATUS } from '../../common/constants/statuses';
import { GetRecruiterCandidatesDto } from '../dto/get-recruiter-candidates.dto';

export interface RecruiterInfo {
  id: string;
  name: string;
  email: string;
  candidateCount?: number;
}

@Injectable()
export class RecruiterAssignmentService {
  private readonly logger = new Logger(RecruiterAssignmentService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get the best recruiter to assign to a candidate based on user role and workload
   * If the creator is a recruiter, assign the candidate to them directly
   * Otherwise, use round-robin (least workload) assignment
   */
  async getBestRecruiterForAssignment(
    candidateId: string,
    createdByUserId: string,
  ): Promise<RecruiterInfo> {
    // Get the user who created the candidate with their roles
    const creator = await this.prisma.user.findUnique({
      where: { id: createdByUserId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!creator) {
      throw new Error(`User with ID ${createdByUserId} not found`);
    }

    // Check if creator has the Recruiter role (case-insensitive check)
    const isRecruiter = creator.userRoles.some(
      (userRole) => userRole.role.name.toLowerCase() === 'recruiter',
    );

    this.logger.log(
      `Candidate ${candidateId} created by ${creator.name} (${creator.email}). User roles: ${creator.userRoles.map((ur) => ur.role.name).join(', ')}`,
    );

    if (isRecruiter) {
      this.logger.log(
        `✅ Creator ${creator.name} is a Recruiter - assigning candidate directly to them (skipping round-robin)`,
      );
      return {
        id: creator.id,
        name: creator.name,
        email: creator.email,
      };
    }

    // If not a recruiter, find the best recruiter using workload-based round-robin assignment
    this.logger.log(
      `Creator ${creator.name} is NOT a Recruiter - using round-robin assignment based on least workload`,
    );
    return await this.getRecruiterWithLeastWorkload();
  }

  /**
   * Get recruiter with the least number of active candidates
   */
  async getRecruiterWithLeastWorkload(): Promise<RecruiterInfo> {
    // Get all recruiters with their active candidate count
    const recruiters = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'Recruiter',
            },
          },
        },
      },
      include: {
        candidateRecruiterAssignments: {
          where: {
            isActive: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (recruiters.length === 0) {
      throw new Error('No recruiters found in the system');
    }

    // Calculate workload for each recruiter
    const recruitersWithWorkload = recruiters.map((recruiter) => ({
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      candidateCount: recruiter.candidateRecruiterAssignments.length,
    }));

    // Sort by candidate count (ascending) and return the one with least workload
    const bestRecruiter = recruitersWithWorkload.sort(
      (a, b) => a.candidateCount - b.candidateCount,
    )[0];

    this.logger.log(
      `Assigned recruiter ${bestRecruiter.name} with ${bestRecruiter.candidateCount} active candidates`,
    );

    return bestRecruiter;
  }

  /**
   * Get CRE (Customer Relationship Executive) with the least workload
   */
  async getCREWithLeastWorkload(): Promise<RecruiterInfo> {
    // Get all CREs with their active RNR candidate count
    const cres = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'CRE',
            },
          },
        },
      },
      include: {
        candidateRecruiterAssignments: {
          where: {
            isActive: true,
            // candidate: {
            //   currentStatus: CANDIDATE_STATUS.RNR,
            // },
          },
        },
      },
    });

    if (cres.length === 0) {
      throw new Error('No CREs found in the system');
    }

    // Calculate RNR workload for each CRE
    const cresWithWorkload = cres.map((cre) => ({
      id: cre.id,
      name: cre.name,
      email: cre.email,
      candidateCount: cre.candidateRecruiterAssignments.length,
    }));

    // Sort by RNR candidate count (ascending) and return the one with least workload
    const bestCRE = cresWithWorkload.sort(
      (a, b) => a.candidateCount - b.candidateCount,
    )[0];

    this.logger.log(
      `Assigned CRE ${bestCRE.name} with ${bestCRE.candidateCount} active RNR candidates`,
    );

    return bestCRE;
  }

  /**
   * Assign recruiter to candidate with automatic assignment logic
   */
  async assignRecruiterToCandidate(
    candidateId: string,
    createdByUserId: string,
    reason?: string,
  ): Promise<RecruiterInfo> {
    const recruiter = await this.getBestRecruiterForAssignment(
      candidateId,
      createdByUserId,
    );

    // Deactivate any existing active assignments
    await this.prisma.candidateRecruiterAssignment.updateMany({
      where: {
        candidateId,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
        unassignedBy: createdByUserId,
      },
    });

    // Create new assignment
    await this.prisma.candidateRecruiterAssignment.create({
      data: {
        candidateId,
        recruiterId: recruiter.id,
        assignedBy: createdByUserId,
        reason: reason || 'Automatic assignment on candidate creation',
      },
    });

    this.logger.log(
      `Assigned recruiter ${recruiter.name} to candidate ${candidateId}`,
    );

    return recruiter;
  }

  /**
   * Assign CRE to candidate (for RNR status)
   */
  async assignCREToCandidate(
    candidateId: string,
    assignedByUserId?: string,
    reason?: string,
  ): Promise<RecruiterInfo> {
    const cre = await this.getCREWithLeastWorkload();
    const assignerUserId = await this.resolveAssignerUserId(
      assignedByUserId,
      cre.id,
    );

    // Deactivate any existing active assignments
    await this.prisma.candidateRecruiterAssignment.updateMany({
      where: {
        candidateId,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
        unassignedBy: assignerUserId,
      },
    });

    // Create new CRE assignment
    await this.prisma.candidateRecruiterAssignment.create({
      data: {
        candidateId,
        recruiterId: cre.id,
        assignedBy: assignerUserId,
        reason: reason || 'Automatic CRE assignment for RNR status',
      },
    });

    this.logger.log(
      `Assigned CRE ${cre.name} to candidate ${candidateId} for RNR handling`,
    );

    return cre;
  }

  private async resolveAssignerUserId(
    preferredUserId: string | undefined,
    fallbackUserId: string,
  ): Promise<string> {
    if (preferredUserId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: preferredUserId },
        select: { id: true },
      });

      if (userExists) {
        return preferredUserId;
      }

      this.logger.warn(
        `Assigner user ${preferredUserId} not found. Falling back to ${fallbackUserId}.`,
      );
    }

    return fallbackUserId;
  }

  /**
   * Get all RNR candidates that need CRE assignment (3+ days in RNR status)
   */
  async getRNRCandidatesNeedingCREAssignment(): Promise<Array<{
    candidateId: string;
    candidateName: string;
    daysInRNR: number;
    currentRecruiterId?: string;
  }>> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // First, resolve the RNR status record to get its ID
    const rnrStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.RNR,
          mode: 'insensitive',
        },
      },
    });

    if (!rnrStatus) {
      this.logger.error('RNR status not found in database');
      return [];
    }

    const rnrCandidates = await this.prisma.candidate.findMany({
      where: {
        currentStatusId: rnrStatus.id,
        updatedAt: {
          lte: threeDaysAgo,
        },
      },
      include: {
        recruiterAssignments: {
          where: {
            isActive: true,
          },
          include: {
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    return rnrCandidates.map((candidate) => {
      const daysInRNR = Math.floor(
        (Date.now() - candidate.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        daysInRNR,
        currentRecruiterId: candidate.recruiterAssignments[0]?.recruiterId,
      };
    });
  }

  /**
   * Get all candidates assigned to a recruiter with pagination and filtering
   */
  async getRecruiterCandidates(
    recruiterId: string,
    dto: GetRecruiterCandidatesDto,
  ) {
    const { page = 1, limit = 10, status, search, roleCatalogId } = dto;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      recruiterAssignments: {
        some: {
          recruiterId,
          isActive: true,
        },
      },
    };

    // Base assignment-only where used for dashboard counts (ignores search/status filters)
    const assignmentOnlyWhere = { ...whereClause };

    // Add status filter if provided
    if (status) {
      // Normalize incoming status (e.g., 'on_hold' -> 'On Hold') and try to resolve to a status record
      const normalized = status.replace(/_/g, ' ').trim();
      const titleCase = normalized
        .split(' ')
        .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');

      const statusRecord = await this.prisma.candidateStatus.findFirst({
        where: {
          OR: [
            { statusName: { equals: status, mode: 'insensitive' } },
            { statusName: { equals: normalized, mode: 'insensitive' } },
            { statusName: { equals: titleCase, mode: 'insensitive' } },
          ],
        },
        select: { id: true, statusName: true },
      });

      if (statusRecord) {
        whereClause.currentStatusId = statusRecord.id;
      } else {
        // Fallback: try to match by status enum value directly (some DB rows may store lowercase)
        whereClause.currentStatus = { statusName: { equals: status, mode: 'insensitive' } };
      }
    }

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          mobileNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (roleCatalogId && roleCatalogId !== 'all') {
      whereClause.workExperiences = {
        some: {
          roleCatalogId: roleCatalogId,
        },
      };
    }

    // CreatedAt / Date range filtering (server-side)
    // Normalize incoming dateFrom/dateTo to full UTC calendar days so clients can pass
    // either date-only or datetime strings and still get "whole-day" semantics.
    if ((dto as any).dateFrom || (dto as any).dateTo) {
      const rawFrom = (dto as any).dateFrom;
      const rawTo = (dto as any).dateTo;

      let fromDt: Date | undefined;
      let toDt: Date | undefined;

      if (rawFrom) {
        const parsed = new Date(rawFrom);
        // use UTC components of the parsed value and normalize to start of that day (00:00:00.000 UTC)
        fromDt = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
      }

      if (rawTo) {
        const parsed = new Date(rawTo);
        // normalize to end of that day (23:59:59.999 UTC)
        toDt = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999));
      }

      if (fromDt && toDt && fromDt.getTime() > toDt.getTime()) {
        const tmp = fromDt;
        fromDt = toDt;
        toDt = tmp;
      }

      whereClause.createdAt = {} as any;
      if (fromDt) whereClause.createdAt.gte = fromDt;
      if (toDt) whereClause.createdAt.lte = toDt;

      this.logger.log(`Applying createdAt filter for recruiter ${recruiterId}: rawFrom=${rawFrom || 'n/a'} rawTo=${rawTo || 'n/a'} normalizedFrom=${fromDt?.toISOString() || 'n/a'} normalizedTo=${toDt?.toISOString() || 'n/a'}`);
    }

    // Get total count (for the listing - respects search/status/search filters)
    const totalCount = await this.prisma.candidate.count({
      where: whereClause,
    });

    // Dashboard counts (overall assigned to recruiter, not limited by pagination or search)
    const totalAssignedCount = await this.prisma.candidate.count({
      where: assignmentOnlyWhere,
    });

    // Use status IDs (more reliable) to compute counts
    // Use case-insensitive lookup for status names to handle different casings in DB
    const untouchedStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.UNTOUCHED,
          mode: 'insensitive',
        },
      },
      select: { id: true, statusName: true },
    });

    const rnrStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.RNR,
          mode: 'insensitive',
        },
      },
      select: { id: true, statusName: true },
    });

    this.logger.log(
      `Resolved statuses => untouched: ${untouchedStatus?.statusName || 'NOT_FOUND'}(${untouchedStatus?.id || 'n/a'}), rnr: ${rnrStatus?.statusName || 'NOT_FOUND'}(${rnrStatus?.id || 'n/a'})`,
    );

    // Retrieve assigned candidates' currentStatusId and compute counts in-memory
    const assignedCandidates = await this.prisma.candidate.findMany({
      where: assignmentOnlyWhere,
      select: {
        id: true,
        currentStatusId: true,
      },
    });

    const onHoldStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.ON_HOLD,
          mode: 'insensitive',
        },
      },
      select: { id: true, statusName: true },
    });

    const interestedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.INTERESTED, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const notInterestedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.NOT_INTERESTED, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const otherEnquiryStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.OTHER_ENQUIRY, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const qualifiedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.QUALIFIED, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const futureStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.FUTURE, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    // 'deployed' status lookup
    const deployedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.DEPLOYED, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const untouchedId = untouchedStatus?.id ?? null;
    const rnrId = rnrStatus?.id ?? null;
    const onHoldId = onHoldStatus?.id ?? null;

    const interestedId = interestedStatus?.id ?? null;
    const qualifiedId = qualifiedStatus?.id ?? null;
    const futureId = futureStatus?.id ?? null;
    const deployedId = deployedStatus?.id ?? null;
    const notInterestedId = notInterestedStatus?.id ?? null;
    const otherEnquiryId = otherEnquiryStatus?.id ?? null;

    const countsMap = assignedCandidates.reduce(
      (acc, c) => {
        acc.totalAssigned += 1;
        if (c.currentStatusId === untouchedId) acc.untouched += 1;
        if (c.currentStatusId === rnrId) acc.rnr += 1;
        if (c.currentStatusId === onHoldId) acc.onHold += 1;
        if (c.currentStatusId === interestedId) acc.interested += 1;
        if (c.currentStatusId === notInterestedId) acc.notInterested += 1;
        if (c.currentStatusId === otherEnquiryId) acc.otherEnquiry += 1;
        if (c.currentStatusId === qualifiedId) acc.qualified += 1;
        if (c.currentStatusId === futureId) acc.future += 1;
        if (c.currentStatusId === deployedId) acc.working += 1;
        return acc;
      },
      {
        totalAssigned: 0,
        untouched: 0,
        rnr: 0,
        onHold: 0,
        interested: 0,
        notInterested: 0,
        otherEnquiry: 0,
        qualified: 0,
        future: 0,
        working: 0,
      },
    );

    this.logger.log(
      `Recruiter ${recruiterId} counts => totalAssigned: ${countsMap.totalAssigned}, untouched: ${countsMap.untouched}, rnr: ${countsMap.rnr}, onHold: ${countsMap.onHold}, notInterested: ${countsMap.notInterested}, otherEnquiry: ${countsMap.otherEnquiry}`,
    );

    // Get candidates
    const candidates = await this.prisma.candidate.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        currentStatus: {
          select: {
            id: true,
            statusName: true,
          },
        },
        recruiterAssignments: {
          where: {
            recruiterId,
            isActive: true,
          },
          include: {
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
          take: 1,
        },
        qualifications: {
          include: {
            qualification: true,
          },
        },
        workExperiences: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: candidates,
      counts: {
        totalAssigned: countsMap.totalAssigned,
        untouched: countsMap.untouched,
        rnr: countsMap.rnr,
        onHold: countsMap.onHold,
        interested: countsMap.interested,
        notInterested: countsMap.notInterested,
        otherEnquiry: countsMap.otherEnquiry,
        qualified: countsMap.qualified,
        future: countsMap.future,
        working: countsMap.working,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
