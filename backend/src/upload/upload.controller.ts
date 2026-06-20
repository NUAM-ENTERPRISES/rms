import {
  Controller,
  Post,
  Delete,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Param,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { DocumentsService } from '../documents/documents.service';
import { DocumentWithRelations } from '../documents/types';
import { PrismaService } from '../database/prisma.service';
import { UPLOAD_ACCEPT_BUFFER_BYTES } from './upload.constants';

const documentUploadMulterOptions = {
  limits: { fileSize: UPLOAD_ACCEPT_BUFFER_BYTES },
};

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly documentsService: DocumentsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload profile image for user
   */
  @Post('profile-image/user/:userId')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('write:users', 'manage:users')
  @ApiOperation({ summary: 'Upload user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadUserProfileImage(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadProfileImage(
      file,
      'user',
      userId,
    );

    return {
      success: true,
      data: result,
      message: 'Profile image uploaded successfully',
    };
  }

  /**
   * Upload profile image for candidate
   */
  @Post('profile-image/candidate/:candidateId')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('write:candidates', 'manage:candidates')
  @ApiOperation({ summary: 'Upload candidate profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadCandidateProfileImage(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadProfileImage(
      file,
      'candidate',
      candidateId,
    );

    return {
      success: true,
      data: result,
      message: 'Profile image uploaded successfully',
    };
  }

  /**
   * Upload document for candidate
   */
  @Post('document/:candidateId')
  @UseInterceptors(FileInterceptor('file', documentUploadMulterOptions))
  @Permissions('write:candidates', 'manage:candidates', 'write:documents')
  @ApiOperation({ summary: 'Upload candidate document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        docType: {
          type: 'string',
          description: 'Document type (e.g., passport, license, degree)',
        },
        workExperienceId: {
          type: 'string',
          description: 'Optional work experience ID to link this document to a specific work experience entry',
        },
      },
    },
  })
  async uploadDocument(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType: string,
    @Body('workExperienceId') workExperienceId?: string,
    @Request() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please ensure you are sending a file using multipart/form-data with the field name "file".');
    }

    if (!docType) {
      throw new BadRequestException('Document type is required');
    }

    const result = await this.uploadService.uploadDocument(
      file,
      candidateId,
      docType,
    );

    let document: DocumentWithRelations | null = null;
    if (workExperienceId) {
      document = await this.documentsService.create(
        {
          candidateId,
          docType,
          fileName: result.fileName,
          fileUrl: result.fileUrl,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          workExperienceId,
        },
        req?.user?.sub || 'system',
      );
    }

    return {
      success: true,
      data: {
        ...result,
        document,
      },
      message: 'Document uploaded successfully',
    };
  }

  /**
   * Upload multiple files as one batch linked to work experience (e.g. experience letters).
   * Same docType and optional docName applied to each created document record.
   */
  @Post('work-experience-documents/:candidateId')
  @UseInterceptors(
    FilesInterceptor('files', 15, documentUploadMulterOptions),
  )
  @Permissions('write:candidates', 'manage:candidates', 'write:documents')
  @ApiOperation({
    summary: 'Upload multiple work experience certificate files',
    description:
      'Multipart field `files` (repeat per file). Requires docType and workExperienceId. Optional docName labels all created documents.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        docType: { type: 'string', example: 'experience_letters' },
        workExperienceId: { type: 'string' },
        docName: { type: 'string', description: 'Optional label for all files in this batch' },
      },
      required: ['docType', 'workExperienceId'],
    },
  })
  async uploadWorkExperienceDocuments(
    @Param('candidateId') candidateId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('docType') docType: string,
    @Body('workExperienceId') workExperienceId: string,
    @Body('docName') docName: string | undefined,
    @Request() req: { user?: { sub: string } },
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'At least one file is required (multipart field name: files).',
      );
    }
    if (!docType) {
      throw new BadRequestException('docType is required');
    }
    if (!workExperienceId) {
      throw new BadRequestException('workExperienceId is required');
    }

    const workExperience = await this.prisma.workExperience.findFirst({
      where: { id: workExperienceId, candidateId },
      select: { id: true },
    });
    if (!workExperience) {
      throw new NotFoundException(
        'Work experience not found for this candidate.',
      );
    }

    const userId = req?.user?.sub || 'system';
    const trimmedDocName = docName?.trim() || undefined;
    const documents: DocumentWithRelations[] = [];
    const failedFileNames: string[] = [];

    for (const file of files) {
      try {
        const uploadResult = await this.uploadService.uploadDocument(
          file,
          candidateId,
          docType,
        );
        const doc = await this.documentsService.create(
          {
            candidateId,
            docType,
            docName: trimmedDocName,
            fileName: uploadResult.fileName,
            fileUrl: uploadResult.fileUrl,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            workExperienceId,
          },
          userId,
        );
        documents.push(doc);
      } catch {
        failedFileNames.push(file.originalname || 'unknown');
      }
    }

    return {
      success: true,
      data: {
        documents,
        failedFileNames,
      },
      message:
        documents.length === files.length
          ? `Uploaded ${documents.length} document(s) successfully`
          : `Uploaded ${documents.length} of ${files.length} file(s)${
              failedFileNames.length ? `; failed: ${failedFileNames.join(', ')}` : ''
            }`,
    };
  }

  /**
   * Upload an offer letter and link it to a project nomination
   */
  @Post('offer-letter/:candidateId')
  @UseInterceptors(FileInterceptor('file', documentUploadMulterOptions))
  @Permissions('write:documents', 'write:interviews')
  @ApiOperation({
    summary: 'Upload offer letter',
    description: 'Upload an offer letter (multipart) and link it to a specific project. This handles both file storage and document record creation.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Offer letter file (PDF or Image)' },
        projectId: { type: 'string', description: 'Project ID' },
        roleCatalogId: { type: 'string', description: 'Role Catalog ID' },
        offerLetterReceivedAt: { type: 'string', format: 'date-time', description: 'Offer letter received date (ISO)' },
        notes: { type: 'string', description: 'Optional notes' },
      },
      required: ['file', 'projectId', 'roleCatalogId', 'offerLetterReceivedAt'],
    },
  })
  async uploadOfferLetter(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('roleCatalogId') roleCatalogId: string,
    @Body('offerLetterReceivedAt') offerLetterReceivedAt: string,
    @Body('notes') notes?: string,
    @Request() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please ensure you are sending a file using multipart/form-data with the field name "file".');
    }

    if (!projectId || !roleCatalogId) {
      throw new BadRequestException('projectId and roleCatalogId are required');
    }

    // 1. Upload the file to S3/Spaces
    const uploadResult = await this.uploadService.uploadDocument(
      file,
      candidateId,
      'offer_letter',
    );

    // 2. Use the DocumentsService to create the database records
    if (!offerLetterReceivedAt) {
      throw new BadRequestException('offerLetterReceivedAt is required');
    }

    const result = await this.documentsService.uploadOfferLetter(
      {
        candidateId,
        projectId,
        roleCatalogId,
        fileName: file.originalname,
        fileUrl: uploadResult.fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        notes: notes,
        offerLetterReceivedAt: offerLetterReceivedAt,
      },
      req.user.sub,
    );

    return {
      success: true,
      data: result,
      message: 'Offer letter uploaded and linked successfully',
    };
  }

  /**
   * Upload resume for candidate
   */
  @Post('resume/:candidateId')
  @UseInterceptors(FileInterceptor('file', documentUploadMulterOptions))
  @Permissions('write:candidates', 'manage:candidates')
  @ApiOperation({ summary: 'Upload candidate resume' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        roleCatalogId: {
          type: 'string',
          description: 'Role Catalog ID',
        },
        docName: {
          type: 'string',
          description: 'Optional document display name',
        },
      },
    },
  })
  async uploadResume(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('roleCatalogId') roleCatalogId?: string,
    @Body('docName') docName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadResume(
      file,
      candidateId,
      roleCatalogId,
      docName?.trim() || undefined,
    );

    return {
      success: true,
      data: result,
      message: 'Resume uploaded successfully',
    };
  }

  /**
   * Delete a file
   */
  @Delete('file')
  @Permissions('manage:users', 'manage:candidates', 'manage:documents')
  @ApiOperation({ summary: 'Delete a file from storage' })
  async deleteFile(@Body('fileUrl') fileUrl: string) {
    if (!fileUrl) {
      throw new BadRequestException('File URL is required');
    }

    await this.uploadService.deleteFile(fileUrl);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}
