// src/whatsapp/dto/send-whatsapp.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, Matches } from 'class-validator';
import { WHATSAPP_TEMPLATE_TYPES } from '../../common/constants//whatsapp-templates';

export class SendWhatsAppMessageDto {
  @ApiProperty({
    description: 'Recipient phone number with country code',
    example: '919876543210',
  })
  @IsString()
  @Matches(/^\d+$/, { message: 'Phone number must contain only digits' })
  to: string;

  @ApiProperty({
    description: 'WhatsApp approved template name',
    enum: Object.values(WHATSAPP_TEMPLATE_TYPES),
    example: WHATSAPP_TEMPLATE_TYPES.NUAM_ACCOUNT_CREATION_V1,
  })
  @IsString()
  templateName: string;

  @ApiPropertyOptional({
    description: 'Language code for the template',
    example: 'en_US',
    default: 'en_US',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'Template body parameters ({{1}}, {{2}}, ...)',
    example: ['Siva', 'Active'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bodyParameters?: string[];

  @ApiPropertyOptional({
    description: 'Template header parameters',
    example: ['NUAM'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headerParameters?: string[];
}
