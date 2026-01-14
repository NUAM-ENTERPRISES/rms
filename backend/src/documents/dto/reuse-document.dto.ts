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
    description: 'Role Catalog ID (accepted as `roleCatalog`; `roleCatalogId` and common typo `roleCatelogId` supported for backward compatibility)',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalog?: string;

  @ApiPropertyOptional({
    description: 'Alias for `roleCatalog` - optional role catalog id as `roleCatalogId` key (backward compatibility)',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;

  @ApiPropertyOptional({
    description: 'Common frontend typo alias: `roleCatelogId` (backward compatibility)',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatelogId?: string;
}
