import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateWorkExperienceDto } from './dto/create-work-experience.dto';
import { UpdateWorkExperienceDto } from './dto/update-work-experience.dto';

@Injectable()
export class WorkExperienceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createWorkExperienceDto: CreateWorkExperienceDto) {
    // Validate candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: createWorkExperienceDto.candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(
        `Candidate with ID ${createWorkExperienceDto.candidateId} not found`,
      );
    }

    // Validate date logic
    if (createWorkExperienceDto.endDate && createWorkExperienceDto.isCurrent) {
      throw new BadRequestException(
        'Cannot have both end date and current position',
      );
    }

    if (
      createWorkExperienceDto.endDate &&
      new Date(createWorkExperienceDto.endDate) <=
        new Date(createWorkExperienceDto.startDate)
    ) {
      throw new BadRequestException('End date must be after start date');
    }

    // If this is marked as current, unmark all other current positions for this candidate
    if (createWorkExperienceDto.isCurrent) {
      await this.prisma.workExperience.updateMany({
        where: {
          candidateId: createWorkExperienceDto.candidateId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });
    }

    // Validate role catalog exists
    const roleCatalog = await this.prisma.roleCatalog.findUnique({
      where: { id: createWorkExperienceDto.roleCatalogId },
    });

    if (!roleCatalog) {
      throw new NotFoundException(
        `RoleCatalog with ID ${createWorkExperienceDto.roleCatalogId} not found`,
      );
    }
    return this.prisma.workExperience.create({
      data: {
        candidateId: createWorkExperienceDto.candidateId,
        roleCatalogId: createWorkExperienceDto.roleCatalogId,
        companyName: createWorkExperienceDto.companyName,
        jobTitle: createWorkExperienceDto.jobTitle,
        startDate: new Date(createWorkExperienceDto.startDate),
        endDate: createWorkExperienceDto.endDate
          ? new Date(createWorkExperienceDto.endDate)
          : null,
        isCurrent: createWorkExperienceDto.isCurrent || false,
        description: createWorkExperienceDto.description,
        salary: createWorkExperienceDto.salary,
        location: createWorkExperienceDto.location,
        skills: createWorkExperienceDto.skills
          ? JSON.parse(createWorkExperienceDto.skills)
          : [],
        achievements: createWorkExperienceDto.achievements,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        roleCatalog: {
          select: {
            id: true,
            name: true,
            label: true,
            shortName: true,
          },
        },
      },
    });
  }

  async findAll(candidateId?: string) {
    const where = candidateId ? { candidateId } : {};

    return this.prisma.workExperience.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        roleCatalog: {
          select: {
            id: true,
            name: true,
            label: true,
            shortName: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const workExperience = await this.prisma.workExperience.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        roleCatalog: {
          select: {
            id: true,
            name: true,
            label: true,
            shortName: true,
          },
        },
      },
    });

    if (!workExperience) {
      throw new NotFoundException(`Work experience with ID ${id} not found`);
    }

    return workExperience;
  }

  async update(id: string, updateWorkExperienceDto: UpdateWorkExperienceDto) {
    // Check if work experience exists
    const existingWorkExperience = await this.prisma.workExperience.findUnique({
      where: { id },
    });

    if (!existingWorkExperience) {
      throw new NotFoundException(`Work experience with ID ${id} not found`);
    }

    // Validate date logic
    if (updateWorkExperienceDto.endDate && updateWorkExperienceDto.isCurrent) {
      throw new BadRequestException(
        'Cannot have both end date and current position',
      );
    }

    if (
      updateWorkExperienceDto.endDate &&
      updateWorkExperienceDto.startDate &&
      new Date(updateWorkExperienceDto.endDate) <=
        new Date(updateWorkExperienceDto.startDate)
    ) {
      throw new BadRequestException('End date must be after start date');
    }

    // If this is marked as current, unmark all other current positions for this candidate
    if (updateWorkExperienceDto.isCurrent) {
      await this.prisma.workExperience.updateMany({
        where: {
          candidateId: existingWorkExperience.candidateId,
          isCurrent: true,
          id: { not: id }, // Exclude current record
        },
        data: {
          isCurrent: false,
        },
      });
    }

    // If roleCatalogId is provided, validate it exists
    if (updateWorkExperienceDto.roleCatalogId) {
      const roleCatalog = await this.prisma.roleCatalog.findUnique({
        where: { id: updateWorkExperienceDto.roleCatalogId },
      });

      if (!roleCatalog) {
        throw new NotFoundException(
          `RoleCatalog with ID ${updateWorkExperienceDto.roleCatalogId} not found`,
        );
      }
    }

    return this.prisma.workExperience.update({
      where: { id },
      data: {
        roleCatalogId: updateWorkExperienceDto.roleCatalogId,
        companyName: updateWorkExperienceDto.companyName,
        jobTitle: updateWorkExperienceDto.jobTitle,
        startDate: updateWorkExperienceDto.startDate
          ? new Date(updateWorkExperienceDto.startDate)
          : undefined,
        endDate: updateWorkExperienceDto.endDate
          ? new Date(updateWorkExperienceDto.endDate)
          : undefined,
        isCurrent: updateWorkExperienceDto.isCurrent,
        description: updateWorkExperienceDto.description,
        salary: updateWorkExperienceDto.salary,
        location: updateWorkExperienceDto.location,
        skills: updateWorkExperienceDto.skills
          ? JSON.parse(updateWorkExperienceDto.skills)
          : undefined,
        achievements: updateWorkExperienceDto.achievements,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        roleCatalog: {
          select: {
            id: true,
            name: true,
            label: true,
            shortName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const workExperience = await this.prisma.workExperience.findUnique({
      where: { id },
    });

    if (!workExperience) {
      throw new NotFoundException(`Work experience with ID ${id} not found`);
    }

    return this.prisma.workExperience.delete({
      where: { id },
    });
  }

  async findByCandidateId(candidateId: string) {
    return this.prisma.workExperience.findMany({
      where: { candidateId },
      orderBy: {
        startDate: 'desc',
      },
      include: {
        roleCatalog: {
          select: {
            id: true,
            name: true,
            label: true,
            shortName: true,
          },
        },
      },
    });
  }
}
