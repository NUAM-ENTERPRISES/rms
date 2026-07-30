import { Injectable } from '@nestjs/common';

type TempResumeEntry = {
  file: Express.Multer.File;
  fileName: string;
  createdAt: number;
};

@Injectable()
export class BulkResumeTempFileStore {
  private readonly ttlMs = 30 * 60 * 1000;
  private readonly store = new Map<string, TempResumeEntry>();

  set(draftId: string, entry: Omit<TempResumeEntry, 'createdAt'>): void {
    this.cleanupExpired();
    this.store.set(draftId, { ...entry, createdAt: Date.now() });
  }

  get(draftId: string): TempResumeEntry | null {
    this.cleanupExpired();
    const entry = this.store.get(draftId);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(draftId);
      return null;
    }
    return entry;
  }

  delete(draftId: string): void {
    this.store.delete(draftId);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [draftId, entry] of this.store.entries()) {
      if (now - entry.createdAt > this.ttlMs) {
        this.store.delete(draftId);
      }
    }
  }
}
