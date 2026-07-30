import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ResumeTextInput {
  filename: string;
  text: string;
}

export interface OllamaAnalysisResult {
  success: boolean;
  filename: string;
  analysis?: ResumeAnalysis;
  error?: string;
}

/** Shape produced by ollama-node-server's extraction prompt. */
export interface ResumeAnalysis {
  Candidate?: {
    Name?: string | null;
    Email?: string | null;
    Phone?: string | null;
    Location?: string | null;
  };
  Education?: Array<{
    Years?: string | null;
    Institutions?: string[];
    Designations?: string[];
  }>;
  Experience?: Array<{
    Years?: string | null;
    Companies?: string[];
    Designations?: string[];
  }>;
  Skills?: {
    Technical?: string[];
    Soft?: string[];
  };
  Projects?: Array<{ Name?: string | null; Description?: string | null }>;
  Certifications?: string[];
  Languages?: string[];
  Summary?: string | null;
}

@Injectable()
export class OllamaClientService {
  private readonly logger = new Logger(OllamaClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('OLLAMA_NODE_URL') ||
      'http://localhost:8001';
  }

  async analyzeResumes(
    resumes: ResumeTextInput[],
  ): Promise<OllamaAnalysisResult[]> {
    try {
      const response = await axios.post<{
        success: boolean;
        count: number;
        results: OllamaAnalysisResult[];
      }>(
        `${this.baseUrl}/api/v1/resume/analyze`,
        { resumes },
        // Local LLM analysis of up to 20 resumes can take several minutes
        { timeout: 10 * 60 * 1000 },
      );

      return response.data.results ?? [];
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to reach resume analysis service';
      this.logger.error(`Ollama analyze call failed: ${message}`);
      throw new Error(`Resume analysis service error: ${message}`);
    }
  }
}
