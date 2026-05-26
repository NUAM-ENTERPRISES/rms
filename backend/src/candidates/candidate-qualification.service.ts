import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCandidateQualificationDto } from './dto/create-candidate-qualification.dto';
import { UpdateCandidateQualificationDto } from './dto/update-candidate-qualification.dto';
import {
  assertOptionalCountryCode,
  normalizeOptionalCountryCode,
} from '../common/country/assert-optional-country-code';
import { candidateQualificationReadInclude } from './includes/candidate-qualification.include';

@Injectable()
export class CandidateQualificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createCandidateQualificationDto: CreateCandidateQualificationDto,
  ) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: createCandidateQualificationDto.candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(
        `Candidate with ID ${createCandidateQualificationDto.candidateId} not found`,
      );
    }

    const qualification = await this.prisma.qualification.findUnique({
      where: { id: createCandidateQualificationDto.qualificationId },
    });
    if (!qualification) {
      throw new NotFoundException(
        `Qualification with ID ${createCandidateQualificationDto.qualificationId} not found`,
      );
    }

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

    await assertOptionalCountryCode(
      this.prisma,
      createCandidateQualificationDto.countryCode,
    );

    const countryCode = normalizeOptionalCountryCode(
      createCandidateQualificationDto.countryCode,
    );

    return this.prisma.candidateQualification.create({
      data: {
        candidateId: createCandidateQualificationDto.candidateId,
        qualificationId: createCandidateQualificationDto.qualificationId,
        university: createCandidateQualificationDto.university,
        graduationYear: createCandidateQualificationDto.graduationYear,
        gpa: createCandidateQualificationDto.gpa,
        isCompleted: createCandidateQualificationDto.isCompleted ?? true,
        notes: createCandidateQualificationDto.notes,
        countryCode: countryCode ?? null,
      },
      include: candidateQualificationReadInclude,
    });
  }

  async findAll(candidateId?: string) {
    const where = candidateId ? { candidateId } : {};
    return this.prisma.candidateQualification.findMany({
      where,
      include: candidateQualificationReadInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const qualification = await this.prisma.candidateQualification.findUnique({
      where: { id },
      include: candidateQualificationReadInclude,
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
    const existingQualification =
      await this.prisma.candidateQualification.findUnique({
        where: { id },
      });
    if (!existingQualification) {
      throw new NotFoundException(
        `Candidate qualification with ID ${id} not found`,
      );
    }

    if (updateCandidateQualificationDto.qualificationId) {
      const qualification = await this.prisma.qualification.findUnique({
        where: { id: updateCandidateQualificationDto.qualificationId },
      });
      if (!qualification) {
        throw new NotFoundException(
          `Qualification with ID ${updateCandidateQualificationDto.qualificationId} not found`,
        );
      }

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

    if ('countryCode' in updateCandidateQualificationDto) {
      await assertOptionalCountryCode(
        this.prisma,
        updateCandidateQualificationDto.countryCode,
      );
    }

    const updateData: {
      qualificationId?: string;
      university?: string | null;
      graduationYear?: number | null;
      gpa?: number | null;
      isCompleted?: boolean;
      notes?: string | null;
      countryCode?: string | null;
    } = {};

    if (updateCandidateQualificationDto.qualificationId !== undefined) {
      updateData.qualificationId =
        updateCandidateQualificationDto.qualificationId;
    }
    if (updateCandidateQualificationDto.university !== undefined) {
      updateData.university = updateCandidateQualificationDto.university;
    }
    if ('graduationYear' in updateCandidateQualificationDto) {
      updateData.graduationYear =
        updateCandidateQualificationDto.graduationYear ?? null;
    }
    if ('gpa' in updateCandidateQualificationDto) {
      updateData.gpa = updateCandidateQualificationDto.gpa ?? null;
    }
    if (updateCandidateQualificationDto.isCompleted !== undefined) {
      updateData.isCompleted = updateCandidateQualificationDto.isCompleted;
    }
    if (updateCandidateQualificationDto.notes !== undefined) {
      updateData.notes = updateCandidateQualificationDto.notes;
    }
    if ('countryCode' in updateCandidateQualificationDto) {
      updateData.countryCode = normalizeOptionalCountryCode(
        updateCandidateQualificationDto.countryCode,
      ) as string | null;
    }

    return this.prisma.candidateQualification.update({
      where: { id },
      data: updateData,
      include: candidateQualificationReadInclude,
    });
  }

  async remove(id: string) {
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
        country: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
