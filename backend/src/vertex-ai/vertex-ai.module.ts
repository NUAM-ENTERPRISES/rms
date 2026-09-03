import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VertexAiService } from './vertex-ai.service';

@Module({
  imports: [ConfigModule],
  providers: [VertexAiService],
  exports: [VertexAiService],
})
export class VertexAiModule {}
