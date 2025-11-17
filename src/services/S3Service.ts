import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { Logger } from '../utils/Logger';
import crypto from 'crypto';

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'drilling-management-photos';
    
    // In Lambda, AWS SDK automatically uses IAM role credentials
    // For local development, use explicit credentials from .env
    const s3Config: any = {
      region: process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1'
    };
    
    // Only set explicit credentials if not running in Lambda (local development)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    }
    
    this.s3Client = new S3Client(s3Config);
  }

  /**
   * Upload a file to S3
   * @param file - File buffer
   * @param fileName - Original file name
   * @param mimeType - File MIME type
   * @param folder - S3 folder path
   * @returns S3 object key and URL
   */
  async uploadFile(
    file: Buffer, 
    fileName: string, 
    mimeType: string, 
    folder: string = 'drill-holes'
  ): Promise<{ key: string; url: string }> {
    try {
      // Generate unique file name
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
      const key = `${folder}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString()
        }
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${process.env.APP_AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

      Logger.info(`File uploaded to S3: ${key}`);
      return { key, url };

    } catch (error) {
      Logger.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  /**
   * Upload multiple files to S3
   * @param files - Array of file objects
   * @param folder - S3 folder path
   * @returns Array of uploaded file info
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string; mimetype: string }>,
    folder: string = 'drill-holes'
  ): Promise<Array<{ key: string; url: string; originalName: string }>> {
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await this.uploadFile(file.buffer, file.filename, file.mimetype, folder);
        return {
          ...result,
          originalName: file.filename
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      Logger.error('Multiple file upload error:', error);
      throw new Error(`Failed to upload files to S3: ${error}`);
    }
  }

  /**
   * Delete a file from S3
   * @param key - S3 object key
   * @returns Boolean indicating success
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
      Logger.info(`File deleted from S3: ${key}`);
      return true;

    } catch (error) {
      Logger.error('S3 delete error:', error);
      return false;
    }
  }

  /**
   * Generate a presigned URL for file access
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;

    } catch (error) {
      Logger.error('Presigned URL generation error:', error);
      throw new Error(`Failed to generate presigned URL: ${error}`);
    }
  }

  /**
   * Delete multiple files from S3
   * @param keys - Array of S3 object keys
   * @returns Array of deletion results
   */
  async deleteMultipleFiles(keys: string[]): Promise<Array<{ key: string; success: boolean }>> {
    const deletePromises = keys.map(async (key) => {
      const success = await this.deleteFile(key);
      return { key, success };
    });

    return await Promise.all(deletePromises);
  }
}

export default S3Service;