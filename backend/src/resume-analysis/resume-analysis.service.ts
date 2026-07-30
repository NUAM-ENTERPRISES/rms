import { Injectable, Logger } from '@nestjs/common';
import { PdfExtractService } from './pdf-extract.service';
import {
  OllamaClientService,
  OllamaAnalysisResult,
  ResumeAnalysis,
} from './ollama-client.service';

export interface WorkExperienceDraft {
  companyName: string | null;
  jobTitle: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface EducationHint {
  years: string | null;
  institutions: string[];
  designations: string[];
}

export interface CandidateDraft {
  firstName: string;
  lastName: string;
  email: string | null;
  countryCode: string | null;
  mobileNumber: string | null;
  location: string | null;
  skills: string[];
  certifications: string[];
  languages: string[];
  summary: string | null;
  workExperiences: WorkExperienceDraft[];
  educationHints: EducationHint[];
}

export interface AnalyzeDraftResult {
  filename: string;
  success: boolean;
  error?: string;
  draft?: CandidateDraft;
  analysis?: ResumeAnalysis;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

@Injectable()
export class ResumeAnalysisService {
  private readonly logger = new Logger(ResumeAnalysisService.name);

  constructor(
    private readonly pdfExtractService: PdfExtractService,
    private readonly ollamaClientService: OllamaClientService,
  ) {}

  /**
   * Extract text from each PDF, send texts to the ollama analysis service,
   * and map AI analyses into editable candidate drafts for the review UI.
   */
  async analyzeFiles(
    files: Express.Multer.File[],
  ): Promise<AnalyzeDraftResult[]> {
    const extracted: Array<{
      filename: string;
      text?: string;
      error?: string;
    }> = [];

    for (const file of files) {
      try {
        const text = await this.pdfExtractService.extractText(file.buffer);
        if (!text.trim()) {
          extracted.push({
            filename: file.originalname,
            error: 'No text could be extracted from this PDF',
          });
        } else {
          extracted.push({ filename: file.originalname, text });
        }
      } catch (error) {
        extracted.push({
          filename: file.originalname,
          error:
            error instanceof Error ? error.message : 'PDF extraction failed',
        });
      }
    }

    const analyzable = extracted.filter((e) => e.text);
    let aiResults: OllamaAnalysisResult[] = [];
    if (analyzable.length > 0) {
      aiResults = await this.ollamaClientService.analyzeResumes(
        analyzable.map((e) => ({ filename: e.filename, text: e.text! })),
      );
    }

    // Keep original upload order; match AI results by position among analyzable items
    let aiIndex = 0;
    return extracted.map((item): AnalyzeDraftResult => {
      if (item.error) {
        return { filename: item.filename, success: false, error: item.error };
      }
      const aiResult = aiResults[aiIndex++];
      if (!aiResult || !aiResult.success || !aiResult.analysis) {
        return {
          filename: item.filename,
          success: false,
          error: aiResult?.error || 'AI analysis failed',
        };
      }
      return {
        filename: item.filename,
        success: true,
        draft: this.mapAnalysisToDraft(aiResult.analysis),
        analysis: aiResult.analysis,
      };
    });
  }

  private mapAnalysisToDraft(analysis: ResumeAnalysis): CandidateDraft {
    const fullName = (analysis.Candidate?.Name ?? '').trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const phone = this.parsePhone(analysis.Candidate?.Phone ?? null);

    const skills = [
      ...(analysis.Skills?.Technical ?? []),
      ...(analysis.Skills?.Soft ?? []),
    ]
      .map((s) => (s ?? '').trim())
      .filter(Boolean);

    return {
      firstName: firstName ?? '',
      lastName: rest.join(' '),
      email: analysis.Candidate?.Email?.trim() || null,
      countryCode: phone.countryCode,
      mobileNumber: phone.mobileNumber,
      location: analysis.Candidate?.Location?.trim() || null,
      skills: Array.from(new Set(skills)),
      certifications: (analysis.Certifications ?? []).filter(Boolean),
      languages: (analysis.Languages ?? []).filter(Boolean),
      summary: analysis.Summary?.trim() || null,
      workExperiences: (analysis.Experience ?? []).map((exp) =>
        this.mapExperience(exp),
      ),
      educationHints: (analysis.Education ?? []).map((edu) => ({
        years: edu.Years ?? null,
        institutions: edu.Institutions ?? [],
        designations: edu.Designations ?? [],
      })),
    };
  }

  private mapExperience(exp: {
    Years?: string | null;
    Companies?: string[];
    Designations?: string[];
  }): WorkExperienceDraft {
    const range = this.parseYearRange(exp.Years ?? null);
    return {
      companyName: exp.Companies?.[0]?.trim() || null,
      jobTitle: exp.Designations?.[0]?.trim() || null,
      startDate: range.startDate,
      endDate: range.endDate,
      isCurrent: range.isCurrent,
    };
  }

  /**
   * Parse strings like "2018-2022", "May 2021 – Present",
   * "June 2020 – August 2020", "2022-Present" into ISO dates.
   */
  private parseYearRange(years: string | null): {
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
  } {
    if (!years) return { startDate: null, endDate: null, isCurrent: false };

    const parts = years.split(/\s*(?:–|—|-|to)\s*/i).filter(Boolean);
    const startDate = this.parseDateToken(parts[0]);
    const endToken = parts[1] ?? '';
    const isCurrent = /present|current|now/i.test(endToken);
    const endDate = isCurrent ? null : this.parseDateToken(endToken);

    return { startDate, endDate, isCurrent };
  }

  private parseDateToken(token: string | undefined): string | null {
    if (!token) return null;
    const trimmed = token.trim();

    const monthYear = trimmed.match(/([A-Za-z]+)\s+(\d{4})/);
    if (monthYear) {
      const month = MONTHS[monthYear[1].slice(0, 3).toLowerCase()];
      if (month !== undefined) {
        return new Date(Date.UTC(Number(monthYear[2]), month, 1))
          .toISOString()
          .slice(0, 10);
      }
    }

    const yearOnly = trimmed.match(/(\d{4})/);
    if (yearOnly) {
      return new Date(Date.UTC(Number(yearOnly[1]), 0, 1))
        .toISOString()
        .slice(0, 10);
    }

    return null;
  }

  /** Best-effort split of a raw phone into dial code + national number. */
  private parsePhone(raw: string | null): {
    countryCode: string | null;
    mobileNumber: string | null;
  } {
    if (!raw) return { countryCode: null, mobileNumber: null };

    const cleaned = raw.replace(/[\s\-().]/g, '');
    const withPlus = cleaned.match(/^\+(\d{1,4})(\d{6,15})$/);
    if (withPlus) {
      // Dial codes are 1-3 digits; prefer common splits (e.g. +91 XXXXXXXXXX)
      const digits = withPlus[1] + withPlus[2];
      for (const codeLen of [2, 1, 3]) {
        const code = digits.slice(0, codeLen);
        const number = digits.slice(codeLen);
        if (number.length >= 6 && number.length <= 15) {
          return { countryCode: `+${code}`, mobileNumber: number };
        }
      }
    }

    const bare = cleaned.match(/^(\d{6,15})$/);
    if (bare) {
      return { countryCode: null, mobileNumber: bare[1] };
    }

    return { countryCode: null, mobileNumber: null };
  }
}
