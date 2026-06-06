import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ClientSubClientLinkType,
  ClientType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto, CreateClientSubClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import {
  assertPhysicalAddressConsistent,
  mergePhysicalAddress,
} from '../common/address/assert-physical-address';
import {
  getProjectCoordinatorClientIds,
  isProjectCoordinator,
} from '../common/scoping/project-coordinator-scope.util';

const clientSingleDetailInclude = {
  addressCountry: true,
  addressState: true,
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: {
      projects: true,
      subClientLinks: true,
      parentClientLinks: true,
    },
  },
  subClientLinks: {
    include: {
      child: {
        include: {
          addressCountry: true,
          addressState: true,
        },
      },
    },
  },
  parentClientLinks: {
    include: {
      parent: {
        include: {
          addressCountry: true,
          addressState: true,
        },
      },
    },
  },
} satisfies Prisma.ClientInclude;

/** Full include for create/update/linkSubClient responses — returns all relations. */
const clientWithRelationsInclude = {
  addressCountry: true,
  addressState: true,
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
  subClientLinks: {
    include: {
      child: {
        include: {
          addressCountry: true,
          addressState: true,
        },
      },
    },
  },
  parentClientLinks: {
    include: {
      parent: {
        include: {
          addressCountry: true,
          addressState: true,
        },
      },
    },
  },
} satisfies Prisma.ClientInclude;

/** Lean include for list responses — no nested arrays, just counts. */
const clientListInclude = {
  addressCountry: true,
  addressState: true,
  _count: {
    select: {
      projects: true,
      subClientLinks: true,
      parentClientLinks: true,
    },
  },
} satisfies Prisma.ClientInclude;

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto, createdBy: string) {
    const { subClient, ...parentFields } = createClientDto;

    if (createClientDto.type === ClientType.DIRECT_CLIENT && subClient) {
      throw new BadRequestException(
        'subClient must not be provided when type is DIRECT_CLIENT',
      );
    }

    const allowsLinkedSub =
      createClientDto.type === ClientType.SUB_AGENT ||
      createClientDto.type === ClientType.FREELANCE;

    const createData: Record<string, unknown> = { ...parentFields, createdBy };

    if (createClientDto.specialties) {
      createData.specialties = createClientDto.specialties;
    }
    if (createClientDto.locations) {
      createData.locations = createClientDto.locations;
    }

    if (createClientDto.contractStartDate) {
      createData.contractStartDate = new Date(
        createClientDto.contractStartDate,
      );
    }
    if (createClientDto.contractEndDate) {
      createData.contractEndDate = new Date(createClientDto.contractEndDate);
    }

    await assertPhysicalAddressConsistent(this.prisma, {
      addressCountryCode: createClientDto.addressCountryCode ?? null,
      addressStateId: createClientDto.addressStateId ?? null,
    });

    if (subClient) {
      await assertPhysicalAddressConsistent(this.prisma, {
        addressCountryCode: subClient.addressCountryCode ?? null,
        addressStateId: subClient.addressStateId ?? null,
      });
    }

    const linkType: ClientSubClientLinkType | undefined =
      createClientDto.type === ClientType.SUB_AGENT
        ? ClientSubClientLinkType.SUB_AGENT
        : createClientDto.type === ClientType.FREELANCE
          ? ClientSubClientLinkType.FREELANCE
          : undefined;

    const shouldCreateLinkedSubClient =
      allowsLinkedSub &&
      Boolean(subClient?.name?.trim()) &&
      Boolean(linkType);

    const client = await this.prisma.$transaction(async (tx) => {
      const parent = await tx.client.create({
        data: createData as Prisma.ClientCreateInput,
        include: clientWithRelationsInclude,
      });

      if (shouldCreateLinkedSubClient && subClient && linkType) {
        const childPayload: Record<string, unknown> = {
          type: subClient.type ?? ClientType.DIRECT_CLIENT,
          name: subClient.name.trim(),
          email: subClient.email,
          phone: subClient.phone,
          address: subClient.address,
          addressCountryCode: subClient.addressCountryCode,
          addressStateId: subClient.addressStateId,
          createdBy,
        };

        const child = await tx.client.create({
          data: childPayload as Prisma.ClientCreateInput,
        });

        await tx.clientSubClient.create({
          data: {
            parentClientId: parent.id,
            childClientId: child.id,
            linkType,
          },
        });

        return tx.client.findUniqueOrThrow({
          where: { id: parent.id },
          include: clientWithRelationsInclude,
        });
      }

      return parent;
    });

    return {
      success: true,
      data: client,
      message: 'Client created successfully',
    };
  }

  async findAll(
    query?: QueryClientsDto,
    userId?: string,
    roles?: string[],
  ) {
    const { type, search, page = 1, limit = 10 } = query || {};

    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = {};
    let scopedClientIds: string[] | undefined;

    if (isProjectCoordinator(roles) && userId) {
      scopedClientIds = await getProjectCoordinatorClientIds(
        this.prisma,
        userId,
      );
      where.id = { in: scopedClientIds };
    }

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

    const totalsWhere: Prisma.ClientWhereInput = {};

    if (scopedClientIds) {
      totalsWhere.id = { in: scopedClientIds };
    }

    if (search) {
      totalsWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { pointOfContact: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawClients, total, countsByType] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: clientListInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
      this.prisma.client.groupBy({
        by: ['type'],
        where: totalsWhere,
        _count: {
          _all: true,
        },
      }),
    ]);

    const clients = rawClients.map(({ _count, ...rest }) => ({
      ...rest,
      projectCount: _count.projects,
      subClientCount: _count.subClientLinks,
      parentClientCount: _count.parentClientLinks,
    }));

    const totalsByType = countsByType.reduce(
      (acc, item) => {
        acc[item.type] = item._count._all;
        return acc;
      },
      {
        DIRECT_CLIENT: 0,
        SUB_AGENT: 0,
        FREELANCE: 0,
      } as Record<string, number>,
    );

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
        totals: {
          totalClients: total,
          directClients: totalsByType.DIRECT_CLIENT,
          subAgencyClients: totalsByType.SUB_AGENT,
          freelanceClients: totalsByType.FREELANCE,
        },
      },
      message: 'Clients retrieved successfully',
    };
  }

  async findOne(id: string, userId?: string, roles?: string[]) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: clientSingleDetailInclude,
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (isProjectCoordinator(roles) && userId) {
      const allowedClientIds = await getProjectCoordinatorClientIds(
        this.prisma,
        userId,
      );
      if (!allowedClientIds.includes(id)) {
        throw new ForbiddenException('You do not have access to this client');
      }
    }

    const activeProjectCount = await this.prisma.project.count({
      where: {
        clientId: id,
        status: { equals: 'active', mode: 'insensitive' },
      },
    });

    const { _count, ...rest } = client;

    return {
      success: true,
      data: {
        ...rest,
        projectCount: _count.projects,
        subClientCount: _count.subClientLinks,
        parentClientCount: _count.parentClientLinks,
        activeProjectCount,
      },
      message: 'Client retrieved successfully',
    };
  }

  /**
   * Create a linked end-client for an existing Sub Agent / Freelance parent.
   */
  async linkSubClient(
    parentClientId: string,
    dto: CreateClientSubClientDto,
    createdBy: string,
  ) {
    const parent = await this.prisma.client.findUnique({
      where: { id: parentClientId },
    });

    if (!parent) {
      throw new NotFoundException('Client not found');
    }

    if (
      parent.type !== ClientType.SUB_AGENT &&
      parent.type !== ClientType.FREELANCE
    ) {
      throw new BadRequestException(
        'Linked end clients can only be added when the client type is Sub Agent or Freelance',
      );
    }

    const nameTrimmed = dto.name?.trim();
    if (!nameTrimmed) {
      throw new BadRequestException('Linked client name is required');
    }

    await assertPhysicalAddressConsistent(this.prisma, {
      addressCountryCode: dto.addressCountryCode ?? null,
      addressStateId: dto.addressStateId ?? null,
    });

    const linkType: ClientSubClientLinkType =
      parent.type === ClientType.SUB_AGENT
        ? ClientSubClientLinkType.SUB_AGENT
        : ClientSubClientLinkType.FREELANCE;

    try {
      const client = await this.prisma.$transaction(async (tx) => {
        const childPayload: Record<string, unknown> = {
          type: dto.type ?? ClientType.DIRECT_CLIENT,
          name: nameTrimmed,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          addressCountryCode: dto.addressCountryCode,
          addressStateId: dto.addressStateId,
          createdBy,
        };

        const child = await tx.client.create({
          data: childPayload as Prisma.ClientCreateInput,
        });

        await tx.clientSubClient.create({
          data: {
            parentClientId: parent.id,
            childClientId: child.id,
            linkType,
          },
        });

        return tx.client.findUniqueOrThrow({
          where: { id: parent.id },
          include: clientWithRelationsInclude,
        });
      });

      return {
        success: true,
        data: client,
        message: 'Linked end client created successfully',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'This end client link already exists or child client is already linked.',
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
    updatedBy: string,
  ) {
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException('Client not found');
    }

    await assertPhysicalAddressConsistent(
      this.prisma,
      mergePhysicalAddress(existingClient, {
        addressCountryCode: updateClientDto.addressCountryCode,
        addressStateId: updateClientDto.addressStateId,
      }),
    );

    const updateData: Record<string, unknown> = { ...updateClientDto };

    if ('subClient' in updateData) {
      delete updateData.subClient;
    }

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
      data: updateData as Prisma.ClientUpdateInput,
      include: clientWithRelationsInclude,
    });

    return {
      success: true,
      data: client,
      message: 'Client updated successfully',
    };
  }

  async remove(id: string, removedBy: string) {
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });

    if (!existingClient) {
      throw new NotFoundException('Client not found');
    }

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

  async getClientStats(userId?: string, roles?: string[]) {
    const where: Prisma.ClientWhereInput = {};

    if (isProjectCoordinator(roles) && userId) {
      const clientIds = await getProjectCoordinatorClientIds(
        this.prisma,
        userId,
      );
      where.id = { in: clientIds };
    }

    const projectWhere: Prisma.ProjectWhereInput = { status: 'active' };
    if (isProjectCoordinator(roles) && userId) {
      projectWhere.createdBy = userId;
    }

    const stats = await this.prisma.client.groupBy({
      by: ['type'],
      where,
      _count: {
        id: true,
      },
    });

    const totalClients = await this.prisma.client.count({ where });
    const activeProjects = await this.prisma.project.count({
      where: projectWhere,
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
}
