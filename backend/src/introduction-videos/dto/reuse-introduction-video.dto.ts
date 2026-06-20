import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReuseIntroductionVideoDto {
  @ApiProperty({
    description: 'Existing introduction video document ID to link to this project',
    example: 'doc_123abc',
  })
  @IsString()
  documentId!: string;
}
