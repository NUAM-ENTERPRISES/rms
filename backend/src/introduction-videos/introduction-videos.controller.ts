import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IntroductionVideosService } from './introduction-videos.service';
import { ReuseIntroductionVideoDto } from './dto/reuse-introduction-video.dto';
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
  @ApiResponse({ status: 200, description: 'Introduction videos retrieved' })
  async listCandidateIntroductionVideos(
    @Param('candidateId') candidateId: string,
  ) {
    const data =
      await this.introductionVideosService.listCandidateIntroductionVideos(
        candidateId,
      );
    return {
      success: true,
      data,
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
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Upload and link an introduction video to a project',
  })
  async uploadIntroductionVideo(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
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
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Replace the introduction video for a project assignment',
  })
  async reuploadIntroductionVideo(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
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
      );

    return {
      success: true,
      data,
      message: 'Introduction video re-uploaded successfully',
    };
  }
}
