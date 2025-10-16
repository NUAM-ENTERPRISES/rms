import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCandidateQualificationDto } from './dto/create-candidate-qualification.dto';
import { UpdateCandidateQualificationDto } from './dto/update-candidate-qualification.dto';

@Injectable()
export class CandidateQualificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createCandidateQualificationDto: CreateCandidateQualificationDto,
  ) {
    // Validate candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: createCandidateQualificationDto.candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(
        `Candidate with ID ${createCandidateQualificationDto.candidateId} not found`,
      );
    }

    // Validate qualification exists
    const qualification = await this.prisma.qualification.findUnique({
      where: { id: createCandidateQualificationDto.qualificationId },
    });
    if (!qualification) {
      throw new NotFoundException(
        `Qualification with ID ${createCandidateQualificationDto.qualificationId} not found`,
      );
    }

    // Check if candidate already has this qualification
    const existingQualification =
      await this.prisma.candidateQualification.findFirst({
        where: {
          candidateId: createCandidateQualificationDto.candidateId,
          qualificationId: createCandidateQualificationDto.qualificationId,
        },
      });
    if (existingQualification) {
      throw new BadRequestException('Candidate already has this qualification');
    }

    return this.prisma.candidateQualification.create({
      data: {
        candidateId: createCandidateQualificationDto.candidateId,
        qualificationId: createCandidateQualificationDto.qualificationId,
        university: createCandidateQualificationDto.university,
        graduationYear: createCandidateQualificationDto.graduationYear,
        gpa: createCandidateQualificationDto.gpa,
        isCompleted: createCandidateQualificationDto.isCompleted ?? true,
        notes: createCandidateQualificationDto.notes,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        qualification: {
          select: {
            id: true,
            name: true,
            shortName: true,
            level: true,
            field: true,
          },
        },
      },
    });
  }

  async findAll(candidateId?: string) {
    const where = candidateId ? { candidateId } : {};
    return this.prisma.candidateQualification.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        qualification: {
          select: {
            id: true,
            name: true,
            shortName: true,
            level: true,
            field: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const qualification = await this.prisma.candidateQualification.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        qualification: {
          select: {
            id: true,
            name: true,
            shortName: true,
            level: true,
            field: true,
          },
        },
      },
    });

    if (!qualification) {
      throw new NotFoundException(
        `Candidate qualification with ID ${id} not found`,
      );
    }

    return qualification;
  }

  async update(
    id: string,
    updateCandidateQualificationDto: UpdateCandidateQualificationDto,
  ) {
    // Check if qualification exists
    const existingQualification =
      await this.prisma.candidateQualification.findUnique({
        where: { id },
      });
    if (!existingQualification) {
      throw new NotFoundException(
        `Candidate qualification with ID ${id} not found`,
      );
    }

    // If qualificationId is being updated, validate it exists
    if (updateCandidateQualificationDto.qualificationId) {
      const qualification = await this.prisma.qualification.findUnique({
        where: { id: updateCandidateQualificationDto.qualificationId },
      });
      if (!qualification) {
        throw new NotFoundException(
          `Qualification with ID ${updateCandidateQualificationDto.qualificationId} not found`,
        );
      }

      // Check if candidate already has this qualification (excluding current one)
      const duplicateQualification =
        await this.prisma.candidateQualification.findFirst({
          where: {
            candidateId: existingQualification.candidateId,
            qualificationId: updateCandidateQualificationDto.qualificationId,
            id: { not: id },
          },
        });
      if (duplicateQualification) {
        throw new BadRequestException(
          'Candidate already has this qualification',
        );
      }
    }

    return this.prisma.candidateQualification.update({
      where: { id },
      data: {
        qualificationId: updateCandidateQualificationDto.qualificationId,
        university: updateCandidateQualificationDto.university,
        graduationYear: updateCandidateQualificationDto.graduationYear,
        gpa: updateCandidateQualificationDto.gpa,
        isCompleted: updateCandidateQualificationDto.isCompleted,
        notes: updateCandidateQualificationDto.notes,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        qualification: {
          select: {
            id: true,
            name: true,
            shortName: true,
            level: true,
            field: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    // Check if qualification exists
    const qualification = await this.prisma.candidateQualification.findUnique({
      where: { id },
    });
    if (!qualification) {
      throw new NotFoundException(
        `Candidate qualification with ID ${id} not found`,
      );
    }

    await this.prisma.candidateQualification.delete({
      where: { id },
    });

    return { id, message: 'Candidate qualification deleted successfully' };
  }

  async findByCandidateId(candidateId: string) {
    return this.prisma.candidateQualification.findMany({
      where: { candidateId },
      include: {
        qualification: {
          select: {
            id: true,
            name: true,
            shortName: true,
            level: true,
            field: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
