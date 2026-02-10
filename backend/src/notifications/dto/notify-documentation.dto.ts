import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class NotifyDocumentationDto {
  @ApiProperty({
    description: 'The ID of the user to notify (documentation owner/coordinator)',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({
    description: 'The message to send',
    example: 'Please review candidate documents for John Doe.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'The title of the notification',
    example: 'Document Review Required',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Optional link to redirect in the frontend',
    example: '/candidates/123',
    required: false,
  })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiProperty({
    description: 'Optional metadata for the notification',
    required: false,
  })
  @IsObject()
  @IsOptional()
  meta?: Record<string, any>;
}
