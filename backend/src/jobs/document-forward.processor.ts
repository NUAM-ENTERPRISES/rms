import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../notifications/email.service';
import { UploadService } from '../upload/upload.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { EmailTemplates } from '../notifications/templates/email.templates';
import { DeliveryMethod } from '../documents/dto/bulk-forward-to-client.dto';
import { SendType } from '../documents/dto/forward-to-client.dto';

@Processor('document-forward')
export class DocumentForwardProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentForwardProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly uploadService: UploadService,
    private readonly googleDriveService: GoogleDriveService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'send-documents':
        return this.handleSingleForward(job);
      case 'bulk-send-documents':
        return this.handleBulkForward(job);
      default:
        // Default to handle legacy jobs without a name (or named 'send-documents' implicitly)
        if (job.data?.historyId) {
          return this.handleSingleForward(job);
        }
        this.logger.warn(`Unknown job name: ${job.name}`);
        return;
    }
  }

  async handleSingleForward(job: Job<any>): Promise<any> {
    const { historyId } = job.data;
    
    const history = await this.prisma.documentForwardHistory.findUnique({
      where: { id: historyId },
      include: {
        candidate: true,
        project: true,
        roleCatalog: true,
      },
    });

    if (!history) {
      this.logger.error(`History record ${historyId} not found`);
      return;
    }

    try {
      this.logger.log(`Processing document forward for candidate ${history.candidateId} to ${history.recipientEmail}`);

      const attachments: any[] = [];
      const documentDetails = history.documentDetails as any[];

      // Download all documents as buffers
      for (const doc of documentDetails) {
        try {
          this.logger.log(`Downloading document for single forward: ${doc.fileName} (${doc.id})`);
          const buffer = await this.uploadService.getFile(doc.fileUrl);
          attachments.push({
            filename: doc.fileName,
            content: buffer,
            contentType: doc.mimeType || 'application/pdf',
          });
        } catch (error) {
          this.logger.error(`Failed to download document ${doc.id}: ${error.message}`);
          throw error;
        }
      }

      // Construct email using template
      const html = EmailTemplates.forwardDocuments({
        candidateName: `${history.candidate.firstName} ${history.candidate.lastName}`,
        projectTitle: history.project.title,
        roleLabel: history.roleCatalog?.label || 'N/A',
        notes: history.notes,
      });

      await this.emailService.sendEmail({
        to: history.recipientEmail,
        cc: history.ccEmails,
        bcc: history.bccEmails,
        subject: `Documents for ${history.candidate.firstName} ${history.candidate.lastName} - ${history.project.title}`,
        html,
        attachments,
      });

      // Update history status
      await this.prisma.documentForwardHistory.update({
        where: { id: historyId },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process document forward ${historyId}: ${error.message}`);
      
      await this.prisma.documentForwardHistory.update({
        where: { id: historyId },
        data: {
          status: 'failed',
          error: error.message,
        },
      });

      throw error;
    }
  }

  async handleBulkForward(job: Job<any>): Promise<any> {
    const { bulkForwardDto, senderId } = job.data;
    const { 
      recipientEmail, 
      cc,
      bcc,
      projectId, 
      notes, 
      selections, 
      deliveryMethod,
      csvUrl,
      csvName 
    } = bulkForwardDto;

    this.logger.log(`Processing bulk forward (${deliveryMethod}) for ${selections.length} candidates to ${recipientEmail}`);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const emailCandidates: Array<{ name: string; role: string }> = [];
    const attachments: any[] = [];

    let gdriveLink: string | undefined;

    try {
      // 0.1 Handle CSV attachment if provided
      if (csvUrl) {
        try {
          this.logger.log(`Downloading CSV attachment for bulk forward: ${csvName || 'batch-summary.csv'} from ${csvUrl}`);
          const buffer = await this.uploadService.getFile(csvUrl);
          attachments.push({
            filename: csvName || 'batch-summary.csv',
            content: buffer,
            contentType: 'text/csv',
          });
          this.logger.log(`Successfully attached CSV to bulk email`);
        } catch (error) {
          this.logger.error(`Failed to download CSV attachment from ${csvUrl}: ${error.message}`);
        }
      }

      // 1. Handle Google Drive setup if requested
      let batchFolderId: string | undefined;
      if (deliveryMethod === DeliveryMethod.GOOGLE_DRIVE) {
        if (!this.googleDriveService.isConfigured()) {
          throw new Error('Google Drive integration is not configured on the server');
        }
        batchFolderId = await this.googleDriveService.createFolder(
          `Batch Submission - ${project.title} - ${new Date().toLocaleDateString()}`
        );
        
        // Also upload CSV to GDrive root folder if it exists
        if (csvUrl) {
          try {
            const buffer = await this.uploadService.getFile(csvUrl);
            await this.googleDriveService.uploadFile(
              batchFolderId,
              csvName || 'batch-summary.csv',
              'text/csv',
              buffer
            );
            this.logger.log(`Successfully uploaded CSV to Google Drive batch folder`);
          } catch (err) {
            this.logger.error(`Failed to upload CSV to Google Drive: ${err.message}`);
          }
        }
      }

      // 2. Process each selection
      for (const selection of selections) {
        const candidate = await this.prisma.candidate.findUnique({ 
          where: { id: selection.candidateId }
        });
        if (!candidate) continue;

        const roleCatalog = selection.roleCatalogId 
          ? await this.prisma.roleCatalog.findUnique({ where: { id: selection.roleCatalogId } })
          : null;
        
        const roleLabel = roleCatalog?.label || 'Specified Role';
        emailCandidates.push({ name: `${candidate.firstName} ${candidate.lastName}`, role: roleLabel });

        // Retrieve documents for this candidate
        const candidateDocsToForward: any[] = [];
        if (selection.sendType === SendType.MERGED) {
          const mergedDoc = await this.prisma.mergedDocument.findFirst({
            where: { candidateId: selection.candidateId, projectId },
            orderBy: { updatedAt: 'desc' },
          });
          if (mergedDoc) candidateDocsToForward.push(mergedDoc);
        } else {
          const docs = await this.prisma.document.findMany({
            where: { id: { in: selection.documentIds || [] }, status: 'verified' }
          });
          candidateDocsToForward.push(...docs);
        }

        // 3. Handle documents (Upload to GDrive or add to combined attachments)
        let candidateFolderId: string | undefined;
        if (batchFolderId) {
          candidateFolderId = await this.googleDriveService.createFolder(
            `${candidate.firstName} ${candidate.lastName} - ${roleLabel}`,
            batchFolderId
          );
        }

        for (const doc of candidateDocsToForward) {
          try {
            const buffer = await this.uploadService.getFile(doc.fileUrl);
            
            if (candidateFolderId) {
              await this.googleDriveService.uploadFile(
                candidateFolderId, 
                doc.fileName, 
                doc.mimeType || 'application/pdf', 
                buffer
              );
            } else if (deliveryMethod === DeliveryMethod.EMAIL_COMBINED) {
              attachments.push({
                filename: `${candidate.firstName}_${candidate.lastName}_${doc.fileName}`,
                content: buffer,
                contentType: doc.mimeType || 'application/pdf',
              });
            }
          } catch (err) {
            this.logger.error(`Failed to process document ${doc.id} for candidate ${candidate.id}: ${err.message}`);
          }
        }

        // 4. Update individual CandidateProject status
        await this.updateCandidateStatus(selection.candidateId, projectId, senderId);
      }

      // 5. Finalize GDrive sharing
      if (batchFolderId) {
        gdriveLink = await this.googleDriveService.shareFolder(batchFolderId, recipientEmail);
      }

      // 6. Send the combined email̦
      const html = EmailTemplates.bulkForwardDocuments({
        projectTitle: project.title,
        candidates: emailCandidates,
        gdriveLink,
        notes,
      });

      await this.emailService.sendEmail({
        to: recipientEmail,
        cc: cc || [],
        bcc: bcc || [],
        subject: `Batch Candidate Submission (${emailCandidates.length}) - ${project.title}`,
        html,
        attachments,
      });

      return { success: true, method: deliveryMethod, count: emailCandidates.length };

    } catch (error) {
      this.logger.error(`Failed to process bulk document forward: ${error.message}`);
      throw error;
    }
  }

  private async updateCandidateStatus(candidateId: string, projectId: string, senderId: string) {
    try {
      const cpm = await this.prisma.candidateProjects.findFirst({
        where: { candidateId, projectId }
      });

      if (cpm) {
        const mainStatus = await this.prisma.candidateProjectMainStatus.findFirst({ where: { name: 'documents' } });
        const subStatus = await this.prisma.candidateProjectSubStatus.findFirst({ where: { name: 'submitted_to_client' } });

        if (mainStatus && subStatus) {
          await this.prisma.candidateProjects.update({
            where: { id: cpm.id },
            data: {
              mainStatusId: mainStatus.id,
              subStatusId: subStatus.id,
              updatedAt: new Date(),
            },
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to update status for candidate ${candidateId}: ${e.message}`);
    }
  }
}
