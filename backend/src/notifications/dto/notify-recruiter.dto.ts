import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class NotifyRecruiterDto {
  @ApiProperty({
    description: 'The ID of the recruiter to notify',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  recruiterId: string;

  @ApiProperty({
    description: 'The message to send to the recruiter',
    example: 'Please check the documents for candidate John Doe.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'The title of the notification',
    example: 'Action Required',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Optional link to redirection in the frontend',
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
