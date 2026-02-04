import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../notifications/email.service';
import { UploadService } from '../upload/upload.service';
import { EmailTemplates } from '../notifications/templates/email.templates';

@Processor('document-forward')
export class DocumentForwardProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentForwardProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly uploadService: UploadService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
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

      // Add Logo as CID attachment if it exists
      const logoPath = path.join(process.cwd(), 'src/assets/logo/logo.png');
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          content: fs.readFileSync(logoPath),
          cid: 'logo' // This matches <img src="cid:logo"> in the template
        });
      }

      // Download all documents as buffers
      for (const doc of documentDetails) {
        try {
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
}
