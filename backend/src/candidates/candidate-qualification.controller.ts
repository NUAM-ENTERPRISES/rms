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
import { CandidateQualificationService } from './candidate-qualification.service';
import { CreateCandidateQualificationDto } from './dto/create-candidate-qualification.dto';
import { UpdateCandidateQualificationDto } from './dto/update-candidate-qualification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Candidate Qualifications')
@ApiBearerAuth()
@Controller('candidate-qualifications')
@UseGuards(JwtAuthGuard)
export class CandidateQualificationController {
  constructor(
    private readonly candidateQualificationService: CandidateQualificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create candidate qualification entry' })
  @ApiResponse({
    status: 201,
    description: 'Candidate qualification created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 404,
    description: 'Candidate or qualification not found',
  })
  create(
    @Body() createCandidateQualificationDto: CreateCandidateQualificationDto,
  ) {
    return this.candidateQualificationService.create(
      createCandidateQualificationDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all candidate qualification entries' })
  @ApiResponse({
    status: 200,
    description: 'Candidate qualification entries retrieved successfully',
  })
  findAll(@Query('candidateId') candidateId?: string) {
    return this.candidateQualificationService.findAll(candidateId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get candidate qualification by ID' })
  @ApiResponse({
    status: 200,
    description: 'Candidate qualification retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate qualification not found',
  })
  findOne(@Param('id') id: string) {
    return this.candidateQualificationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update candidate qualification entry' })
  @ApiResponse({
    status: 200,
    description: 'Candidate qualification updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 404,
    description: 'Candidate qualification not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateCandidateQualificationDto: UpdateCandidateQualificationDto,
  ) {
    return this.candidateQualificationService.update(
      id,
      updateCandidateQualificationDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete candidate qualification entry' })
  @ApiResponse({
    status: 200,
    description: 'Candidate qualification deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate qualification not found',
  })
  remove(@Param('id') id: string) {
    return this.candidateQualificationService.remove(id);
  }

  @Get('candidate/:candidateId')
  @ApiOperation({ summary: 'Get candidate qualifications by candidate ID' })
  @ApiResponse({
    status: 200,
    description: 'Candidate qualification entries retrieved successfully',
  })
  findByCandidateId(@Param('candidateId') candidateId: string) {
    return this.candidateQualificationService.findByCandidateId(candidateId);
  }
}
