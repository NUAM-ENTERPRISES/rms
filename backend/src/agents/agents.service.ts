import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { QueryAgentsDto } from './dto/query-agents.dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAgentDto: CreateAgentDto) {
    const agent = await this.prisma.agent.create({
      data: createAgentDto,
    });
    return {
      success: true,
      message: 'Agent created successfully',
      data: agent,
    };
  }

  async findAll(query: QueryAgentsDto) {
    const { search, isActive, agentType, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (agentType) {
      where.agentType = agentType;
    }

    const [total, agents] = await Promise.all([
      this.prisma.agent.count({ where }),
      this.prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { candidates: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      message: 'Agents retrieved successfully',
      data: agents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Agent retrieved successfully',
      data: agent,
    };
  }

  async update(id: string, updateAgentDto: UpdateAgentDto) {
    try {
      const agent = await this.prisma.agent.update({
        where: { id },
        data: updateAgentDto,
      });
      return {
        success: true,
        message: 'Agent updated successfully',
        data: agent,
      };
    } catch (error) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.agent.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Agent deleted successfully',
      };
    } catch (error) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
  }
}
