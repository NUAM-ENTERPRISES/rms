import { PrismaService } from '../../database/prisma.service';

export const PIPELINE_STAGES = [
  {
    key: 'nominated',
    label: 'Nominated',
    mainStatus: 'nominated',
    color: 'indigo',
  },
  {
    key: 'documents',
    label: 'Documents',
    mainStatus: 'documents',
    color: 'amber',
  },
  {
    key: 'interview',
    label: 'Interview',
    mainStatus: 'interview',
    color: 'purple',
  },
  {
    key: 'processing',
    label: 'Processing',
    mainStatus: 'processing',
    color: 'orange',
  },
  {
    key: 'deployed',
    label: 'Deployed',
    mainStatus: 'final',
    color: 'emerald',
  },
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGES)[number]['key'];

export type ProjectPipelineCounts = {
  total: number;
  nominated: number;
  documents: number;
  interview: number;
  processing: number;
  deployed: number;
};

export type PipelineStageCount = {
  key: PipelineStageKey;
  label: string;
  count: number;
  color: string;
};

export async function getProjectPipelineCounts(
  prisma: PrismaService,
  projectId: string,
): Promise<{ pipeline: ProjectPipelineCounts; stages: PipelineStageCount[] }> {
  const baseWhere = { projectId };

  const [total, ...stageCounts] = await Promise.all([
    prisma.candidateProjects.count({ where: baseWhere }),
    ...PIPELINE_STAGES.map((stage) =>
      prisma.candidateProjects.count({
        where: {
          ...baseWhere,
          mainStatus: { name: stage.mainStatus },
        },
      }),
    ),
  ]);

  const pipeline: ProjectPipelineCounts = {
    total,
    nominated: stageCounts[0],
    documents: stageCounts[1],
    interview: stageCounts[2],
    processing: stageCounts[3],
    deployed: stageCounts[4],
  };

  const stages: PipelineStageCount[] = PIPELINE_STAGES.map((stage, index) => ({
    key: stage.key,
    label: stage.label,
    count: stageCounts[index],
    color: stage.color,
  }));

  return { pipeline, stages };
}
