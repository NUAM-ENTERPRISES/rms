import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({
    description: 'User ID to assign the role to',
    example: 'cmefutl1z0009u5s1o67xpnkn',
  })
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId!: string;

  @ApiProperty({
    description: 'Role ID to assign',
    example: 'cmefutl1z0009u5s1o67xpnkn',
  })
  @IsString({ message: 'Role ID must be a string' })
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId!: string;
}
