import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CandidateStatusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all candidate statuses
   */
  async findAll() {
    const statuses = await this.prisma.candidateStatus.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    return {
      success: true,
      data: statuses,
      message: 'Candidate statuses retrieved successfully',
    };
  }

  /**
   * Get a single candidate status by ID
   */
  async findOne(id: number) {
    const status = await this.prisma.candidateStatus.findUnique({
      where: { id },
    });

    if (!status) {
      throw new NotFoundException(`Candidate status with ID ${id} not found`);
    }

    return {
      success: true,
      data: status,
      message: 'Candidate status retrieved successfully',
    };
  }

  /**
   * Get a single candidate status by status name
   */
  async findByName(statusName: string) {
    const status = await this.prisma.candidateStatus.findUnique({
      where: { statusName },
    });

    if (!status) {
      throw new NotFoundException(
        `Candidate status '${statusName}' not found`,
      );
    }

    return {
      success: true,
      data: status,
      message: 'Candidate status retrieved successfully',
    };
  }

  /**
   * Get count of candidates per status
   */
  async getStatusCounts() {
    const statuses = await this.prisma.candidateStatus.findMany({
      include: {
        _count: {
          select: {
            candidates: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    const statusCounts = statuses.map((status) => ({
      id: status.id,
      statusName: status.statusName,
      candidateCount: status._count.candidates,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    }));

    return {
      success: true,
      data: statusCounts,
      message: 'Candidate status counts retrieved successfully',
    };
  }
}
