import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OriginalDocumentCollectionSyncService {
  private readonly logger = new Logger(
    OriginalDocumentCollectionSyncService.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sync newly received doc types from all intake events on a collection
   * into active processing document_received steps for the candidate.
   */
  async syncCollectionToProcessing(
    collectionId: string,
    userId: string,
  ): Promise<{ syncedDocTypes: string[] }> {
    const collection = await this.prisma.originalDocumentCollection.findUnique({
      where: { id: collectionId },
      include: {
        events: {
          include: { items: true },
          orderBy: { collectedAt: 'asc' },
        },
        mergedDocument: true,
        syncLogs: true,
      },
    });

    if (!collection) {
      return { syncedDocTypes: [] };
    }

    const docTypesToSync = await this.getNewlyReceivedDocTypes(collection);
    if (docTypesToSync.length === 0) {
      return { syncedDocTypes: [] };
    }

    const processingCandidates = await this.prisma.processingCandidate.findMany({
      where: {
        candidateId: collection.candidateId,
        processingStatus: { in: ['assigned', 'in_progress'] },
      },
    });

    const documentReceivedTemplate =
      await this.prisma.processingStepTemplate.findUnique({
        where: { key: 'document_received' },
      });

    if (!documentReceivedTemplate) {
      this.logger.warn('document_received template not found — skipping sync');
      return { syncedDocTypes: [] };
    }

    const syncedDocTypes: string[] = [];
    const latestEventAt =
      collection.events[collection.events.length - 1]?.collectedAt ??
      new Date();

    for (const pc of processingCandidates) {
      const step = await this.prisma.processingStep.findFirst({
        where: {
          processingCandidateId: pc.id,
          templateId: documentReceivedTemplate.id,
          status: { notIn: ['completed', 'rejected', 'cancelled'] },
        },
      });

      if (!step) continue;

      const candidateProjectMap = await this.prisma.candidateProjects.findFirst({
        where: {
          candidateId: pc.candidateId,
          projectId: pc.projectId,
          roleNeededId: pc.roleNeededId,
        },
      });

      if (!candidateProjectMap) continue;

      for (const docType of docTypesToSync) {
        const synced = await this.syncDocTypeForStep({
          docType,
          collection: {
            candidateId: collection.candidateId,
            collectedAt: latestEventAt,
            mergedDocument: collection.mergedDocument,
          },
          stepId: step.id,
          candidateProjectMapId: candidateProjectMap.id,
          userId,
        });
        if (synced && !syncedDocTypes.includes(docType)) {
          syncedDocTypes.push(docType);
        }
      }

      await this.prisma.processingHistory.create({
        data: {
          processingCandidateId: pc.id,
          status: step.status,
          step: 'document_received',
          changedById: userId,
          notes: `Original documents received via DCE intake (collection ${collectionId})`,
        },
      });
    }

    if (syncedDocTypes.length > 0) {
      await this.prisma.originalDocumentCollectionSyncLog.createMany({
        data: syncedDocTypes.map((docType) => ({
          collectionId,
          docType,
          syncedByUserId: userId,
        })),
        skipDuplicates: true,
      });
    }

    return { syncedDocTypes };
  }

  private async getNewlyReceivedDocTypes(collection: {
    id: string;
    events: Array<{
      items: Array<{ docType: string; isReceived: boolean }>;
    }>;
    syncLogs: Array<{ docType: string }>;
  }): Promise<string[]> {
    const currentReceived = new Set<string>();
    for (const event of collection.events) {
      for (const item of event.items) {
        if (item.isReceived) {
          currentReceived.add(item.docType);
        }
      }
    }

    const previouslySynced = new Set(
      collection.syncLogs.map((log) => log.docType),
    );

    return Array.from(currentReceived).filter(
      (docType) => !previouslySynced.has(docType),
    );
  }

  private async syncDocTypeForStep(params: {
    docType: string;
    collection: {
      candidateId: string;
      collectedAt: Date;
      mergedDocument: {
        id: string;
        fileName: string;
        fileUrl: string;
        fileSize: number | null;
        mimeType: string | null;
        uploadedBy: string;
      } | null;
    };
    stepId: string;
    candidateProjectMapId: string;
    userId: string;
  }): Promise<boolean> {
    const { docType, collection, stepId, candidateProjectMapId, userId } =
      params;

    let document = await this.prisma.document.findFirst({
      where: {
        candidateId: collection.candidateId,
        docType,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!document && collection.mergedDocument) {
      const merged = collection.mergedDocument;
      document = await this.prisma.document.create({
        data: {
          candidateId: collection.candidateId,
          docType,
          fileName: merged.fileName,
          fileUrl: merged.fileUrl,
          fileSize: merged.fileSize ?? undefined,
          mimeType: merged.mimeType ?? 'application/pdf',
          uploadedBy: merged.uploadedBy,
          status: 'pending',
          notes: 'Physical original received via DCE intake',
        },
      });
    }

    if (!document) {
      return false;
    }

    let verification =
      await this.prisma.candidateProjectDocumentVerification.findUnique({
        where: {
          candidateProjectMapId_documentId: {
            candidateProjectMapId,
            documentId: document.id,
          },
        },
      });

    if (!verification) {
      verification = await this.prisma.candidateProjectDocumentVerification.create({
        data: {
          candidateProjectMapId,
          documentId: document.id,
          status: 'pending',
          receivedAt: collection.collectedAt,
          notes: 'Physical original received via DCE intake',
        },
      });
    } else if (!verification.receivedAt) {
      verification = await this.prisma.candidateProjectDocumentVerification.update({
        where: { id: verification.id },
        data: {
          receivedAt: collection.collectedAt,
          isDeleted: false,
          deletedAt: null,
        },
      });
    }

    const existingStepDoc = await this.prisma.processingStepDocument.findFirst({
      where: {
        processingStepId: stepId,
        candidateProjectDocumentVerificationId: verification.id,
      },
    });

    if (!existingStepDoc) {
      await this.prisma.processingStepDocument.create({
        data: {
          processingStepId: stepId,
          candidateProjectDocumentVerificationId: verification.id,
          uploadedBy: userId,
          status: 'pending',
          notes: 'Linked via DCE original document intake',
        },
      });
    }

    return true;
  }
}
