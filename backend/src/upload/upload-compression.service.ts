import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { compressPdfToTarget } from './pdf-compressor';

@Injectable()
export class UploadCompressionService {
  private readonly logger = new Logger(UploadCompressionService.name);

  /**
   * Compress file buffer when it exceeds targetMaxBytes (images/PDF).
   * Images use sharp; PDFs use qpdf-compress (output stays PDF).
   */
  async prepareFile(
    file: Express.Multer.File,
    targetMaxBytes: number,
    docTypeLabel?: string,
  ): Promise<Express.Multer.File> {
    if (file.size <= targetMaxBytes) {
      return file;
    }

    const label = docTypeLabel ?? 'document';
    const targetMb = (targetMaxBytes / (1024 * 1024)).toFixed(1);
    const actualMb = (file.size / (1024 * 1024)).toFixed(1);

    if (file.mimetype.startsWith('image/')) {
      return this.compressImage(file, targetMaxBytes, label, actualMb, targetMb);
    }

    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      return this.compressPdf(file, targetMaxBytes, label, actualMb, targetMb);
    }

    throw new BadRequestException(
      `File is too large (${actualMb} MB). Maximum for ${label} is ${targetMb} MB. Please export a smaller file.`,
    );
  }

  private async compressImage(
    file: Express.Multer.File,
    targetMaxBytes: number,
    label: string,
    actualMb: string,
    targetMb: string,
  ): Promise<Express.Multer.File> {
    const qualities = [85, 70, 55, 40, 30];
    const widths = [2400, 1920, 1600, 1280, 1024];

    let best = file.buffer;

    for (let i = 0; i < qualities.length; i++) {
      try {
        const out = await sharp(file.buffer)
          .rotate()
          .resize({
            width: widths[i],
            height: widths[i],
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: qualities[i], mozjpeg: true })
          .toBuffer();

        best = out;
        if (out.length <= targetMaxBytes) {
          this.logger.log(
            `Compressed image ${file.originalname}: ${file.size} -> ${out.length} bytes`,
          );
          return this.toMulterFile(file, out, 'image/jpeg', '.jpg');
        }
      } catch (err) {
        this.logger.warn(`Image compress pass ${i} failed: ${err}`);
      }
    }

    if (best.length <= targetMaxBytes) {
      return this.toMulterFile(file, best, 'image/jpeg', '.jpg');
    }

    throw new BadRequestException(
      `Could not compress image below ${targetMb} MB (was ${actualMb} MB) for ${label}. Please use a smaller image.`,
    );
  }

  private async compressPdf(
    file: Express.Multer.File,
    targetMaxBytes: number,
    label: string,
    actualMb: string,
    targetMb: string,
  ): Promise<Express.Multer.File> {
    try {
      const { buffer, wasCompressed, originalSize } = await compressPdfToTarget(
        file.buffer,
        targetMaxBytes,
      );

      if (buffer.length <= targetMaxBytes) {
        if (wasCompressed) {
          this.logger.log(
            `Compressed PDF ${file.originalname}: ${originalSize} -> ${buffer.length} bytes`,
          );
        }
        return this.toMulterFile(
          file,
          buffer,
          'application/pdf',
          '.pdf',
        );
      }
    } catch (err) {
      this.logger.error(`PDF compression failed for ${file.originalname}`, err);
    }

    throw new BadRequestException(
      `Could not compress PDF below ${targetMb} MB (uploaded ${actualMb} MB) for ${label}. Try exporting a smaller PDF or reducing scan quality.`,
    );
  }

  private toMulterFile(
    original: Express.Multer.File,
    buffer: Buffer,
    mimeType: string,
    ext: string,
  ): Express.Multer.File {
    const base =
      original.originalname.replace(/\.[^.]+$/, '') || 'document';
    const originalname = `${base}${ext}`;
    return {
      ...original,
      buffer,
      size: buffer.length,
      mimetype: mimeType,
      originalname,
    };
  }
}
