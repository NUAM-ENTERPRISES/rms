import { IsString } from 'class-validator';

export class UpdateScreeningTemplateDto {
  @IsString()
  templateId!: string;
}
