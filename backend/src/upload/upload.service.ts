import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';
import { PrismaService } from '../database/prisma.service';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private endpoint: string;
  private cdnUrl?: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // DigitalOcean Spaces configuration
    this.bucketName = this.configService.get<string>('DO_SPACES_BUCKET') || '';
    this.region = this.configService.get<string>('DO_SPACES_REGION') || 'blr1';
    this.endpoint = this.configService.get<string>('DO_SPACES_ENDPOINT') || '';
    this.cdnUrl = this.configService.get<string>('DO_SPACES_CDN_URL');

    const accessKeyId = this.configService.get<string>('DO_SPACES_KEY') || '';
    const secretAccessKey =
      this.configService.get<string>('DO_SPACES_SECRET') || '';

    // Initialize S3 client (DigitalOcean Spaces is S3-compatible)
    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style URLs
    });
  }

  /**
   * Validate file type and size
   */
  private validateFile(
    file: Express.Multer.File,
    allowedMimeTypes: string[],
    maxSizeMB: number,
  ): void {
    // Check mime type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum of ${maxSizeMB}MB`,
      );
    }
  }

  /**
   * Generate unique file name with timestamp and random hash
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
    return `${sanitizedName}-${timestamp}-${randomHash}${ext}`;
  }

  /**
   * Upload file to DigitalOcean Spaces
   * @param file - Multer file object
   * @param folder - Folder path in the bucket (e.g., 'users/profiles', 'candidates/documents')
   * @param allowedMimeTypes - Array of allowed MIME types
   * @param maxSizeMB - Maximum file size in MB
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    allowedMimeTypes: string[],
    maxSizeMB: number,
    customFileName?: string,
  ): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file, allowedMimeTypes, maxSizeMB);

      // Generate unique file name
      const fileName =
        customFileName || this.generateFileName(file.originalname);
      const key = `${folder}/${fileName}`;

      // Upload to Spaces
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ACL: 'public-read', // Make file publicly accessible
        ContentType: file.mimetype,
        CacheControl: 'max-age=31536000', // Cache for 1 year
      });

      await this.s3Client.send(command);

      // Generate file URL (use CDN URL if available, otherwise construct from endpoint)
      const fileUrl = this.cdnUrl
        ? `${this.cdnUrl}/${key}`
        : `${this.endpoint}/${this.bucketName}/${key}`;

      return {
        fileUrl,
        fileName,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Delete file from DigitalOcean Spaces
   * @param fileUrl - Full URL of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract key from URL
      let key: string;
      if (this.cdnUrl && fileUrl.startsWith(this.cdnUrl)) {
        key = fileUrl.replace(`${this.cdnUrl}/`, '');
      } else {
        key = fileUrl.replace(`${this.endpoint}/${this.bucketName}/`, '');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Delete error:', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Get signed URL for private file access
   * @param fileUrl - Full URL of the file
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   */
  async getSignedUrl(
    fileUrl: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      // Extract key from URL
      let key: string;
      if (this.cdnUrl && fileUrl.startsWith(this.cdnUrl)) {
        key = fileUrl.replace(`${this.cdnUrl}/`, '');
      } else {
        key = fileUrl.replace(`${this.endpoint}/${this.bucketName}/`, '');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Signed URL error:', error);
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }

  /**
   * Convert relative path to full URL
   * @param relativePath - Relative path stored in database
   * @returns Full URL for accessing the file
   */
  getFileUrl(relativePath: string): string {
    if (!relativePath) return '';

    // Use CDN URL if available, otherwise construct from endpoint
    return this.cdnUrl
      ? `${this.cdnUrl}/${relativePath}`
      : `${this.endpoint}/${this.bucketName}/${relativePath}`;
  }

  /**
   * Upload profile image (images only, max 5MB)
   */
  async uploadProfileImage(
    file: Express.Multer.File,
    entityType: 'user' | 'candidate',
    entityId: string,
  ): Promise<UploadResult> {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    const folder = `${entityType}s/profiles/${entityId}`;

    // Upload file to storage
    const uploadResult = await this.uploadFile(
      file,
      folder,
      allowedMimeTypes,
      5,
    );

    // Store only the relative path in database (better approach)
    const relativePath = `${folder}/${uploadResult.fileName}`;

    if (entityType === 'user') {
      await this.prisma.user.update({
        where: { id: entityId },
        data: { profileImage: relativePath } as any,
      });
    } else if (entityType === 'candidate') {
      await this.prisma.candidate.update({
        where: { id: entityId },
        data: { profileImage: relativePath } as any,
      });
    }

    return uploadResult;
  }

  /**
   * Upload document (PDFs and images, max 10MB)
   */
  async uploadDocument(
    file: Express.Multer.File,
    candidateId: string,
    docType: string,
  ): Promise<UploadResult> {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    const folder = `candidates/documents/${candidateId}/${docType}`;
    return this.uploadFile(file, folder, allowedMimeTypes, 10);
  }

  /**
   * Upload resume (PDFs only, max 10MB)
   * Saves to Document model with proper naming format
   */
  async uploadResume(
    file: Express.Multer.File,
    candidateId: string,
  ): Promise<UploadResult> {
    const allowedMimeTypes = ['application/pdf'];
    const folder = `candidates/resumes/${candidateId}`;

    // Get candidate details for naming
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { firstName: true, lastName: true },
    });

    if (!candidate) {
      throw new Error(`Candidate with ID ${candidateId} not found`);
    }

    // Generate filename with candidate name and current date
    const candidateName =
      `${candidate.firstName}_${candidate.lastName}`.replace(/\s+/g, '_');
    const currentDate = new Date();
    const dateStr = currentDate
      .toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .replace(/\s+/g, '_')
      .toUpperCase();

    const originalExtension = file.originalname.split('.').pop() || 'pdf';
    const newFileName = `${candidateName}_${dateStr}.${originalExtension}`;

    // Upload file with custom name
    const uploadResult = await this.uploadFile(
      file,
      folder,
      allowedMimeTypes,
      10,
      newFileName,
    );

    // Save to Document model
    await this.prisma.document.create({
      data: {
        candidateId,
        docType: 'resume',
        fileName: newFileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: 'system', // TODO: Get from auth context
        status: 'pending',
      },
    });

    return uploadResult;
  }
}
