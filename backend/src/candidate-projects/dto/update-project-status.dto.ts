import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProjectStatusDto {
  @ApiProperty({
    description: 'Sub-status ID (required)',
    example: 'clx123abc456substatus'
  })
  @IsString()
  @IsNotEmpty()
  subStatusId: string;

  @ApiPropertyOptional({
    description: 'Main status ID (optional, system auto-detects from sub-status if not provided)',
    example: 'clx123abc456mainstatus',
  })
  @IsString()
  @IsOptional()
  mainStatusId?: string;

  @ApiPropertyOptional({
    description: 'Reason for changing status',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for status change',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
