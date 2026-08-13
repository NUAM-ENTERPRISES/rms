import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { RecruiterProfessionScope } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiPropertyOptional({
    description:
      'Recruiter sector scope used with profession coverage (required for Recruiter role)',
    enum: RecruiterProfessionScope,
    example: RecruiterProfessionScope.HEALTHCARE,
  })
  @IsOptional()
  @IsEnum(RecruiterProfessionScope)
  recruiterSectorScope?: RecruiterProfessionScope;

  @ApiPropertyOptional({
    description:
      'When true, recruiter handles all professions in recruiterSectorScope (including future catalog entries). Mutually exclusive with explicit professionTypeIds.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  handlesAllProfessions?: boolean;
}
