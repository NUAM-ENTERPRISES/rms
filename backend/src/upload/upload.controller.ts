import {
  Controller,
  Post,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { DocumentsService } from '../documents/documents.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly documentsService: DocumentsService,
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
  @UseInterceptors(FileInterceptor('file'))
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
      },
    },
  })
  async uploadDocument(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType: string,
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

    return {
      success: true,
      data: result,
      message: 'Document uploaded successfully',
    };
  }

  /**
   * Upload an offer letter and link it to a project nomination
   */
  @Post('offer-letter/:candidateId')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('write:documents')
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
        notes: { type: 'string', description: 'Optional notes' },
      },
      required: ['file', 'projectId', 'roleCatalogId'],
    },
  })
  async uploadOfferLetter(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('roleCatalogId') roleCatalogId: string,
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
  @UseInterceptors(FileInterceptor('file'))
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
      },
    },
  })
  async uploadResume(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('roleCatalogId') roleCatalogId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadResume(
      file,
      candidateId,
      roleCatalogId,
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
