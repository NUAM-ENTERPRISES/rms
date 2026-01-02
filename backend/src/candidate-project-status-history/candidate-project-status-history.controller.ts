import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CandidateProjectStatusHistoryService } from './candidate-project-status-history.service';

@ApiTags('Candidate Project Pipeline')
@Controller('candidate-project-pipeline')
export class CandidateProjectStatusHistoryController {
  constructor(private readonly service: CandidateProjectStatusHistoryService) {}

  @Get('candidate/:candidateId/project/:projectId')
  @ApiOperation({
    summary: 'Get candidate project pipeline',
    description: 'Retrieve the pipeline (status history) for a candidate in a specific project',
  })
  @ApiParam({ name: 'candidateId', type: 'string', example: 'cand123' })
  @ApiParam({ name: 'projectId', type: 'string', example: 'proj456' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            candidate: { type: 'object' },
            project: { type: 'object' },
            nominatedRole: { type: 'object' },
            currentStatus: {
              type: 'object',
              properties: {
                mainStatus: { type: 'object' },
                subStatus: { type: 'object' },
                timeInStatus: { type: 'string', example: '2 days' },
              },
            },
            pipeline: {
              type: 'object',
              properties: {
                progressOrder: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      order: { type: 'number' },
                      name: { type: 'string' },
                      label: { type: 'string' },
                      isCompleted: { type: 'boolean' },
                      isCurrent: { type: 'boolean' },
                    },
                  },
                },
                applicationProgress: { type: 'number', example: 60 },
                duration: { type: 'string', example: '15 days' },
                nextStep: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    name: { type: 'string' },
                    label: { type: 'string' },
                    type: { type: 'string', enum: ['main_status', 'sub_status'] },
                  },
                },
              },
            },
            history: { type: 'array', items: { type: 'object' } },
            totalEntries: { type: 'number', example: 5 },
          },
        },
        message: { type: 'string', example: 'Pipeline retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getCandidateProjectPipeline(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string
  ) {
    return this.service.getCandidateProjectStatusHistory(candidateId, projectId);
  }
}
