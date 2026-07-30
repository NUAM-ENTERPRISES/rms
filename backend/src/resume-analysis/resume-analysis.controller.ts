import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Request,
  UploadedFiles,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { CandidatesService } from '../candidates/candidates.service';
import { CreateCandidateDto } from '../candidates/dto/create-candidate.dto';
import { UploadService } from '../upload/upload.service';
import { ResumeAnalysisService } from './resume-analysis.service';

const MAX_RESUMES = 20;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type BulkCreateResult =
  | { success: true; filename: string; candidateId: string }
  | { success: false; filename: string; error: string };

@ApiTags('Resume Analysis')
@ApiBearerAuth()
@Controller('resume-analysis')
export class ResumeAnalysisController {
  private readonly logger = new Logger(ResumeAnalysisController.name);

  constructor(
    private readonly resumeAnalysisService: ResumeAnalysisService,
    private readonly candidatesService: CandidatesService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('bulk-analyze')
  @Permissions('bulk_create:candidates')
  @UseInterceptors(FilesInterceptor('resume', MAX_RESUMES))
  @ApiOperation({
    summary: 'Analyze up to 20 resume PDFs with AI and return candidate drafts',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  async bulkAnalyze(@UploadedFiles() files: Express.Multer.File[]) {
    this.validateFiles(files);

    const results = await this.resumeAnalysisService.analyzeFiles(files);

    return {
      success: true,
      count: results.length,
      results,
    };
  }

  @Post('bulk-create')
  @Permissions('bulk_create:candidates')
  @UseInterceptors(FilesInterceptor('resume', MAX_RESUMES))
  @ApiOperation({
    summary:
      'Create candidates (with experiences/qualifications) and attach resume documents',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        candidates: {
          type: 'string',
          description:
            'JSON array of create-candidate payloads, order-aligned with files',
        },
      },
    },
  })
  async bulkCreate(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('candidates') candidatesJson: string,
    @Request() req,
  ) {
    this.validateFiles(files);

    let payloads: unknown[];
    try {
      payloads = JSON.parse(candidatesJson ?? '');
    } catch {
      throw new BadRequestException('Invalid candidates JSON payload');
    }

    if (!Array.isArray(payloads) || payloads.length !== files.length) {
      throw new BadRequestException(
        'candidates array must match uploaded files (same length and order)',
      );
    }

    const userId: string = req.user.id;
    const results: BulkCreateResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dto = plainToInstance(CreateCandidateDto, payloads[i], {
          enableImplicitConversion: false,
        });
        const errors = await validate(dto, {
          whitelist: true,
          forbidNonWhitelisted: false,
        });
        if (errors.length > 0) {
          const messages = errors
            .flatMap((e) => Object.values(e.constraints ?? {}))
            .join('; ');
          throw new BadRequestException(messages || 'Invalid candidate data');
        }

        const candidate = await this.candidatesService.create(dto, userId);

        await this.uploadService.uploadResume(
          file,
          candidate.id,
          undefined,
          undefined,
          userId,
        );

        results.push({
          success: true,
          filename: file.originalname,
          candidateId: candidate.id,
        });
      } catch (error) {
        this.logger.warn(
          `Bulk create failed for ${file.originalname}: ${error}`,
        );
        results.push({
          success: false,
          filename: file.originalname,
          error:
            error instanceof Error ? error.message : 'unknown error occurred',
        });
      }
    }

    return {
      success: true,
      count: results.length,
      results,
    };
  }

  private validateFiles(files: Express.Multer.File[] | undefined): void {
    if (!files || files.length === 0) {
      throw new BadRequestException('No resume files uploaded');
    }
    if (files.length > MAX_RESUMES) {
      throw new BadRequestException(
        `Too many files. Maximum is ${MAX_RESUMES} resumes at a time`,
      );
    }
    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException(
          `"${file.originalname}" is not a PDF. Only PDF files are allowed`,
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        throw new BadRequestException(
          `"${file.originalname}" exceeds the 5MB per-file limit`,
        );
      }
    }
  }
}
