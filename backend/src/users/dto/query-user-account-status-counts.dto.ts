import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUserAccountStatusCountsDto {
  @ApiPropertyOptional({
    description: 'Search term for name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;
}
