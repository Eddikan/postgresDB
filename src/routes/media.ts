import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware';
import { S3Service } from '../services/S3Service';
import { Logger } from '../utils/Logger';
import Media, { MediaType } from '../models/media.model';
import formidable from 'formidable';
import fs from 'fs';

/**
 * Media upload routes - Handle file uploads separately from form data
 */
export async function mediaRoutes(fastify: FastifyInstance) {
  const s3Service = new S3Service();

  /**
   * POST /media/test - Test multipart parsing
   */
  fastify.post('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      Logger.info('=== MULTIPART TEST REQUEST ===');
      return reply.status(200).send({
        message: 'Multipart content type accepted',
        contentType: request.headers['content-type']
      });
    } catch (error: any) {
      Logger.error('Test error:', error);
      return reply.status(500).send({
        error: 'Test failed',
        details: error.message
      });
    }
  });

  /**
   * POST /media/upload - Upload images to S3
   * Accepts multipart/form-data with 'type' field and image file
   * Returns media ID and URL
   */
  fastify.post('/upload', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      Logger.info('=== MEDIA UPLOAD REQUEST STARTED ===');
      
      // Create formidable form parser
      const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        allowEmptyFiles: false,
        keepExtensions: true,
        filter: ({ mimetype }) => {
          // Only allow image files
          return Boolean(mimetype && mimetype.startsWith('image/'));
        }
      });

      // Parse the form data
      const [fields, files] = await form.parse(request.raw);
      
      Logger.info('Form parsing completed');
      Logger.info('Fields received:', fields);
      Logger.info('Files received:', Object.keys(files));

      // Extract type field
      const typeField = fields.type;
      const mediaType = Array.isArray(typeField) ? typeField[0] : typeField;
      
      if (!mediaType) {
        return reply.status(400).send({
          error: 'Missing required field: type. Please specify the media type (e.g., DRILL_HOLE).'
        });
      }

      if (!Object.values(MediaType).includes(mediaType as MediaType)) {
        return reply.status(400).send({
          error: `Invalid media type. Must be one of: ${Object.values(MediaType).join(', ')}`
        });
      }

      // Extract file
      const fileFields = Object.keys(files);
      if (fileFields.length === 0) {
        return reply.status(400).send({
          error: 'No image file provided. Please upload exactly one image file.'
        });
      }

      const fileKey = fileFields[0];
      const uploadedFiles = files[fileKey];
      const file = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;

      if (!file) {
        return reply.status(400).send({
          error: 'No valid file received.'
        });
      }

      Logger.info(`Processing file: ${file.originalFilename} (${file.mimetype}) - Size: ${file.size} bytes`);

      // Read file buffer
      const buffer = await fs.promises.readFile(file.filepath);
      
      if (buffer.length === 0) {
        return reply.status(400).send({
          error: 'Empty file received. Please upload a valid image file.'
        });
      }

      // Get authenticated user
      const user = request.userProfile;
      if (!user || !user.organisationId) {
        return reply.status(403).send({
          error: 'User organisation not found'
        });
      }

      // Upload to S3
      Logger.info('Uploading to S3...');
      const uploadResult = await s3Service.uploadFile(
        buffer,
        file.originalFilename || 'unknown.jpg',
        file.mimetype || 'image/jpeg',
        'drill-holes'
      );
      
      Logger.info(`Upload successful: ${uploadResult.url}`);

      // Save media record to database
      const mediaRecord = await Media.create({
        url: uploadResult.url,
        type: mediaType as MediaType,
        filename: file.originalFilename || 'unknown.jpg',
        mimetype: file.mimetype || 'image/jpeg',
        size: file.size,
        s3Key: uploadResult.key,
        uploadedBy: user.id,
        organisationId: user.organisationId
      });

      Logger.info(`Media record saved to database: ${mediaRecord.id}`);

      // Clean up temporary file
      try {
        await fs.promises.unlink(file.filepath);
        Logger.info('Temporary file cleaned up');
      } catch (cleanupError) {
        Logger.error('Failed to cleanup temporary file:', cleanupError);
      }

      return reply.status(200).send({
        message: 'Media uploaded successfully',
        data: {
          id: mediaRecord.id,
          url: mediaRecord.url,
          type: mediaRecord.type,
          filename: mediaRecord.filename,
          mimetype: mediaRecord.mimetype,
          size: mediaRecord.size,
          s3Key: mediaRecord.s3Key,
          uploadedAt: mediaRecord.createdAt.toISOString()
        }
      });

    } catch (error: any) {
      Logger.error('Media upload error:', error);
      
      // Handle formidable specific errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return reply.status(400).send({
          error: 'File too large. Maximum size is 10MB.'
        });
      }
      
      if (error.code === 'LIMIT_FILE_TYPE') {
        return reply.status(400).send({
          error: 'Invalid file type. Only image files are allowed.'
        });
      }

      return reply.status(500).send({
        error: 'Failed to upload media file',
        details: error.message
      });
    }
  });

  /**
   * DELETE /media/delete - Delete media files by IDs
   * Query parameter: ids (comma-separated list of media IDs)
   * Example: /media/delete?ids=id1,id2,id3
   */
  fastify.delete('/delete', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      Logger.info('=== MEDIA DELETE REQUEST STARTED ===');
      
      const query = request.query as { ids?: string };
      
      if (!query.ids || query.ids.trim() === '') {
        return reply.status(400).send({
          error: 'Missing required query parameter: ids',
          message: 'Provide comma-separated media IDs. Example: /media/delete?ids=id1,id2,id3'
        });
      }

      // Parse the comma-separated IDs
      const mediaIds = query.ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
      
      if (mediaIds.length === 0) {
        return reply.status(400).send({
          error: 'No valid media IDs provided',
          message: 'Provide comma-separated media IDs. Example: /media/delete?ids=id1,id2,id3'
        });
      }

      Logger.info(`Deleting ${mediaIds.length} media files: ${mediaIds.join(', ')}`);

      const deletionResults = [];
      const errors = [];

      // Process each media ID
      for (const mediaId of mediaIds) {
        try {
          // Find the media record in database
          const mediaRecord = await Media.findByPk(mediaId);
          
          if (!mediaRecord) {
            deletionResults.push({
              id: mediaId,
              success: false,
              message: 'Media record not found in database'
            });
            errors.push(`Media ${mediaId} not found in database`);
            continue;
          }
          
          Logger.info(`Attempting to delete S3 object: ${mediaRecord.s3Key}`);
          
          // Delete from S3
          const deleteSuccess = await s3Service.deleteFile(mediaRecord.s3Key);
          
          if (!deleteSuccess) {
            deletionResults.push({
              id: mediaId,
              success: false,
              message: 'Failed to delete from S3'
            });
            errors.push(`Failed to delete ${mediaId} from S3`);
            continue;
          }
          
          // Delete from database
          await mediaRecord.destroy();
          
          deletionResults.push({
            id: mediaId,
            success: true,
            message: 'Deleted successfully from S3 and database'
          });
          Logger.info(`Successfully deleted media: ${mediaId}`);
          
        } catch (error) {
          Logger.error(`Error deleting media ${mediaId}:`, error);
          deletionResults.push({
            id: mediaId,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
          errors.push(`Error deleting ${mediaId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const successCount = deletionResults.filter(result => result.success).length;
      const failureCount = deletionResults.length - successCount;

      const responseData: any = {
        message: `Deletion completed. ${successCount} successful, ${failureCount} failed.`,
        results: deletionResults,
        summary: {
          total: mediaIds.length,
          successful: successCount,
          failed: failureCount
        }
      };

      if (errors.length > 0) {
        responseData.errors = errors;
      }

      // Return appropriate status code
      if (successCount === 0) {
        return reply.status(500).send({
          error: 'All deletions failed',
          ...responseData
        });
      } else if (failureCount > 0) {
        return reply.status(207).send(responseData); // 207 Multi-Status for partial success
      } else {
        return reply.status(200).send(responseData);
      }

    } catch (error: any) {
      Logger.error('Media deletion error:', error);
      return reply.status(500).send({
        error: 'Failed to delete media files',
        details: error.message
      });
    }
  });
}