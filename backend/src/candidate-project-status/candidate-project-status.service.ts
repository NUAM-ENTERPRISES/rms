import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QueryCandidateProjectStatusDto } from './dto/query-candidate-project-status.dto';

@Injectable()
export class CandidateProjectStatusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List sub-statuses (detailed statuses) with parent main stage included.
   * Supports search and stage (main status name) filtering.
   */
  async findAll(query: QueryCandidateProjectStatusDto) {
    const { search, page = 1, limit = 25, stage, isTerminal } = query;
    const skip = (page - 1) * limit;

    // Base where for sub-statuses
    const where: any = {};

    if (stage) {
      // stage is the mainStatus.name; we need subStatuses where their stage's name equals `stage`
      where.stage = {
        is: {
          name: { equals: stage, mode: 'insensitive' },
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // isTerminal handling:
    // If your DB has an explicit boolean on sub-statuses (e.g., isTerminal),
    // the line below will work automatically once field exists.
    if (typeof isTerminal !== 'undefined') {
      if (isTerminal === 'true' || isTerminal === 'false') {
        where.isTerminal = isTerminal === 'true';
      } else {
        // If user passed something else, ignore — but keep for safety
      }
    }

    // If DB doesn't have isTerminal field, apply a heuristic only when isTerminal === 'true'
    const useHeuristic = typeof (await this._subStatusHasIsTerminalField()) === 'boolean' ? false : true;

    const [subStatuses, total] = await Promise.all([
      this.prisma.candidateProjectSubStatus.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { label: 'asc' }],
        include: {
          stage: {
            select: {
              id: true,
              name: true,
              label: true,
              color: true,
            },
          },
        },
      }),
      this.prisma.candidateProjectSubStatus.count({ where }),
    ]);

    // If user asked isTerminal=true and DB has no field, apply heuristic filter
    let finalList = subStatuses;
    if (isTerminal === 'true' && useHeuristic) {
      finalList = subStatuses.filter((s) =>
        /^(rejected_|rejected|hired|withdrawn)$/i.test(s.name) ||
        s.name.toLowerCase().includes('rejected') ||
        s.name.toLowerCase() === 'hired' ||
        s.name.toLowerCase() === 'withdrawn',
      );
    }

    return {
      success: true,
      data: {
        statuses: finalList,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      message: 'Candidate project sub-statuses retrieved successfully',
    };
  }

  /**
   * Return main statuses grouped with their sub-statuses
   */
  async getStatusesByStage() {
    const mains = await this.prisma.candidateProjectMainStatus.findMany({
      orderBy: { order: 'asc' },
      include: {
        subStatuses: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Convert to grouped map or return array (keeping structure backwards-compatible)
    const grouped = mains.map((m) => ({
      id: m.id,
      name: m.name,
      label: m.label,
      color: m.color,
      order: m.order,
      subStatuses: m.subStatuses,
    }));

    return {
      success: true,
      data: grouped,
      message: 'Statuses grouped by stage retrieved successfully',
    };
  }

  /**
   * Terminal statuses — prefer explicit DB field if present; otherwise use heuristic
   */
  async getTerminalStatuses() {
    // If sub-statuses table has an isTerminal boolean, use it:
    const hasField = await this._subStatusHasIsTerminalField();
    if (hasField) {
      const terminals = await this.prisma.candidateProjectSubStatus.findMany({
        // cast to any because the DB might not have isTerminal in Prisma schema
        where: ({ isTerminal: true } as any),
        orderBy: { order: 'asc' },
      });
      return { success: true, data: terminals, message: 'Terminal sub-statuses retrieved' };
    }

    // Heuristic fallback
    const allSubs = await this.prisma.candidateProjectSubStatus.findMany({
      orderBy: { order: 'asc' },
    });

    const terminals = allSubs.filter((s) =>
      /^(rejected_|rejected|hired|withdrawn)$/i.test(s.name) ||
      s.name.toLowerCase().includes('rejected') ||
      s.name.toLowerCase() === 'hired' ||
      s.name.toLowerCase() === 'withdrawn',
    );

    return { success: true, data: terminals, message: 'Terminal sub-statuses (heuristic) retrieved' };
  }

  /**
   * Find by ID: try main-status first, then sub-status
   */
  async findOne(id: string) {
    // Try main status
    const main = await this.prisma.candidateProjectMainStatus.findUnique({
      where: { id },
      include: { subStatuses: { orderBy: { order: 'asc' } } },
    });
    if (main) {
      return { success: true, data: main, message: 'Main status retrieved' };
    }

    // Try sub status
    const sub = await this.prisma.candidateProjectSubStatus.findUnique({
      where: { id },
      include: { stage: true },
    });
    if (sub) {
      return { success: true, data: sub, message: 'Sub status retrieved' };
    }

    throw new NotFoundException('Status not found');
  }

  /**
   * Find by status name: try sub-status first, then main-status
   */
  async findByStatusName(statusName: string) {
    const sub = await this.prisma.candidateProjectSubStatus.findFirst({
      where: { name: { equals: statusName, mode: 'insensitive' } },
      include: { stage: true },
    });
    if (sub) {
      return { success: true, data: sub, message: 'Sub-status retrieved' };
    }

    const main = await this.prisma.candidateProjectMainStatus.findFirst({
      where: { name: { equals: statusName, mode: 'insensitive' } },
      include: { subStatuses: { orderBy: { order: 'asc' } } },
    });
    if (main) {
      return { success: true, data: main, message: 'Main-status retrieved' };
    }

    throw new NotFoundException('Status not found');
  }

  /**
   * helper: detect if candidateProjectSubStatuses includes a boolean field isTerminal
   * We do an introspection-like check: try a lightweight raw query to inspect column — Prisma doesn't expose schema at runtime,
   * so we attempt a safe findFirst with select of isTerminal. If it fails, we assume false.
   *
   * NOTE: This method silently returns `false` if the field doesn't exist. If you add the field to the model + migration,
   * remove this helper and use `where: { isTerminal: true }` directly (which already exists).
   */
  private async _subStatusHasIsTerminalField(): Promise<boolean> {
    try {
      // If the field exists in Prisma model, this query will succeed.
      await this.prisma.candidateProjectSubStatus.findFirst({
        select: { id: true, isTerminal: true } as any,
        take: 1,
      });
      return true;
    } catch (e) {
      // field likely doesn't exist
      return false;
    }
  }
}
