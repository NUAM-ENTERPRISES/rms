import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto, createdBy: string) {
    // Validate type-specific required fields
    this.validateClientData(createClientDto);

    const createData: any = { ...createClientDto };

    // Handle JSON fields
    if (createClientDto.specialties) {
      createData.specialties = createClientDto.specialties;
    }
    if (createClientDto.locations) {
      createData.locations = createClientDto.locations;
    }

    // Handle date fields
    if (createClientDto.contractStartDate) {
      createData.contractStartDate = new Date(
        createClientDto.contractStartDate,
      );
    }
    if (createClientDto.contractEndDate) {
      createData.contractEndDate = new Date(createClientDto.contractEndDate);
    }

    const client = await this.prisma.client.create({
      data: createData,
      include: {
        projects: {
          include: {
            rolesNeeded: true,
            candidateProjects: {
              include: {
                candidate: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: client,
      message: 'Client created successfully',
    };
  }

  async findAll(query?: QueryClientsDto) {
    const { type, search, page = 1, limit = 10 } = query || {};

    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { pointOfContact: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          projects: {
            include: {
              rolesNeeded: true,
              candidateProjects: {
                include: {
                  candidate: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      success: true,
      data: {
        clients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Clients retrieved successfully',
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            rolesNeeded: true,
            candidateProjects: {
              include: {
                candidate: true,
              },
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return {
      success: true,
      data: client,
      message: 'Client retrieved successfully',
    };
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
    updatedBy: string,
  ) {
    // Check if client exists
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException('Client not found');
    }

    // Validate type-specific required fields if type is being updated
    if (updateClientDto.type) {
      this.validateClientData(updateClientDto);
    }

    const updateData: any = { ...updateClientDto };

    // Handle date fields
    if (updateClientDto.contractStartDate) {
      updateData.contractStartDate = new Date(
        updateClientDto.contractStartDate,
      );
    }
    if (updateClientDto.contractEndDate) {
      updateData.contractEndDate = new Date(updateClientDto.contractEndDate);
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        projects: {
          include: {
            rolesNeeded: true,
            candidateProjects: {
              include: {
                candidate: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: client,
      message: 'Client updated successfully',
    };
  }

  async remove(id: string, removedBy: string) {
    // Check if client exists
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });

    if (!existingClient) {
      throw new NotFoundException('Client not found');
    }

    // Check if client has active projects
    const activeProjects = existingClient.projects.filter(
      (project) => project.status === 'active',
    );

    if (activeProjects.length > 0) {
      throw new BadRequestException(
        `Cannot delete client with ${activeProjects.length} active projects`,
      );
    }

    await this.prisma.client.delete({
      where: { id },
    });

    return {
      success: true,
      data: { id },
      message: 'Client deleted successfully',
    };
  }

  async getClientStats() {
    const stats = await this.prisma.client.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    const totalClients = await this.prisma.client.count();
    const activeProjects = await this.prisma.project.count({
      where: { status: 'active' },
    });

    return {
      success: true,
      data: {
        totalClients,
        activeProjects,
        byType: stats.reduce(
          (acc, stat) => {
            acc[stat.type] = stat._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      message: 'Client statistics retrieved successfully',
    };
  }

  private validateClientData(clientData: CreateClientDto | UpdateClientDto) {
    const { type, ...rest } = clientData;

    switch (type) {
      case 'INDIVIDUAL':
        if (!rest.profession || !rest.organization) {
          throw new BadRequestException(
            'Individual referrers must have profession and organization',
          );
        }
        break;

      case 'SUB_AGENCY':
        if (!rest.agencyType) {
          throw new BadRequestException(
            'Sub-agencies must have an agency type',
          );
        }
        break;

      case 'HEALTHCARE_ORGANIZATION':
        if (!rest.facilityType || !rest.facilitySize) {
          throw new BadRequestException(
            'Healthcare organizations must have facility type and size',
          );
        }
        break;

      case 'EXTERNAL_SOURCE':
        if (!rest.sourceType || !rest.sourceName) {
          throw new BadRequestException(
            'External sources must have source type and name',
          );
        }
        break;
    }
  }
}
