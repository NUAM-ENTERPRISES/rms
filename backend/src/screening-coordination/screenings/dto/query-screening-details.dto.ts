import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QueryScreeningDetailsDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsNotEmpty()
  @IsString()
  candidateId: string;

  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Role Catalog ID' })
  @IsNotEmpty()
  @IsString()
  roleCatalogId: string;
}
