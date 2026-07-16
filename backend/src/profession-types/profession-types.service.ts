import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProfessionTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(sector?: 'HEALTHCARE' | 'NON_HEALTH_CARE') {
    const professionTypes = await this.prisma.professionType.findMany({
      where: {
        isActive: true,
        ...(sector ? { sector } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        id: true,
        name: true,
        label: true,
        description: true,
        sector: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return { professionTypes };
  }
}
