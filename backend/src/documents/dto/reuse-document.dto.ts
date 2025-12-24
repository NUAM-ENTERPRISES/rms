import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReuseDocumentDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'proj_123abc',
  })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: 'Role Catalog ID',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;
}
