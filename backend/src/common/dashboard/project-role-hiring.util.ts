import { PrismaService } from '../../database/prisma.service';

export type ProjectRoleHiringRow = {
  role: string;
  required: number;
  filled: number;
};

export type ProjectRoleHiringProject = {
  projectId: string;
  projectName: string;
  roles: ProjectRoleHiringRow[];
};

type ProjectWithRoles = {
  id: string;
  title: string;
  rolesNeeded: Array<{
    id: string;
    designation: string;
    quantity: number;
  }>;
};

const FILLED_STATUSES = ['hired', 'deployed'] as const;

export async function buildProjectRoleHiringRows(
  prisma: PrismaService,
  projects: ProjectWithRoles[],
): Promise<ProjectRoleHiringProject[]> {
  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);

  const candidateProjects = await prisma.candidateProjects.findMany({
    where: {
      projectId: { in: projectIds },
      roleNeededId: { not: null },
      currentProjectStatus: {
        statusName: { in: [...FILLED_STATUSES] },
      },
    },
    select: {
      projectId: true,
      roleNeededId: true,
    },
  });

  const filledMap = new Map<string, number>();
  candidateProjects.forEach((cp) => {
    if (!cp.roleNeededId) return;
    const key = `${cp.projectId}:${cp.roleNeededId}`;
    filledMap.set(key, (filledMap.get(key) ?? 0) + 1);
  });

  return projects.map((project) => ({
    projectId: project.id,
    projectName: project.title,
    roles: project.rolesNeeded.map((role) => ({
      role: role.designation,
      required: role.quantity,
      filled: filledMap.get(`${project.id}:${role.id}`) ?? 0,
    })),
  }));
}

export async function countFilledCandidatesForProjects(
  prisma: PrismaService,
  projectIds: string[],
): Promise<number> {
  if (projectIds.length === 0) {
    return 0;
  }

  return prisma.candidateProjects.count({
    where: {
      projectId: { in: projectIds },
      currentProjectStatus: {
        statusName: { in: [...FILLED_STATUSES] },
      },
    },
  });
}
