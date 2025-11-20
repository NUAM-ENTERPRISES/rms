import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { QueryCandidateProjectStatusDto } from './dto/query-candidate-project-status.dto';

@Injectable()
export class CandidateProjectStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCandidateProjectStatusDto) {
    const { search, page = 1, limit = 10, stage, isTerminal } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.CandidateProjectStatusWhereInput = {};

    if (stage) {
      where.stage = { equals: stage, mode: 'insensitive' };
    }

    if (isTerminal !== undefined) {
      where.isTerminal = isTerminal === 'true';
    }

    if (search) {
      where.OR = [
        { statusName: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [statuses, total] = await Promise.all([
      this.prisma.candidateProjectStatus.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ stage: 'asc' }, { statusName: 'asc' }],
      }),
      this.prisma.candidateProjectStatus.count({ where }),
    ]);

    return {
      success: true,
      data: {
        statuses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      message: 'Candidate project statuses retrieved successfully',
    };
  }

  async findOne(id: number) {
    const status = await this.prisma.candidateProjectStatus.findUnique({
      where: { id },
    });

    if (!status) {
      throw new NotFoundException('Candidate project status not found');
    }

    return {
      success: true,
      data: status,
      message: 'Candidate project status retrieved successfully',
    };
  }

  async findByStatusName(statusName: string) {
    const status = await this.prisma.candidateProjectStatus.findUnique({
      where: { statusName },
    });

    if (!status) {
      throw new NotFoundException('Candidate project status not found');
    }

    return {
      success: true,
      data: status,
      message: 'Candidate project status retrieved successfully',
    };
  }

  async getStatusesByStage() {
    const statuses = await this.prisma.candidateProjectStatus.findMany({
      orderBy: [{ stage: 'asc' }, { statusName: 'asc' }],
    });

    const grouped = statuses.reduce((acc, status) => {
      if (!acc[status.stage]) {
        acc[status.stage] = [];
      }
      acc[status.stage].push(status);
      return acc;
    }, {} as Record<string, typeof statuses>);

    return {
      success: true,
      data: grouped,
      message: 'Candidate project statuses grouped by stage',
    };
  }

  async getTerminalStatuses() {
    const statuses = await this.prisma.candidateProjectStatus.findMany({
      where: { isTerminal: true },
      orderBy: { statusName: 'asc' },
    });

    return {
      success: true,
      data: statuses,
      message: 'Terminal statuses retrieved successfully',
    };
  }
}
