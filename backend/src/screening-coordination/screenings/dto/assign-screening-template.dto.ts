import { IsString } from 'class-validator';

export class AssignScreeningTemplateDto {
  @IsString()
  templateId!: string;
}
