import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  PROCESSING_STEPS,
  PROCESSING_STEP_CONFIG_MAP,
  PROCESSING_STEP_ORDER,
} from './processing.constants';




@Injectable()
export class ProcessingService {

  constructor(private readonly prisma: PrismaService) {}

}
