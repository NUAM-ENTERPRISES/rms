import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateLeadgenChannelsDto {
  @ApiPropertyOptional({
    description: 'Enable or disable WhatsApp leadgen / messaging',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable Instagram leadgen / messaging',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  instagram?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable Facebook Page Messenger messaging',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  messenger?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable Meta Leadgen (Facebook Lead Ads forms)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  leadgenForms?: boolean;
}
