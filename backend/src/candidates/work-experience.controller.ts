import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkExperienceService } from './work-experience.service';
import { CreateWorkExperienceDto } from './dto/create-work-experience.dto';
import { UpdateWorkExperienceDto } from './dto/update-work-experience.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Work Experience')
@ApiBearerAuth()
@Controller('work-experience')
@UseGuards(JwtAuthGuard)
export class WorkExperienceController {
  constructor(private readonly workExperienceService: WorkExperienceService) {}

  @Post()
  @ApiOperation({ summary: 'Create work experience entry' })
  @ApiResponse({
    status: 201,
    description: 'Work experience created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  create(@Body() createWorkExperienceDto: CreateWorkExperienceDto) {
    return this.workExperienceService.create(createWorkExperienceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all work experience entries' })
  @ApiResponse({
    status: 200,
    description: 'Work experience entries retrieved successfully',
  })
  findAll(@Query('candidateId') candidateId?: string) {
    return this.workExperienceService.findAll(candidateId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work experience by ID' })
  @ApiResponse({
    status: 200,
    description: 'Work experience retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Work experience not found' })
  findOne(@Param('id') id: string) {
    return this.workExperienceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update work experience entry' })
  @ApiResponse({
    status: 200,
    description: 'Work experience updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Work experience not found' })
  update(
    @Param('id') id: string,
    @Body() updateWorkExperienceDto: UpdateWorkExperienceDto,
  ) {
    return this.workExperienceService.update(id, updateWorkExperienceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete work experience entry' })
  @ApiResponse({
    status: 200,
    description: 'Work experience deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Work experience not found' })
  remove(@Param('id') id: string) {
    return this.workExperienceService.remove(id);
  }

  @Get('candidate/:candidateId')
  @ApiOperation({ summary: 'Get work experience by candidate ID' })
  @ApiResponse({
    status: 200,
    description: 'Work experience entries retrieved successfully',
  })
  findByCandidateId(@Param('candidateId') candidateId: string) {
    return this.workExperienceService.findByCandidateId(candidateId);
  }
}
