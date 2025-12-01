import { IsString } from 'class-validator';

export class UpdateMockInterviewTemplateDto {
  @IsString()
  templateId!: string;
}
