import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CandidateAssignmentValidatorService } from '../services/candidate-assignment-validator.service';
import { Permissions } from '../../auth/rbac/permissions.decorator';

@ApiTags('Candidate Assignment Validation')
@ApiBearerAuth()
@Controller('candidates/assignment-validation')
export class CandidateAssignmentController {
  constructor(
    private readonly assignmentValidator: CandidateAssignmentValidatorService,
  ) {}

  @Get('validate')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Validate candidate assignments',
    description: 'Check if all candidates are assigned to recruiters only',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation results',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            valid: { type: 'number' },
            invalid: { type: 'number' },
            invalidAssignments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string' },
                  candidateName: { type: 'string' },
                  projectId: { type: 'string' },
                  projectName: { type: 'string' },
                  recruiterId: { type: 'string' },
                  recruiterName: { type: 'string' },
                  roles: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async validateAssignments() {
    const result =
      await this.assignmentValidator.validateRecruiterAssignments();

    return {
      success: true,
      data: result,
      message: 'Assignment validation completed',
    };
  }

  @Post('fix')
  @Permissions('manage:candidates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fix invalid candidate assignments',
    description: 'Reassign candidates from non-recruiters to recruiters',
  })
  @ApiResponse({
    status: 200,
    description: 'Fix results',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            fixed: { type: 'number' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async fixAssignments() {
    const result = await this.assignmentValidator.fixInvalidAssignments();

    return {
      success: true,
      data: result,
      message: `Fixed ${result.fixed} invalid assignments`,
    };
  }

  @Get('recruiter-workload')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get recruiter workload',
    description: 'Get workload statistics for all recruiters',
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter workload data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              totalCandidates: { type: 'number' },
              activeCandidates: { type: 'number' },
              roles: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getRecruiterWorkload() {
    const workload = await this.assignmentValidator.getRecruiterWorkload();

    return {
      success: true,
      data: workload,
      message: 'Recruiter workload retrieved successfully',
    };
  }
}
