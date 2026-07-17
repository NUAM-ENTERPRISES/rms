import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type StoredResumeFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  userId: string;
  expiresAt: number;
};

const TTL_MS = 30 * 60 * 1000;

/**
 * In-memory short-lived store for resume PDFs between parse and create steps.
 */
@Injectable()
export class BulkResumeTempFileStore implements OnModuleDestroy {
  private readonly files = new Map<string, StoredResumeFile>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.evictExpired(), 5 * 60 * 1000);
    // Allow process to exit without waiting on this timer (tests / Nest shutdown)
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.files.clear();
  }

  put(
    userId: string,
    file: Express.Multer.File,
  ): string {
    const draftId = randomUUID();
    this.files.set(draftId, {
      buffer: Buffer.from(file.buffer),
      originalname: file.originalname || 'resume.pdf',
      mimetype: file.mimetype || 'application/pdf',
      size: file.size,
      userId,
      expiresAt: Date.now() + TTL_MS,
    });
    return draftId;
  }

  get(draftId: string, userId: string): StoredResumeFile | undefined {
    const entry = this.files.get(draftId);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.files.delete(draftId);
      return undefined;
    }
    if (entry.userId !== userId) return undefined;
    return entry;
  }

  take(draftId: string, userId: string): StoredResumeFile | undefined {
    const entry = this.get(draftId, userId);
    if (!entry) return undefined;
    this.files.delete(draftId);
    return entry;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.files) {
      if (entry.expiresAt < now) this.files.delete(id);
    }
  }
}
