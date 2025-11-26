import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryMockInterviewTemplatesDto {
  @ApiProperty({
    description: 'Filter by role ID',
    example: 'ckx7r1234abcd',
    required: false,
  })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiProperty({
    description: 'Filter by active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
