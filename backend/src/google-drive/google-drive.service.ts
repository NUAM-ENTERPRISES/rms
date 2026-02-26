import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Readable } from 'stream';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: any;

  constructor(private configService: ConfigService) {
    const clientEmail = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKey = this.configService.get<string>('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      try {
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
        this.drive = google.drive({ version: 'v3', auth });
        this.logger.log('Google Drive Service initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Google Drive Service', error);
      }
    } else {
      this.logger.warn('Google Drive credentials not fully configured. Service Account Email or Private Key is missing.');
    }
  }

  isConfigured(): boolean {
    return !!this.drive;
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    if (!this.drive) {
      throw new Error('Google Drive is not configured. Check your environment variables.');
    }

    const defaultParent = this.configService.get<string>('GOOGLE_DRIVE_PARENT_FOLDER_ID');
    const parents = parentId ? [parentId] : (defaultParent ? [defaultParent] : []);

    try {
      const response = await this.drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parents.length > 0 ? parents : undefined,
        },
        fields: 'id',
      });

      return response.data.id;
    } catch (error: any) {
      if (error.message.includes('File not found')) {
        const email = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
        this.logger.error(`
          ERROR: Parent folder not found or not accessible. 
          FOLDER ID: ${parents[0]}
          SERVICE ACCOUNT EMAIL: ${email}
          ACTION REQUIRED: Go to Google Drive and 'Share' this folder with the email above as an Editor.
        `);
      } else {
        this.logger.error(`Error creating folder "${name}": ${error.message}`);
      }
      throw error;
    }
  }

  async uploadFile(
    folderId: string,
    fileName: string,
    mimeType: string,
    content: Readable | Buffer,
  ): Promise<string> {
    if (!this.drive) {
      throw new Error('Google Drive is not configured.');
    }

    const body = content instanceof Buffer ? Readable.from(content) : content;

    try {
      const response = await this.drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body,
        },
        fields: 'id, webViewLink',
      });

      return response.data.webViewLink;
    } catch (error: any) {
      if (error.message.includes('storage quota')) {
        this.logger.error(`
          ERROR: Service Account has no storage quota. 
          SOLUTION: You MUST use a "Shared Drive" (Team Drive) for this to work.
          STEPS:
          1. Create a "Shared Drive" in your Google Drive (requires Workspace).
          2. Share that Shared Drive with the Service Account email.
          3. Use the ID of a folder inside that Shared Drive as GOOGLE_DRIVE_PARENT_FOLDER_ID.
          (Personal Gmail accounts do NOT support Shared Drives; use a Workspace account instead.)
        `);
      } else {
        this.logger.error(`Error uploading file "${fileName}": ${error.message}`);
      }
      throw error;
    }
  }

  async shareFolder(folderId: string, recipientEmail?: string): Promise<string> {
    if (!this.drive) {
      throw new Error('Google Drive is not configured.');
    }

    try {
      if (recipientEmail) {
        await this.drive.permissions.create({
          fileId: folderId,
          supportsAllDrives: true,
          requestBody: {
            role: 'reader',
            type: 'user',
            emailAddress: recipientEmail,
          },
        });
        this.logger.log(`Shared folder ${folderId} with ${recipientEmail}`);
      } else {
        await this.drive.permissions.create({
          fileId: folderId,
          supportsAllDrives: true,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
        this.logger.log(`Shared folder ${folderId} with anyone with the link`);
      }

      const response = await this.drive.files.get({
        fileId: folderId,
        supportsAllDrives: true,
        fields: 'webViewLink',
      });

      return response.data.webViewLink;
    } catch (error: any) {
      this.logger.error(`Error sharing folder ${folderId}: ${error.message}`);
      throw error;
    }
  }
}
