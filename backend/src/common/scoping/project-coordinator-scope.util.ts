import { ROLE_NAMES } from '../constants/role-ids';
import { PrismaService } from '../../database/prisma.service';

export function isProjectCoordinator(roles?: string[]): boolean {
  return roles?.includes(ROLE_NAMES.PROJECT_COORDINATOR) ?? false;
}

/** Clients created by the coordinator or linked via their projects. */
export async function getProjectCoordinatorClientIds(
  prisma: PrismaService,
  userId: string,
): Promise<string[]> {
  const [createdClients, linkedClients] = await Promise.all([
    prisma.client.findMany({
      where: { createdBy: userId },
      select: { id: true },
    }),
    prisma.project.findMany({
      where: {
        createdBy: userId,
        clientId: { not: null },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    }),
  ]);

  const ids = new Set<string>();
  createdClients.forEach((client) => ids.add(client.id));
  linkedClients.forEach((project) => {
    if (project.clientId) ids.add(project.clientId);
  });
  return Array.from(ids);
}
