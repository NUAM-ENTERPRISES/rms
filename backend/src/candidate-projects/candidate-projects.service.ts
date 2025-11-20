import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCandidateProjectDto } from './dto/create-candidate-project.dto';
import { UpdateCandidateProjectDto } from './dto/update-candidate-project.dto';
import { QueryCandidateProjectsDto } from './dto/query-candidate-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

@Injectable()
export class CandidateProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign candidate to project with nominated status
   * Creates a new candidate-project assignment with status ID 1 (nominated)
   * and creates an initial status history entry
   * Automatically matches candidate qualifications with project roles if roleNeededId not provided
   */
  async assignCandidateToProject(createDto: CreateCandidateProjectDto, userId: string) {
    let { candidateId, projectId, roleNeededId, recruiterId } = createDto;

    // Verify candidate exists and get their qualifications
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        qualifications: {
          include: {
            qualification: {
              include: {
                roleRecommendations: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Verify project exists and get available roles
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
      },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Auto-match role if not provided
    if (!roleNeededId && project.rolesNeeded.length > 0) {
      const matchedRoleId = await this.autoMatchCandidateToRole(candidate, project.rolesNeeded);
      
      if (matchedRoleId) {
        roleNeededId = matchedRoleId;
        console.log(`Auto-matched candidate ${candidateId} to role ${roleNeededId}`);
      }
    }

    // Verify role if provided (roleNeededId is optional but should be validated if present)
    if (roleNeededId) {
      const roleNeeded = await this.prisma.roleNeeded.findUnique({
        where: { id: roleNeededId },
      });
      if (!roleNeeded) {
        throw new NotFoundException(`Role with ID ${roleNeededId} not found`);
      }
      
      // Verify role belongs to the project
      if (roleNeeded.projectId !== projectId) {
        throw new BadRequestException(
          `Role ${roleNeededId} does not belong to project ${projectId}`,
        );
      }
    }

    // If no recruiter provided, use the current user
    if (!recruiterId) {
      recruiterId = userId;
    }

    // Verify recruiter exists
    if (recruiterId) {
      const recruiter = await this.prisma.user.findUnique({
        where: { id: recruiterId },
      });
      if (!recruiter) {
        throw new NotFoundException(`User with ID ${recruiterId} not found`);
      }
    }

    // Check if candidate already assigned to project with same role
    const existingAssignment = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
        roleNeededId: roleNeededId || null,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        `Candidate is already assigned to this project${roleNeededId ? ' for this role' : ''}`,
      );
    }

    // Get nominated status (ID 1)
    const nominatedStatus = await this.prisma.candidateProjectStatus.findUnique({
      where: { id: 1 },
    });

    if (!nominatedStatus) {
      throw new BadRequestException(
        'Nominated status (ID 1) not found in system. Please seed the database.',
      );
    }

    // Get user details for history
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Create candidate project assignment and status history in a transaction
    const candidateProject = await this.prisma.$transaction(async (tx) => {
      // Create the assignment with nominated status (ID 1)
      const newAssignment = await tx.candidateProjects.create({
        data: {
          candidateId,
          projectId,
          roleNeededId: roleNeededId || null,
          recruiterId: recruiterId || null,
          currentProjectStatusId: 1, // Always start with nominated status
          assignedAt: new Date(),
          notes: createDto.notes || null,
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
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
            },
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          currentProjectStatus: {
            select: {
              id: true,
              statusName: true,
              description: true,
            },
          },
        },
      });

      // Create initial status history entry
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: newAssignment.id,
          changedById: userId,
          changedByName: user?.name || null,
          projectStatusId: 1, // Nominated status
          statusNameSnapshot: nominatedStatus.statusName,
          reason: 'Initial assignment to project',
          notes: `Candidate assigned to project${roleNeededId ? ' for specific role' : ''}`,
          statusChangedAt: new Date(),
        },
      });

      return newAssignment;
    });

    return candidateProject;
  }

  /**
   * Send candidate for verification
   * Creates candidate-project assignment if not exists, or updates existing
   * Sets status to verification_in_progress (ID 4)
   * Automatically matches candidate qualifications with project roles if roleNeededId not provided
   */
  async sendForVerification(createDto: CreateCandidateProjectDto, userId: string) {
    let { candidateId, projectId, roleNeededId, recruiterId } = createDto;

    // Verify candidate exists and get their qualifications
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        qualifications: {
          include: {
            qualification: {
              include: {
                roleRecommendations: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Verify project exists and get available roles
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
      },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Auto-match role if not provided
    if (!roleNeededId && project.rolesNeeded.length > 0) {
      const matchedRoleId = await this.autoMatchCandidateToRole(candidate, project.rolesNeeded);
      if (matchedRoleId) {
        roleNeededId = matchedRoleId;
        console.log(
          `Auto-matched candidate ${candidateId} to role ${roleNeededId} for verification`,
        );
      }
    }

    // Verify role exists in project if provided
    if (roleNeededId) {
      const roleExists = project.rolesNeeded.some((r) => r.id === roleNeededId);
      if (!roleExists) {
        throw new NotFoundException(
          `Role ${roleNeededId} not found in project ${projectId}`,
        );
      }
    }

    // If no recruiter provided, use the current user
    if (!recruiterId) {
      recruiterId = userId;
    }

    // Verify recruiter exists
    if (recruiterId) {
      const recruiter = await this.prisma.user.findUnique({
        where: { id: recruiterId },
      });
      if (!recruiter) {
        throw new NotFoundException(`User with ID ${recruiterId} not found`);
      }
    }

    // Get verification_in_progress status (ID 4)
    const verificationStatus = await this.prisma.candidateProjectStatus.findUnique({
      where: { id: 4 },
    });

    if (!verificationStatus) {
      throw new BadRequestException(
        'Verification in progress status (ID 4) not found in system. Please seed the database.',
      );
    }

    // Get user details for history
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Check if candidate already assigned to project with same role
    const existingAssignment = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
        roleNeededId: roleNeededId || null,
      },
    });

    // Create or update candidate project assignment and status history in a transaction
    const candidateProject = await this.prisma.$transaction(async (tx) => {
      let assignment;

      if (existingAssignment) {
        // Update existing assignment to verification status
        assignment = await tx.candidateProjects.update({
          where: { id: existingAssignment.id },
          data: {
            currentProjectStatusId: 4, // verification_in_progress
            notes: createDto.notes || existingAssignment.notes,
          },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobileNumber: true,
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
              },
            },
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            currentProjectStatus: {
              select: {
                id: true,
                statusName: true,
                description: true,
              },
            },
          },
        });

        // Create status history entry for the update
        await tx.candidateProjectStatusHistory.create({
          data: {
            candidateProjectMapId: assignment.id,
            changedById: userId,
            changedByName: user?.name || null,
            projectStatusId: 4,
            statusNameSnapshot: verificationStatus.statusName,
            reason: 'Sent for document verification',
            notes: createDto.notes || 'Documents sent for verification',
            statusChangedAt: new Date(),
          },
        });
      } else {
        // Create new assignment with verification status
        assignment = await tx.candidateProjects.create({
          data: {
            candidateId,
            projectId,
            roleNeededId: roleNeededId || null,
            recruiterId: recruiterId || null,
            currentProjectStatusId: 4, // verification_in_progress
            assignedAt: new Date(),
            notes: createDto.notes || null,
          },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobileNumber: true,
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
              },
            },
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            currentProjectStatus: {
              select: {
                id: true,
                statusName: true,
                description: true,
              },
            },
          },
        });

        // Create initial status history entry
        await tx.candidateProjectStatusHistory.create({
          data: {
            candidateProjectMapId: assignment.id,
            changedById: userId,
            changedByName: user?.name || null,
            projectStatusId: 4,
            statusNameSnapshot: verificationStatus.statusName,
            reason: 'Sent for document verification',
            notes: createDto.notes || 'Candidate sent directly for verification',
            statusChangedAt: new Date(),
          },
        });
      }

      return assignment;
    });

    // Send notifications to all Documentation Executive users
    await this.notifyDocumentationExecutives(candidateProject, candidate);

    return candidateProject;
  }

  /**
   * Send notifications to all Documentation Executive users
   */
  private async notifyDocumentationExecutives(candidateProject: any, candidate: any) {
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

      // Create notifications for each Documentation Executive user
      const notifications = docRole.userRoles.map((userRole) => ({
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
        status: 'unread',
      }));

      // Create all notifications
      await this.prisma.notification.createMany({
        data: notifications,
      });

      console.log(`✅ Sent notifications to ${notifications.length} Documentation Executive users`);
    } catch (error) {
      console.error('Error sending notifications to Documentation Executives:', error);
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
        currentProjectStatus: true,
        projectStatusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            projectStatus: true,
          },
          orderBy: {
            statusChangedAt: 'desc',
          },
        },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(`Candidate project assignment with ID ${id} not found`);
    }

    return candidateProject;
  }

  async update(id: string, updateDto: UpdateCandidateProjectDto, userId: string) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(`Candidate project assignment with ID ${id} not found`);
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
        throw new NotFoundException(`Recruiter with ID ${recruiterId} not found`);
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
    const { projectStatusId, reason, notes } = updateStatusDto;

    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
      include: {
        currentProjectStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(`Candidate project assignment with ID ${id} not found`);
    }

    // Verify new status exists
    const newStatus = await this.prisma.candidateProjectStatus.findUnique({
      where: { id: projectStatusId },
    });

    if (!newStatus) {
      throw new NotFoundException(`Project status with ID ${projectStatusId} not found`);
    }

    // Get user details for snapshot
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
      },
    });

    // Update status and create history entry in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update current status
      const updated = await tx.candidateProjects.update({
        where: { id },
        data: {
          currentProjectStatusId: projectStatusId,
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

      // Create history entry
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: id,
          changedById: userId,
          changedByName: user ? user.name : null,
          projectStatusId,
          statusNameSnapshot: newStatus.statusName,
          reason,
          notes,
          statusChangedAt: new Date(),
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
      throw new NotFoundException(`Candidate project assignment with ID ${id} not found`);
    }

    await this.prisma.candidateProjects.delete({
      where: { id },
    });

    return { message: 'Candidate project assignment deleted successfully' };
  }

  async getStatusHistory(id: string) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(`Candidate project assignment with ID ${id} not found`);
    }

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
        projectStatus: true,
      },
      orderBy: {
        statusChangedAt: 'desc',
      },
    });

    return history;
  }

  async getProjectCandidates(projectId: string, queryDto: QueryCandidateProjectsDto) {
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

  async getCandidateProjects(candidateId: string, queryDto: QueryCandidateProjectsDto) {
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
        if (designation.includes(candidateRole) || candidateRole.includes(designation)) {
          console.log(`Partial match found: ${roleNeeded.designation} ~ ${candidateRole}`);
          return roleNeeded.id;
        }
      }
    }

    // If no match found, try matching by keywords
    const nursingKeywords = ['nurse', 'nursing', 'rn', 'registered nurse', 'staff nurse'];
    const doctorKeywords = ['doctor', 'physician', 'md', 'medical doctor'];
    const labKeywords = ['lab', 'laboratory', 'technician', 'medical technologist'];
    
    const hasCandidateKeyword = (keywords: string[]) => {
      return Array.from(candidateRoles).some(role => 
        keywords.some(keyword => role.includes(keyword))
      );
    };

    const hasRoleKeyword = (designation: string, keywords: string[]) => {
      const designationLower = designation.toLowerCase();
      return keywords.some(keyword => designationLower.includes(keyword));
    };

    // Match by category keywords
    for (const roleNeeded of rolesNeeded) {
      if (hasCandidateKeyword(nursingKeywords) && hasRoleKeyword(roleNeeded.designation, nursingKeywords)) {
        console.log(`Keyword match (Nursing): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }
      
      if (hasCandidateKeyword(doctorKeywords) && hasRoleKeyword(roleNeeded.designation, doctorKeywords)) {
        console.log(`Keyword match (Doctor): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }
      
      if (hasCandidateKeyword(labKeywords) && hasRoleKeyword(roleNeeded.designation, labKeywords)) {
        console.log(`Keyword match (Lab): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }
    }

    console.log('No automatic role match found');
    return null;
  }
}