import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
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
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
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
    // forcePathStyle: true sends requests to blr1.digitaloceanspaces.com/bucket/key
    // instead of bucket.blr1.digitaloceanspaces.com/key — avoids subdomain DNS failures
    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.syncSpacesCorsConfiguration();
  }

  private async syncSpacesCorsConfiguration(): Promise<void> {
    if (this.configService.get<string>('DO_SPACES_SYNC_CORS') !== 'true') {
      return;
    }

    const corsOrigin = this.configService.get<string>('CORS_ORIGIN');
    if (!corsOrigin?.trim()) {
      this.logger.warn(
        'DO_SPACES_SYNC_CORS is enabled but CORS_ORIGIN is empty; skipping Spaces CORS sync',
      );
      return;
    }

    const allowedOrigins = corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (allowedOrigins.length === 0) {
      return;
    }

    try {
      await this.s3Client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'HEAD', 'POST'],
                AllowedOrigins: allowedOrigins,
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );

      this.logger.log(
        `Synced DigitalOcean Spaces CORS for origins: ${allowedOrigins.join(', ')}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Spaces CORS error';
      this.logger.warn(`Failed to sync DigitalOcean Spaces CORS: ${message}`);
    }
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
   * Upload external buffer to DigitalOcean Spaces
   */
  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    fileName: string,
    mimeType: string,
  ): Promise<UploadResult> {
    try {
      const key = `${folder}/${fileName}`;

      // Upload to Spaces
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ACL: 'public-read',
        ContentType: mimeType,
        CacheControl: 'max-age=31536000',
      });

      await this.s3Client.send(command);

      // Generate file URL
      const fileUrl = this.cdnUrl
        ? `${this.cdnUrl}/${key}`
        : `${this.endpoint}/${this.bucketName}/${key}`;

      return {
        fileUrl,
        fileName,
        fileSize: buffer.length,
        mimeType,
      };
    } catch (error) {
      console.error('Buffer upload error:', error);
      throw new InternalServerErrorException('Failed to upload buffer');
    }
  }

  getIntroductionVideoFolder(candidateId: string): string {
    // Unconfirmed presigned uploads under this prefix can be cleaned up via
    // a DigitalOcean Spaces lifecycle rule (e.g. delete after 24 hours).
    return `candidates/introduction-videos/${candidateId}`;
  }

  getIntroductionVideoStorageKey(
    candidateId: string,
    storageFileName: string,
  ): string {
    return `${this.getIntroductionVideoFolder(candidateId)}/${storageFileName}`;
  }

  getPublicUrlForKey(key: string): string {
    return this.cdnUrl
      ? `${this.cdnUrl}/${key}`
      : `${this.endpoint}/${this.bucketName}/${key}`;
  }

  extractKeyFromUrl(fileUrl: string): string {
    if (this.cdnUrl && fileUrl.startsWith(this.cdnUrl)) {
      return fileUrl.replace(`${this.cdnUrl}/`, '');
    }

    return fileUrl.replace(`${this.endpoint}/${this.bucketName}/`, '');
  }

  async createPresignedPutUrl(
    key: string,
    mimeType: string,
    expiresIn = 3600,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ACL: 'public-read',
        ContentType: mimeType,
        CacheControl: 'max-age=31536000',
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Presigned PUT URL error:', error);
      throw new InternalServerErrorException(
        'Failed to generate presigned upload URL',
      );
    }
  }

  async headObject(
    key: string,
  ): Promise<{ contentLength: number; contentType?: string }> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      return {
        contentLength: response.ContentLength ?? 0,
        contentType: response.ContentType,
      };
    } catch (error) {
      console.error('HeadObject error:', error);
      throw new BadRequestException(
        'Uploaded file was not found in storage. Please upload again.',
      );
    }
  }

  /**
   * Delete file from DigitalOcean Spaces
   * @param fileUrl - Full URL of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);

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
   * Get file from DigitalOcean Spaces as a Buffer
   */
  async getFile(fileUrl: string): Promise<Buffer> {
    try {
      // Extract key from URL
      // If using CDN: https://cdn.example.com/folder/file.pdf -> folder/file.pdf
      // If using endpoint: https://bucket.endpoint/folder/file.pdf -> folder/file.pdf
      let key = '';
      if (this.cdnUrl && fileUrl.startsWith(this.cdnUrl)) {
        key = fileUrl.replace(`${this.cdnUrl}/`, '');
      } else {
        // Fallback or general case
        const urlObj = new URL(fileUrl);
        // The pathname usually starts with /bucketName/ if it's the endpoint URL
        // or just / if it's a subdomain or CDN
        key = urlObj.pathname.startsWith(`/${this.bucketName}/`)
          ? urlObj.pathname.replace(`/${this.bucketName}/`, '')
          : urlObj.pathname.substring(1);
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body as any;
      
      return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      console.error('Error fetching file from S3:', error);
      throw new InternalServerErrorException(`Failed to retrieve file: ${fileUrl}`);
    }
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
    // const relativePath = `${folder}/${uploadResult.fileName}`;
    const relativePath = uploadResult.fileUrl;

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
   * Upload profile image from base64 string
   */
  async uploadProfileImageBase64(
    base64String: string,
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

    // Extract MIME type and data from base64 string
    // Format: "data:image/jpeg;base64,/9j/4QAYRXhp..."
    const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new BadRequestException('Invalid base64 image string');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const fileSize = buffer.length;

    // Check file size (5MB max)
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum of ${maxSizeMB}MB`,
      );
    }

    // Mock a Multer.File object to reuse uploadFile logic
    const mockFile = {
      buffer,
      mimetype: mimeType,
      originalname: `profile-${entityId}.${mimeType.split('/')[1]}`,
      size: fileSize,
    } as Express.Multer.File;

    return this.uploadProfileImage(mockFile, entityType, entityId);
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
      'text/csv',
      'application/vnd.ms-excel',
      'text/plain',
    ];
    const folder = `candidates/documents/${candidateId}/${docType}`;
    const safeDocType = docType.replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const extension = file.originalname.split(".").pop() || "bin";
    const customFileName = `${safeDocType}_${timestamp}_${randomSuffix}.${extension}`;
    return this.uploadFile(
      file,
      folder,
      allowedMimeTypes,
      20,
      customFileName,
    );
  }

  /**
   * Upload candidate introduction video (videos only, max 100MB)
   */
  async uploadIntroductionVideo(
    file: Express.Multer.File,
    candidateId: string,
    customFileName?: string,
  ): Promise<UploadResult> {
    const allowedMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ];
    const folder = `candidates/introduction-videos/${candidateId}`;
    return this.uploadFile(file, folder, allowedMimeTypes, 100, customFileName);
  }

  /**
   * Upload resume (PDFs only, max 10MB)
   * Saves to Document model with proper naming format
   */
  async uploadResume(
    file: Express.Multer.File,
    candidateId: string,
    roleCatalogId?: string,
    docName?: string,
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

    // NOTE: Temporarily using the original uploaded file name directly.
    // Custom resume file naming is intentionally commented out as requested.
    //
    // const candidateName =
    //   `${candidate.firstName}_${candidate.lastName}`.replace(/\s+/g, '_');
    // const currentDate = new Date();
    // const dateStr = currentDate
    //   .toLocaleDateString('en-GB', {
    //     day: '2-digit',
    //     month: 'short',
    //     year: 'numeric',
    //   })
    //   .replace(/\s+/g, '_')
    //   .toUpperCase();
    // const timeStr = [
    //   String(currentDate.getHours()).padStart(2, '0'),
    //   String(currentDate.getMinutes()).padStart(2, '0'),
    //   String(currentDate.getSeconds()).padStart(2, '0'),
    // ].join('');
    // const originalExtension = file.originalname.split('.').pop() || 'pdf';
    // const newFileName = `${candidateName}_${dateStr}_${timeStr}.${originalExtension}`;
    const newFileName = file.originalname;

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
        docName: docName || null,
        fileName: newFileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        roleCatalogId: roleCatalogId || null,
        uploadedBy: 'system', // TODO: Get from auth context
        status: 'pending',
      },
    });

    return uploadResult;
  }
  
}
