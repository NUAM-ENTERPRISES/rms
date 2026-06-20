import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IntroductionVideosService } from './introduction-videos.service';
import { ReuseIntroductionVideoDto } from './dto/reuse-introduction-video.dto';
import { UploadIntroductionVideoDto } from './dto/upload-introduction-video.dto';
import { InitiateIntroductionVideoUploadDto } from './dto/initiate-introduction-video-upload.dto';
import { ConfirmIntroductionVideoUploadDto } from './dto/confirm-introduction-video-upload.dto';
import { ListCandidateIntroductionVideosDto } from './dto/list-candidate-introduction-videos.dto';
import { ListReusableIntroductionVideosDto } from './dto/list-reusable-introduction-videos.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Introduction Videos')
@ApiBearerAuth()
@Controller('candidates')
export class IntroductionVideosController {
  constructor(
    private readonly introductionVideosService: IntroductionVideosService,
  ) {}

  @Get(':candidateId/introduction-videos')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'List candidate introduction videos by project',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'roleCatalogId', required: false, type: String })
  @ApiQuery({ name: 'libraryPage', required: false, type: Number })
  @ApiQuery({ name: 'libraryLimit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Introduction videos retrieved' })
  async listCandidateIntroductionVideos(
    @Param('candidateId') candidateId: string,
    @Query() query: ListCandidateIntroductionVideosDto,
  ) {
    const result =
      await this.introductionVideosService.listCandidateIntroductionVideos(
        candidateId,
        query,
      );
    return {
      success: true,
      data: result.items,
      library: result.library,
      libraryPagination: result.libraryPagination,
      pagination: result.pagination,
    };
  }

  @Post(':candidateId/introduction-videos/upload/initiate')
  @Permissions('write:candidates', 'write:documents')
  @ApiOperation({
    summary: 'Initiate a direct-to-Spaces introduction video upload',
  })
  async initiateIntroductionVideoUpload(
    @Param('candidateId') candidateId: string,
    @Body() dto: InitiateIntroductionVideoUploadDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data =
      await this.introductionVideosService.initiateIntroductionVideoUpload(
        candidateId,
        dto,
        req.user.sub,
      );

    return {
      success: true,
      data,
    };
  }

  @Post(':candidateId/introduction-videos/upload/confirm')
  @Permissions('write:candidates', 'write:documents')
  @ApiOperation({
    summary: 'Confirm a direct-to-Spaces introduction video upload',
  })
  async confirmIntroductionVideoUpload(
    @Param('candidateId') candidateId: string,
    @Body() dto: ConfirmIntroductionVideoUploadDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data =
      await this.introductionVideosService.confirmIntroductionVideoUpload(
        candidateId,
        dto,
        req.user.sub,
      );

    return {
      success: true,
      data,
      message: dto.projectId
        ? 'Introduction video uploaded successfully'
        : 'Introduction video uploaded to candidate library',
    };
  }

  @Get(':candidateId/introduction-videos/reusable')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'List reusable introduction videos for a candidate',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'excludeProjectId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Reusable introduction videos retrieved',
  })
  async listReusableIntroductionVideos(
    @Param('candidateId') candidateId: string,
    @Query() query: ListReusableIntroductionVideosDto,
  ) {
    const result =
      await this.introductionVideosService.listReusableIntroductionVideos(
        candidateId,
        query,
      );

    return {
      success: true,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Post(':candidateId/introduction-videos/upload')
  @Permissions('write:candidates', 'write:documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 105 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        remarks: { type: 'string', maxLength: 2000 },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary:
      'Upload a candidate introduction video without linking to a project',
    deprecated: true,
    description:
      'Deprecated: use POST .../upload/initiate and .../upload/confirm for direct-to-Spaces uploads.',
  })
  async uploadCandidateIntroductionVideo(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadIntroductionVideoDto,
    @Request() req: { user: { sub: string } },
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Send multipart/form-data with field name "file".',
      );
    }

    const data =
      await this.introductionVideosService.uploadCandidateIntroductionVideo(
        candidateId,
        file,
        req.user.sub,
        dto.remarks,
      );

    return {
      success: true,
      data,
      message: 'Introduction video uploaded to candidate library',
    };
  }

  @Get(':candidateId/projects/:projectId/introduction-video')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get introduction video for a candidate-project assignment',
  })
  async getProjectIntroductionVideo(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
  ) {
    const data =
      await this.introductionVideosService.getProjectIntroductionVideo(
        candidateId,
        projectId,
      );
    return {
      success: true,
      data,
    };
  }

  @Post(':candidateId/projects/:projectId/introduction-video')
  @Permissions('write:candidates', 'write:documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 105 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        remarks: { type: 'string', maxLength: 2000 },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Upload and link an introduction video to a project',
    deprecated: true,
    description:
      'Deprecated: use POST .../upload/initiate and .../upload/confirm for direct-to-Spaces uploads.',
  })
  async uploadIntroductionVideo(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadIntroductionVideoDto,
    @Request() req: { user: { sub: string } },
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Send multipart/form-data with field name "file".',
      );
    }

    const data = await this.introductionVideosService.uploadIntroductionVideo(
      candidateId,
      projectId,
      file,
      req.user.sub,
      dto.remarks,
    );

    return {
      success: true,
      data,
      message: 'Introduction video uploaded successfully',
    };
  }

  @Post(':candidateId/projects/:projectId/introduction-video/reuse')
  @Permissions('write:candidates', 'write:documents')
  @ApiOperation({
    summary: 'Reuse an existing introduction video for another project',
  })
  async reuseIntroductionVideo(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
    @Body() dto: ReuseIntroductionVideoDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data = await this.introductionVideosService.reuseIntroductionVideo(
      candidateId,
      projectId,
      dto.documentId,
      req.user.sub,
    );

    return {
      success: true,
      data,
      message: 'Introduction video linked successfully',
    };
  }

  @Post(':candidateId/projects/:projectId/introduction-video/reupload')
  @Permissions('write:candidates', 'write:documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 105 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        remarks: { type: 'string', maxLength: 2000 },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Replace the introduction video for a project assignment',
    deprecated: true,
    description:
      'Deprecated: use POST .../upload/initiate and .../upload/confirm for direct-to-Spaces uploads.',
  })
  async reuploadIntroductionVideo(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadIntroductionVideoDto,
    @Request() req: { user: { sub: string } },
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Send multipart/form-data with field name "file".',
      );
    }

    const data =
      await this.introductionVideosService.reuploadIntroductionVideo(
        candidateId,
        projectId,
        file,
        req.user.sub,
        dto.remarks,
      );

    return {
      success: true,
      data,
      message: 'Introduction video re-uploaded successfully',
    };
  }
}
