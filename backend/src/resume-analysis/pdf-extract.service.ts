import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfExtractService {
  private readonly logger = new Logger(PdfExtractService.name);

  /**
   * Extract plain text from a PDF buffer.
   * Strips control characters that break JSON serialization downstream.
   */
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return result.text.replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
        ' ',
      );
    } catch (error) {
      this.logger.error(`PDF text extraction failed: ${error}`);
      throw new Error(
        `Failed to extract text from PDF: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
