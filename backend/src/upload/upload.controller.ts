import {
  Controller,
  Post,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

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
      throw new BadRequestException('No file uploaded');
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
