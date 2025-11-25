import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboxService } from '../notifications/outbox.service';
import { PrismaService } from '../database/prisma.service';
import { CreateCandidateProjectDto } from './dto/create-candidate-project.dto';
import { UpdateCandidateProjectDto } from './dto/update-candidate-project.dto';
import { QueryCandidateProjectsDto } from './dto/query-candidate-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { CANDIDATE_PROJECT_STATUS } from '../common/constants/statuses';

@Injectable()
export class CandidateProjectsService {
  private readonly logger = new Logger(CandidateProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Assign candidate to project with nominated status
   * Creates a new candidate-project assignment with status ID 1 (nominated)
   * and creates an initial status history entry
   * Automatically matches candidate qualifications with project roles if roleNeededId not provided
   *
   */
  async assignCandidateToProject(
    createDto: CreateCandidateProjectDto,
    userId: string,
  ) {
    let { candidateId, projectId, roleNeededId, recruiterId } = createDto;

    // -------------------------------
    // VERIFY candidate exists
    // -------------------------------
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // -------------------------------
    // VERIFY project exists
    // -------------------------------
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
      },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // -------------------------------
    // AUTO-MATCH ROLE
    // -------------------------------
    if (!roleNeededId && project.rolesNeeded.length > 0) {
      const matchedRoleId = await this.autoMatchCandidateToRole(
        candidate,
        project.rolesNeeded,
      );
      if (matchedRoleId) {
        roleNeededId = matchedRoleId;
      }
    }

    // -------------------------------
    // VERIFY role if provided
    // -------------------------------
    if (roleNeededId) {
      const roleNeeded = await this.prisma.roleNeeded.findUnique({
        where: { id: roleNeededId },
      });
      if (!roleNeeded) {
        throw new NotFoundException(`Role with ID ${roleNeededId} not found`);
      }
      if (roleNeeded.projectId !== projectId) {
        throw new BadRequestException(`Role does not belong to this project`);
      }
    }

    // -------------------------------
    // RECRUITER VALIDATION
    // -------------------------------
    if (!recruiterId) {
      recruiterId = userId;
    }

    const recruiter = await this.prisma.user.findUnique({
      where: { id: recruiterId },
    });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter not found`);
    }

    // -------------------------------
    // CHECK EXISTING assignment
    // -------------------------------
    const exists = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
        roleNeededId: roleNeededId || null,
      },
    });

    if (exists) {
      throw new BadRequestException(
        `Candidate already assigned to this project${roleNeededId ? ' for this role' : ''}`,
      );
    }

    // -------------------------------
    // GET NOMINATED MAIN & SUB STATUS
    // -------------------------------
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({
      where: { name: 'nominated' },
    });

    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
      where: { name: 'nominated_initial' },
    });

    if (!mainStatus || !subStatus) {
      throw new BadRequestException(
        'Nominated status not found. Please seed the DB.',
      );
    }

    // -------------------------------
    // GET user name for history
    // -------------------------------
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // -------------------------------
    // CREATE ASSIGNMENT + HISTORY
    // -------------------------------
    const assignment = await this.prisma.$transaction(async (tx) => {
      // CREATE assignment with NEW STATUS SYSTEM
      const newAssignment = await tx.candidateProjects.create({
        data: {
          candidateId,
          projectId,
          roleNeededId: roleNeededId || null,
          recruiterId: recruiterId || null,
          assignedAt: new Date(),
          notes: createDto.notes || null,

          // NEW STATUS SYSTEM
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
        },
        include: {
          candidate: true,
          project: true,
          roleNeeded: true,
          recruiter: true,
          mainStatus: true,
          subStatus: true,
        },
      });

      // CREATE NEW STATUS HISTORY RECORD
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: newAssignment.id,
          changedById: userId,
          changedByName: user?.name || null,

          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,

          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,

          reason: 'Initial assignment to project',
          notes: `Assigned to project${roleNeededId ? ' for specific role' : ''}`,
        },
      });

      return newAssignment;
    });

    return assignment;
  }

  /**
   * Send candidate for verification
   * Creates candidate-project assignment if not exists, or updates existing
   * Sets status to verification_in_progress (ID 4)
   * Automatically matches candidate qualifications with project roles if roleNeededId not provided
   */
  async sendForVerification(
    createDto: CreateCandidateProjectDto,
    userId: string,
  ) {
    let { candidateId, projectId, roleNeededId, recruiterId } = createDto;

    // -------------------------------
    // VERIFY candidate
    // -------------------------------
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate)
      throw new NotFoundException(`Candidate ${candidateId} not found`);

    // -------------------------------
    // VERIFY project
    // -------------------------------
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { rolesNeeded: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    // -------------------------------
    // AUTO MATCH ROLE
    // -------------------------------
    if (!roleNeededId && project.rolesNeeded.length > 0) {
      const matchedRoleId = await this.autoMatchCandidateToRole(
        candidate,
        project.rolesNeeded,
      );
      if (matchedRoleId) roleNeededId = matchedRoleId;
    }

    // -------------------------------
    // VALIDATE ROLE (IF PROVIDED)
    // -------------------------------
    if (roleNeededId) {
      const role = project.rolesNeeded.find((r) => r.id === roleNeededId);
      if (!role)
        throw new NotFoundException(
          `Role ${roleNeededId} not found in this project`,
        );
    }

    // -------------------------------
    // RECRUITER HANDLING
    // -------------------------------
    if (!recruiterId) recruiterId = userId;

    const recruiter = await this.prisma.user.findUnique({
      where: { id: recruiterId },
    });
    if (!recruiter)
      throw new NotFoundException(`Recruiter ${recruiterId} not found`);

    // -------------------------------
    // NEW STATUS SYSTEM
    // -------------------------------
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({
      where: { name: 'documents' },
    });

    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
      where: { name: 'verification_in_progress_document' },
    });

    if (!mainStatus || !subStatus) {
      throw new BadRequestException(
        'Document verification statuses missing. Please seed the DB.',
      );
    }

    // -------------------------------
    // GET USER (FOR HISTORY SNAPSHOT)
    // -------------------------------
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // -------------------------------
    // CHECK EXISTING ASSIGNMENT
    // -------------------------------
    const existingAssignment = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
        roleNeededId: roleNeededId || null,
      },
    });

    // -------------------------------
    // CREATE OR UPDATE ASSIGNMENT
    // -------------------------------
    const candidateProject = await this.prisma.$transaction(async (tx) => {
      let assignment;

      if (existingAssignment) {
        // UPDATE
        assignment = await tx.candidateProjects.update({
          where: { id: existingAssignment.id },
          data: {
            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
            notes: createDto.notes ?? existingAssignment.notes,
          },
          include: {
            candidate: true,
            project: true,
            roleNeeded: true,
            recruiter: true,
            mainStatus: true,
            subStatus: true,
          },
        });
      } else {
        // CREATE
        assignment = await tx.candidateProjects.create({
          data: {
            candidateId,
            projectId,
            roleNeededId: roleNeededId || null,
            recruiterId: recruiterId || null,

            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
            assignedAt: new Date(),
            notes: createDto.notes || null,
          },
          include: {
            candidate: true,
            project: true,
            roleNeeded: true,
            recruiter: true,
            mainStatus: true,
            subStatus: true,
          },
        });
      }

      // CREATE NEW HISTORY ENTRY
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment.id,
          changedById: userId,
          changedByName: user?.name || null,

          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,

          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,

          reason: 'Sent for document verification',
          notes: createDto.notes || 'Verification started',
        },
      });

      return assignment;
    });

    // Notify documentation team (your existing function)
    await this.notifyDocumentationExecutives(candidateProject, candidate);

    return candidateProject;
  }

  /**
   * Send notifications to all Documentation Executive users
   */
  private async notifyDocumentationExecutives(
    candidateProject: any,
    candidate: any,
  ) {
    try {
      // Get Documentation Executive role
      const docRole = await this.prisma.role.findUnique({
        where: { name: 'Documentation Executive' },
        include: {
          userRoles: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!docRole || !docRole.userRoles.length) {
        console.log('No Documentation Executive users found');
        return;
      }

      // Use NotificationsService to create notifications so realtime socket events are emitted
      const createPromises = docRole.userRoles.map(async (userRole) => {
        const dto = {
          userId: userRole.user.id,
          type: 'DOCUMENT_VERIFICATION',
          title: 'New Document Verification Request',
          message: `${candidate.firstName} ${candidate.lastName} has been sent for document verification in project "${candidateProject.project.title}"`,
          idemKey: `doc-verify-${candidateProject.id}-${userRole.user.id}-${Date.now()}`,
          link: `/candidates/${candidate.id}/documents/${candidateProject.id}`,
          meta: {
            candidateProjectId: candidateProject.id,
            candidateId: candidate.id,
            projectId: candidateProject.projectId,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            projectTitle: candidateProject.project.title,
          },
        };

        try {
          await this.notificationsService.createNotification(dto as any);
        } catch (err) {
          // Log and continue — the notification shouldn't block verification
          this.logger.error(
            `Failed to create/emit notification for user ${userRole.user.id}: ${err?.message || err}`,
          );
        }
      });

      await Promise.all(createPromises);

      this.logger.log(
        `✅ Sent notifications to ${docRole.userRoles.length} Documentation Executive users (issued via NotificationsService)`,
      );
    } catch (error) {
      console.error(
        'Error sending notifications to Documentation Executives:',
        error,
      );
      // Don't throw error - notifications are not critical
    }
  }

  async findAll(queryDto: QueryCandidateProjectsDto) {
    const {
      page = 1,
      limit = 10,
      candidateId,
      projectId,
      recruiterId,
      statusId,
      search,
    } = queryDto;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (candidateId) {
      where.candidateId = candidateId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (recruiterId) {
      where.recruiterId = recruiterId;
    }

    if (statusId) {
      where.currentProjectStatusId = statusId;
    }

    if (search) {
      where.OR = [
        {
          candidate: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          project: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        skip,
        take: limit,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              minExperience: true,
              maxExperience: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          currentProjectStatus: true,
        },
        orderBy: {
          assignedAt: 'desc',
        },
      }),
      this.prisma.candidateProjects.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
            dateOfBirth: true,
            countryCode: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            deadline: true,
          },
        },
        roleNeeded: {
          select: {
            id: true,
            designation: true,
            minExperience: true,
            maxExperience: true,
            additionalRequirements: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        // NEW STATUS SYSTEM
        mainStatus: true,
        subStatus: true,

        // NEW STATUS HISTORY
        projectStatusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },

            // include main + sub status objects
            mainStatus: true,
            subStatus: true,
          },
          orderBy: {
            statusChangedAt: 'desc',
          },
        },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    return candidateProject;
  }

  async update(
    id: string,
    updateDto: UpdateCandidateProjectDto,
    userId: string,
  ) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    const { roleNeededId, recruiterId, ...otherUpdates } = updateDto;

    // Verify role if being updated
    if (roleNeededId) {
      const roleNeeded = await this.prisma.roleNeeded.findUnique({
        where: { id: roleNeededId },
      });
      if (!roleNeeded) {
        throw new NotFoundException(`Role with ID ${roleNeededId} not found`);
      }
    }

    // Verify recruiter if being updated
    if (recruiterId) {
      const recruiter = await this.prisma.user.findUnique({
        where: { id: recruiterId },
      });
      if (!recruiter) {
        throw new NotFoundException(
          `Recruiter with ID ${recruiterId} not found`,
        );
      }
    }

    const updated = await this.prisma.candidateProjects.update({
      where: { id },
      data: {
        ...otherUpdates,
        roleNeededId,
        recruiterId,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        roleNeeded: {
          select: {
            id: true,
            designation: true,
            minExperience: true,
            maxExperience: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        currentProjectStatus: true,
      },
    });

    return updated;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateProjectStatusDto,
    userId: string,
  ) {
    const { mainStatusId, subStatusId, reason, notes } = updateStatusDto;

    // -------------------------------------
    // FIND candidate project
    // -------------------------------------
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    // -------------------------------------
    // GET sub-status (required)
    // -------------------------------------
    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
      where: { id: subStatusId },
      include: {
        stage: true, // includes main status reference
      },
    });

    if (!subStatus) {
      throw new NotFoundException(`Sub-status ${subStatusId} not found`);
    }

    // -------------------------------------
    // IF mainStatusId not given → use subStatus.stage
    // -------------------------------------
    const mainStatus = mainStatusId
      ? await this.prisma.candidateProjectMainStatus.findUnique({
          where: { id: mainStatusId },
        })
      : subStatus.stage; // auto detected

    if (!mainStatus) {
      throw new NotFoundException(`Main status not found`);
    }

    // -------------------------------------
    // GET USER NAME FOR HISTORY
    // -------------------------------------
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // -------------------------------------
    // UPDATE & ADD HISTORY IN TRANSACTION
    // -------------------------------------
    const result = await this.prisma.$transaction(async (tx) => {
      // UPDATE current status (NEW SYSTEM)
      const updated = await tx.candidateProjects.update({
        where: { id },
        data: {
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
        },
        include: {
          candidate: true,
          project: true,
          roleNeeded: true,
          recruiter: true,
          mainStatus: true,
          subStatus: true,
        },
      });

      // Create history entry (NEW SYSTEM)
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: id,
          changedById: userId,
          changedByName: user?.name || null,

          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,

          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,

          reason: reason || null,
          notes: notes || null,
        },
      });

      return updated;
    });

    return result;
  }

  async remove(id: string) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    await this.prisma.candidateProjects.delete({
      where: { id },
    });

    return { message: 'Candidate project assignment deleted successfully' };
  }

  async getStatusHistory(id: string) {
    // -------------------------------------
    // VALIDATE candidate–project assignment
    // -------------------------------------
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    // -------------------------------------
    // FETCH STATUS HISTORY (NEW SYSTEM)
    // -------------------------------------
    const history = await this.prisma.candidateProjectStatusHistory.findMany({
      where: {
        candidateProjectMapId: id,
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        // NEW RELATIONS
        mainStatus: {
          select: {
            id: true,
            name: true,
            label: true,
            color: true,
            order: true,
          },
        },
        subStatus: {
          select: {
            id: true,
            name: true,
            label: true,
            color: true,
            order: true,
          },
        },
      },
      orderBy: {
        statusChangedAt: 'desc',
      },
    });

    return history;
  }

  async getProjectCandidates(
    projectId: string,
    queryDto: QueryCandidateProjectsDto,
  ) {
    const { page = 1, limit = 10, statusId, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      projectId,
    };

    if (statusId) {
      where.currentProjectStatusId = statusId;
    }

    if (search) {
      where.candidate = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        skip,
        take: limit,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              minExperience: true,
              maxExperience: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          currentProjectStatus: true,
        },
        orderBy: {
          assignedAt: 'desc',
        },
      }),
      this.prisma.candidateProjects.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCandidateProjects(
    candidateId: string,
    queryDto: QueryCandidateProjectsDto,
  ) {
    const { page = 1, limit = 10, statusId, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      candidateId,
    };

    if (statusId) {
      where.currentProjectStatusId = statusId;
    }

    if (search) {
      where.project = {
        title: { contains: search, mode: 'insensitive' },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        skip,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              deadline: true,
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              minExperience: true,
              maxExperience: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          currentProjectStatus: true,
        },
        orderBy: {
          assignedAt: 'desc',
        },
      }),
      this.prisma.candidateProjects.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Auto-match candidate to appropriate role based on qualifications
   * Matches candidate's education/qualifications with project's available roles
   */
  private async autoMatchCandidateToRole(
    candidate: any,
    rolesNeeded: any[],
  ): Promise<string | null> {
    if (!candidate.qualifications || candidate.qualifications.length === 0) {
      console.log('Candidate has no qualifications for auto-matching');
      return null;
    }

    // Extract qualification names and related role recommendations
    const candidateRoles = new Set<string>();

    for (const cq of candidate.qualifications) {
      const qual = cq.qualification;

      // Add the qualification field as potential role (e.g., "Nursing" -> "Nurse")
      if (qual.field) {
        candidateRoles.add(qual.field.toLowerCase());
      }

      // Add role recommendations
      if (qual.roleRecommendations) {
        for (const rec of qual.roleRecommendations) {
          if (rec.role && rec.role.name) {
            candidateRoles.add(rec.role.name.toLowerCase());
          }
        }
      }

      // Add qualification name as potential role match
      if (qual.name) {
        candidateRoles.add(qual.name.toLowerCase());
      }
    }

    console.log('Candidate potential roles:', Array.from(candidateRoles));

    // Try to match with project roles
    for (const roleNeeded of rolesNeeded) {
      const designation = roleNeeded.designation.toLowerCase();

      // Check for exact or partial match
      for (const candidateRole of candidateRoles) {
        // Exact match
        if (designation === candidateRole) {
          console.log(`Exact match found: ${roleNeeded.designation}`);
          return roleNeeded.id;
        }

        // Partial match (e.g., "Registered Nurse" contains "Nurse")
        if (
          designation.includes(candidateRole) ||
          candidateRole.includes(designation)
        ) {
          console.log(
            `Partial match found: ${roleNeeded.designation} ~ ${candidateRole}`,
          );
          return roleNeeded.id;
        }
      }
    }

    // If no match found, try matching by keywords
    const nursingKeywords = [
      'nurse',
      'nursing',
      'rn',
      'registered nurse',
      'staff nurse',
    ];
    const doctorKeywords = ['doctor', 'physician', 'md', 'medical doctor'];
    const labKeywords = [
      'lab',
      'laboratory',
      'technician',
      'medical technologist',
    ];

    const hasCandidateKeyword = (keywords: string[]) => {
      return Array.from(candidateRoles).some((role) =>
        keywords.some((keyword) => role.includes(keyword)),
      );
    };

    const hasRoleKeyword = (designation: string, keywords: string[]) => {
      const designationLower = designation.toLowerCase();
      return keywords.some((keyword) => designationLower.includes(keyword));
    };

    // Match by category keywords
    for (const roleNeeded of rolesNeeded) {
      if (
        hasCandidateKeyword(nursingKeywords) &&
        hasRoleKeyword(roleNeeded.designation, nursingKeywords)
      ) {
        console.log(`Keyword match (Nursing): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }

      if (
        hasCandidateKeyword(doctorKeywords) &&
        hasRoleKeyword(roleNeeded.designation, doctorKeywords)
      ) {
        console.log(`Keyword match (Doctor): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }

      if (
        hasCandidateKeyword(labKeywords) &&
        hasRoleKeyword(roleNeeded.designation, labKeywords)
      ) {
        console.log(`Keyword match (Lab): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }
    }

    console.log('No automatic role match found');
    return null;
  }

  /**
   * Send candidate to mock interview (recruiter action)
   * Creates a mock interview record and notifies the selected coordinator
   */
  async sendToMockInterview(
    candidateProjectMapId: string,
    coordinatorId: string,
    userId: string,
    scheduledTime?: string,
    meetingLink?: string,
  ) {
    // Verify candidate-project exists
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: {
            id: true,
            title: true,
            team: {
              select: { headId: true },
            },
          },
        },
        roleNeeded: {
          select: { designation: true },
        },
        subStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate-Project with ID "${candidateProjectMapId}" not found`,
      );
    }

    // Verify coordinator exists and has correct role
    const coordinator = await this.prisma.user.findUnique({
      where: { id: coordinatorId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!coordinator) {
      throw new NotFoundException(
        `Coordinator with ID "${coordinatorId}" not found`,
      );
    }

    const isCoordinator = coordinator.userRoles.some(
      (ur) => ur.role.name === 'Interview Coordinator',
    );
    if (!isCoordinator) {
      throw new BadRequestException(
        `User "${coordinator.name}" is not an Interview Coordinator`,
      );
    }

    // Create mock interview and update status in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create mock interview record
      const mockInterview = await tx.mockInterview.create({
        data: {
          candidateProjectMapId,
          coordinatorId,
          scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
          meetingLink,
          mode: 'video',
        },
      });

      // Update candidate-project status
      await tx.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.MOCK_INTERVIEW_SCHEDULED,
            },
          },
        },
      });

      // Create status history
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.MOCK_INTERVIEW_SCHEDULED,
          changedById: userId,
          reason: `Sent to mock interview with coordinator ${coordinator.name}`,
        },
      });

      return mockInterview;
    });

    // Publish notification event
    await this.outboxService.publishCandidateSentToMockInterview(
      candidateProjectMapId,
      result.id,
      coordinatorId,
      candidateProject.recruiterId || userId,
    );

    this.logger.log(
      `Candidate ${candidateProject.candidate.firstName} ${candidateProject.candidate.lastName} sent to mock interview with coordinator ${coordinator.name}`,
    );

    return {
      ...result,
      candidate: candidateProject.candidate,
      project: candidateProject.project,
    };
  }

  /**
   * Approve candidate for client interview (skip mock interview)
   * Directly moves candidate from documents_verified to approved status
   */
  async approveForClientInterview(
    candidateProjectMapId: string,
    userId: string,
    notes?: string,
  ) {
    // Verify candidate-project exists
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, title: true },
        },
        subStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate-Project with ID "${candidateProjectMapId}" not found`,
      );
    }

    // Verify current status allows this transition
    const currentStatus = candidateProject.subStatus?.name;
    if (currentStatus !== CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED) {
      throw new BadRequestException(
        `Cannot approve for client interview. Current status: ${currentStatus}. Expected: ${CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED}`,
      );
    }

    // Update status in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update candidate-project status to approved
      await tx.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.APPROVED,
            },
          },
        },
      });

      // Create status history
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.APPROVED,
          changedById: userId,
          reason: 'Approved for client interview (skipped mock interview)',
          notes,
        },
      });
    });

    this.logger.log(
      `Candidate ${candidateProject.candidate.firstName} ${candidateProject.candidate.lastName} approved for client interview (mock interview skipped)`,
    );

    return {
      success: true,
      message: 'Candidate approved for client interview',
    };
  }
}
