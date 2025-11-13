import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, requirePermission, Permission } from '../middleware';
import { ProjectDao } from '../dataaccess/ProjectDao';
import { DrillingDao } from '../dataaccess/DrillingDao';
import { CreateDrillingData, UpdateDrillingData, DowntimeCategory, ShiftType } from '../entities';
import { S3Service } from '../services/S3Service';
import { MultipartFile } from '@fastify/multipart';
import { Logger } from "../utils/Logger";
import crypto from 'crypto';
import { Op, Sequelize } from 'sequelize';
import Drilling from '../models/drilling.model';
import Project from '../models/project.model';
import Media from '../models/media.model';

/**
 * Helper function to safely parse photos JSON
 */
function safeParsePhotos(photosJson: string | null | undefined): string[] {
  if (!photosJson) return [];
  
  try {
    // If it's already an array, return it
    if (Array.isArray(photosJson)) {
      return photosJson;
    }
    
    // If it's a string that looks like a URL (not JSON), wrap it in an array
    if (typeof photosJson === 'string' && (photosJson.startsWith('http') || photosJson.startsWith('https'))) {
      Logger.warn(`Found single URL instead of JSON array: ${photosJson}`);
      return [photosJson];
    }
    
    // Try to parse as JSON
    const parsed = JSON.parse(photosJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    Logger.error(`Error parsing photos JSON (value: "${photosJson}"):`, error);
    
    // If parsing fails but it looks like a URL, return it as a single-item array
    if (typeof photosJson === 'string' && (photosJson.includes('http') || photosJson.includes('amazonaws'))) {
      Logger.info(`Treating as single URL: ${photosJson}`);
      return [photosJson];
    }
    
    return [];
  }
}

/**
 * Helper function to fetch media objects from media IDs
 */
async function fetchMediaObjects(photoIds: string[]): Promise<any[]> {
  if (!photoIds || photoIds.length === 0) return [];
  
  try {
    const mediaRecords = await Media.findAll({
      where: {
        id: {
          [Op.in]: photoIds
        }
      },
      attributes: ['id', 'url', 'type', 'filename', 'mimetype', 'size', 's3Key', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });

    return mediaRecords.map(media => {
      const mediaData = media.toJSON ? media.toJSON() : media;
      return {
        id: mediaData.id,
        url: mediaData.url,
        type: mediaData.type,
        filename: mediaData.filename,
        mimetype: mediaData.mimetype,
        size: mediaData.size,
        s3Key: mediaData.s3Key,
        uploadedAt: mediaData.createdAt instanceof Date 
          ? mediaData.createdAt.toISOString() 
          : new Date(mediaData.createdAt).toISOString()
      };
    });
  } catch (error) {
    Logger.error('Error fetching media objects:', error);
    return [];
  }
}

/**
 * Drill Holes routes - Complete CRUD operations with file upload support
 */
export async function drillHoleRoutes(fastify: FastifyInstance) {
  const projectDao = new ProjectDao();
  const drillingDao = new DrillingDao();
  const s3Service = new S3Service();

  /**
   * POST /drillholes/test-upload - Test multipart upload
   * Simple endpoint to test file upload without validation
   */
  fastify.post('/test-upload', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      Logger.info('=== TEST UPLOAD REQUEST ===');
      Logger.info(`Content-Type: ${request.headers['content-type']}`);
      
      const files: MultipartFile[] = [];
      const fields: any = {};
      
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          Logger.info(`File found: ${part.fieldname} - ${part.filename} (${part.mimetype})`);
          files.push(part);
        } else {
          Logger.info(`Field found: ${part.fieldname} = ${part.value}`);
          fields[part.fieldname] = part.value;
        }
      }
      
      return reply.send({
        message: 'Test upload completed',
        filesReceived: files.length,
        fieldsReceived: Object.keys(fields).length,
        files: files.map(f => ({ fieldname: f.fieldname, filename: f.filename, mimetype: f.mimetype })),
        fields: fields
      });
    } catch (error) {
      Logger.error('Test upload error:', error);
      return reply.status(500).send({ error: 'Test upload failed', details: error });
    }
  });

  /**
   * POST /drillholes - Create a new drill hole with photo URLs
   * Requires authentication and accepts JSON payload
   */
  fastify.post<{
    Body: {
      projectId: string;
      drillingPlatform: string;
      contractor: string;
      mobilisationDate: string;
      shift: string;
      holeId: string;
      startDate: string;
      expectedDepth: number;
      metersDrilled: number;
      machineHours: number;
      standbyHours: number;
      drillingHours: number;
      downtime: number;
      downtimeCategory: string;
      reason: string;
      penetrationRate: number;
      utilisation: number;
      waterUsed: number;
      additives: string;
      fuelUsed: number;
      fieldTopUp: number;
      operationalComment?: string;
      notes?: string;
      photos?: string[]; // Array of photo IDs from /media/upload
    }
  }>('/', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      Logger.info('=== DRILL HOLE CREATION REQUEST STARTED ===');
      Logger.info(`Request content-type: ${request.headers['content-type']}`);
      Logger.info(`Request method: ${request.method}`);
      
      const data = request.body as any;
      
      // Validate required fields
      const requiredFields = [
        'projectId', 'drillingPlatform', 'contractor', 'mobilisationDate',
        'shift', 'holeId', 'startDate', 'expectedDepth', 'metersDrilled',
        'machineHours', 'standbyHours', 'drillingHours', 'downtime',
        'downtimeCategory', 'reason', 'penetrationRate', 'utilisation',
        'waterUsed', 'additives', 'fuelUsed', 'fieldTopUp'
      ];

      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          return reply.status(400).send({ error: `Missing required field: ${field}` });
        }
      }

      // Trim string fields
      const stringFields = [
        'projectId', 'drillingPlatform', 'contractor', 'shift', 'holeId',
        'downtimeCategory', 'reason', 'additives', 'operationalComment', 'notes'
      ];
      
      stringFields.forEach(field => {
        if (data[field] && typeof data[field] === 'string') {
          data[field] = data[field].trim();
        }
      });

      // Validate enum values
      if (!Object.values(ShiftType).includes(data.shift)) {
        return reply.status(400).send({ 
          error: `Invalid shift value. Must be one of: ${Object.values(ShiftType).join(', ')}` 
        });
      }

      if (!Object.values(DowntimeCategory).includes(data.downtimeCategory)) {
        return reply.status(400).send({ 
          error: `Invalid downtime category. Must be one of: ${Object.values(DowntimeCategory).join(', ')}` 
        });
      }

      // Validate that the project exists using Sequelize
      const project = await Project.findByPk(data.projectId);
      if (!project) {
        return reply.status(400).send({
          error: 'Invalid project ID. Project not found.'
        });
      }

      // Check if hole ID already exists in this project using Sequelize
      const existingHole = await Drilling.findOne({
        where: {
          projectId: data.projectId,
          holeId: data.holeId
        }
      });
      
      if (existingHole) {
        return reply.status(400).send({
          error: 'Hole ID already exists in this project'
        });
      }

      // Validate photos array if provided
      let photosJson: string | null = null;
      if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
        // Validate that all photos are valid IDs (UUIDs or similar)
        const validIds = data.photos.filter((id: any) => 
          typeof id === 'string' && 
          id.trim() !== '' && 
          id.length > 0
        );
        
        if (validIds.length > 0) {
          photosJson = JSON.stringify(validIds);
          Logger.info(`Photos provided: ${validIds.length} IDs`);
        }
      }

      // Create the drill hole using Sequelize
      Logger.info('Creating drill hole record...');
      const newDrillHole = await Drilling.create({
        id: crypto.randomUUID(),
        projectId: data.projectId,
        drillingPlatform: data.drillingPlatform,
        contractor: data.contractor,
        mobilisationDate: data.mobilisationDate,
        shift: data.shift,
        holeId: data.holeId,
        startDate: data.startDate,
        expectedDepth: parseFloat(data.expectedDepth.toString()),
        metersDrilled: parseFloat(data.metersDrilled.toString()),
        machineHours: parseFloat(data.machineHours.toString()),
        standbyHours: parseFloat(data.standbyHours.toString()),
        drillingHours: parseFloat(data.drillingHours.toString()),
        downtime: parseFloat(data.downtime.toString()),
        downtimeCategory: data.downtimeCategory,
        reason: data.reason,
        penetrationRate: parseFloat(data.penetrationRate.toString()),
        utilisation: parseFloat(data.utilisation.toString()),
        waterUsed: parseFloat(data.waterUsed.toString()),
        additives: data.additives,
        fuelUsed: parseFloat(data.fuelUsed.toString()),
        fieldTopUp: parseFloat(data.fieldTopUp.toString()),
        operationalComment: data.operationalComment || null,
        notes: data.notes || null,
        photos: photosJson
      });

      // Parse the photos JSON back to array and fetch full media objects for response
      const responseData = newDrillHole.toJSON();
      const photoIds = safeParsePhotos(responseData.photos);
      responseData.photos = await fetchMediaObjects(photoIds);

      Logger.info('Drill hole created successfully');
      return reply.status(201).send({
        message: 'Drill hole created successfully',
        data: responseData
      });

    } catch (error: any) {
      Logger.error('Create drill hole error:', error);
      
      // Check if it's a validation error
      if (error.name === 'SequelizeValidationError') {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors?.map((e: any) => e.message)
        });
      }
      
      return reply.status(500).send({
        error: 'Failed to create drill hole',
        details: error.message
      });
    }
  });

  /**
   * GET /drillholes - Get all drill holes with pagination and filtering
   * Requires authentication
   */
  fastify.get<{
    Querystring: {
      page?: number;
      limit?: number;
      projectId?: string;
      search?: string;
    }
  }>('/', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { page = 1, limit = 10, projectId, search } = request.query as any;
      const offset = (page - 1) * limit;

      // Get user's organisation ID from authenticated request
      const user = request.userProfile;
      Logger.info(`Fetching drill holes for user:`, { userId: user?.id, organisationId: user?.organisationId });
      
      if (!user || !user.organisationId) {
        return reply.status(403).send({
          error: 'User organisation not found'
        });
      }

      // Build WHERE conditions for Sequelize
      const whereConditions: any = {};
      
      if (projectId) {
        whereConditions.projectId = projectId;
      }

      if (search) {
        whereConditions[Op.or] = [
          { holeId: { [Op.iLike]: `%${search}%` } },
          { contractor: { [Op.iLike]: `%${search}%` } },
          { drillingPlatform: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Get drill holes with project info using Sequelize, filtered by organisation
      const { rows: drillHoles, count: total } = await Drilling.findAndCountAll({
        where: whereConditions,
        include: [{
          model: Project,
          as: 'project',
          attributes: ['projectName', 'projectCode', 'organisationId'],
          where: {
            organisationId: user.organisationId
          },
          required: true
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString())
      });

      // Transform the data to match expected format
      const transformedData = await Promise.all(drillHoles.map(async (hole) => {
        const holeData = hole.toJSON();
        const photoIds = safeParsePhotos(holeData.photos);
        Logger.info(`Drill hole ${holeData.holeId} - Photo IDs:`, photoIds);
        holeData.photos = await fetchMediaObjects(photoIds);
        Logger.info(`Drill hole ${holeData.holeId} - Fetched media objects:`, holeData.photos.length);
        // Add project info at root level for backward compatibility
        if (holeData.project) {
          holeData.projectName = holeData.project.projectName;
          holeData.projectCode = holeData.project.projectCode;
        }
        return holeData;
      }));

      return reply.status(200).send({
        message: 'Drill holes retrieved successfully',
        data: transformedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error: any) {
      fastify.log.error('Get drill holes error:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve drill holes'
      });
    }
  });

  /**
   * GET /drillholes/project/:projectId - Get all drill holes for a specific project
   * Requires authentication
   */
  fastify.get<{
    Params: { projectId: string }
  }>('/project/:projectId', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { projectId } = request.params as { projectId: string };

      // Validate project exists using Sequelize
      const project = await Project.findByPk(projectId);
      if (!project) {
        return reply.status(404).send({
          error: 'Project not found'
        });
      }

      // Get all drill holes for the project using Sequelize
      const drillHoles = await Drilling.findAll({
        where: { projectId },
        include: [{
          model: Project,
          as: 'project',
          attributes: ['projectName', 'projectCode']
        }],
        order: [['createdAt', 'DESC']]
      });

      // Transform the data
      const transformedData = await Promise.all(drillHoles.map(async (hole) => {
        const holeData = hole.toJSON();
        const photoIds = safeParsePhotos(holeData.photos);
        holeData.photos = await fetchMediaObjects(photoIds);
        // Add project info at root level for backward compatibility
        if (holeData.project) {
          holeData.projectName = holeData.project.projectName;
          holeData.projectCode = holeData.project.projectCode;
        }
        return holeData;
      }));

      return reply.status(200).send({
        message: 'Drill holes retrieved successfully',
        project: {
          id: project.id,
          name: project.projectName,
          code: project.projectCode
        },
        data: transformedData,
        total: transformedData.length
      });

    } catch (error: any) {
      fastify.log.error('Get drill holes by project error:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve drill holes'
      });
    }
  });

  /**
   * GET /drillholes/:id - Get a specific drill hole by ID
   * Requires authentication
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      // Get drill hole with project info using Sequelize
      const drillHole = await Drilling.findByPk(id, {
        include: [{
          model: Project,
          as: 'project',
          attributes: ['projectName', 'projectCode']
        }]
      });

      if (!drillHole) {
        return reply.status(404).send({
          error: 'Drill hole not found'
        });
      }

      // Transform the data
      const holeData = drillHole.toJSON();
      const photoIds = safeParsePhotos(holeData.photos);
      holeData.photos = await fetchMediaObjects(photoIds);
      // Add project info at root level for backward compatibility
      if (holeData.project) {
        holeData.projectName = holeData.project.projectName;
        holeData.projectCode = holeData.project.projectCode;
      }

      return reply.status(200).send({
        message: 'Drill hole retrieved successfully',
        data: holeData
      });

    } catch (error: any) {
      fastify.log.error('Get drill hole by ID error:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve drill hole'
      });
    }
  });

  /**
   * PUT /drillholes/:id - Update a drill hole with optional photo URLs
   * Requires authentication and accepts JSON payload
   */
  fastify.put<{
    Params: { id: string };
    Body: {
      projectId?: string;
      drillingPlatform?: string;
      contractor?: string;
      mobilisationDate?: string;
      shift?: string;
      holeId?: string;
      startDate?: string;
      expectedDepth?: number;
      metersDrilled?: number;
      machineHours?: number;
      standbyHours?: number;
      drillingHours?: number;
      downtime?: number;
      downtimeCategory?: string;
      reason?: string;
      penetrationRate?: number;
      utilisation?: number;
      waterUsed?: number;
      additives?: string;
      fuelUsed?: number;
      fieldTopUp?: number;
      operationalComment?: string;
      notes?: string;
      photos?: string[]; // Array of photo IDs
      replacePhotos?: boolean; // If true, replace all photos; if false, append
    }
  }>('/:id', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      // Check if drill hole exists using Sequelize
      const existingDrillHole = await Drilling.findByPk(id);
      
      if (!existingDrillHole) {
        return reply.status(404).send({
          error: 'Drill hole not found'
        });
      }

      // Trim string fields
      const stringFields = [
        'projectId', 'drillingPlatform', 'contractor', 'shift', 'holeId',
        'downtimeCategory', 'reason', 'additives', 'operationalComment', 'notes'
      ];
      
      stringFields.forEach(field => {
        if (data[field] && typeof data[field] === 'string') {
          data[field] = data[field].trim();
        }
      });

      // Validate enum values if provided
      if (data.shift && !Object.values(ShiftType).includes(data.shift)) {
        return reply.status(400).send({ 
          error: `Invalid shift value. Must be one of: ${Object.values(ShiftType).join(', ')}` 
        });
      }

      if (data.downtimeCategory && !Object.values(DowntimeCategory).includes(data.downtimeCategory)) {
        return reply.status(400).send({ 
          error: `Invalid downtime category. Must be one of: ${Object.values(DowntimeCategory).join(', ')}` 
        });
      }

      // Handle photos
      let finalPhotosJson: string | null = null;
      
      if (data.photos && Array.isArray(data.photos)) {
        // Validate IDs
        const validIds = data.photos.filter((id: any) => 
          typeof id === 'string' && 
          id.trim() !== '' && 
          id.length > 0
        );
        
        if (data.replacePhotos) {
          // Replace all photos
          finalPhotosJson = validIds.length > 0 ? JSON.stringify(validIds) : null;
        } else {
          // Append to existing photos
          const existingPhotos = safeParsePhotos(existingDrillHole.photos);
          const allPhotos = [...existingPhotos, ...validIds];
          finalPhotosJson = allPhotos.length > 0 ? JSON.stringify(allPhotos) : null;
        }
      }

      // Prepare update data
      const updateData: any = {};
      const numericFields = [
        'expectedDepth', 'metersDrilled', 'machineHours', 'standbyHours',
        'drillingHours', 'downtime', 'penetrationRate', 'utilisation',
        'waterUsed', 'fuelUsed', 'fieldTopUp'
      ];

      Object.keys(data).forEach(key => {
        if (key !== 'replacePhotos' && data[key] !== undefined) {
          if (numericFields.includes(key)) {
            updateData[key] = parseFloat(data[key].toString());
          } else {
            updateData[key] = data[key];
          }
        }
      });

      // Add photos if processed
      if (finalPhotosJson !== null) {
        updateData.photos = finalPhotosJson;
      }

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({
          error: 'No fields to update'
        });
      }

      // Update using Sequelize
      await existingDrillHole.update(updateData);

      // Get updated drill hole data
      const updatedData = existingDrillHole.toJSON();
      const photoIds = safeParsePhotos(updatedData.photos);
      updatedData.photos = await fetchMediaObjects(photoIds);

      return reply.status(200).send({
        message: 'Drill hole updated successfully',
        data: updatedData
      });

    } catch (error: any) {
      fastify.log.error('Update drill hole error:', error);
      return reply.status(500).send({
        error: 'Failed to update drill hole'
      });
    }
  });

  /**
   * DELETE /drillholes/:id - Delete a drill hole and its associated photos
   * Requires authentication and appropriate permissions
   */
  fastify.delete<{
    Params: { id: string }
  }>('/:id', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      // Get drill hole info including photos using Sequelize
      const drillHole = await Drilling.findByPk(id);

      if (!drillHole) {
        return reply.status(404).send({
          error: 'Drill hole not found'
        });
      }

      // Delete photos from S3 if any
      if (drillHole.photos) {
        const photoUrls = safeParsePhotos(drillHole.photos);
        if (photoUrls.length > 0) {
          // Extract S3 keys from URLs
          const s3Keys = photoUrls.map((url: string) => {
            const urlParts = url.split('/');
            return urlParts.slice(-2).join('/'); // Get folder/filename
          });
          await s3Service.deleteMultipleFiles(s3Keys);
        }
      }

      // Delete drill hole from database using Sequelize
      await drillHole.destroy();

      return reply.status(200).send({
        message: 'Drill hole deleted successfully'
      });

    } catch (error: any) {
      fastify.log.error('Delete drill hole error:', error);
      return reply.status(500).send({
        error: 'Failed to delete drill hole'
      });
    }
  });

  /**
   * POST /drillholes/:id/photos - Add photos to an existing drill hole
   * Requires authentication
   */
  fastify.post<{
    Params: { id: string }
  }>('/:id/photos', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if drill hole exists using Sequelize
      const drillHole = await Drilling.findByPk(id);
      
      if (!drillHole) {
        return reply.status(404).send({
          error: 'Drill hole not found'
        });
      }

      // Handle file uploads
      const files: MultipartFile[] = [];
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file' && part.mimetype.startsWith('image/')) {
          files.push(part);
        }
      }

      if (files.length === 0) {
        return reply.status(400).send({
          error: 'No image files provided'
        });
      }

      // Upload photos to S3
      const uploadPromises = files.map(async (file) => {
        const buffer = await file.toBuffer();
        return await s3Service.uploadFile(
          buffer,
          file.filename,
          file.mimetype,
          `drill-holes/${drillHole.projectId}`
        );
      });
      const uploadedFiles = await Promise.all(uploadPromises);
      const newPhotoUrls = uploadedFiles.map(file => file.url);

      // Merge with existing photos
      const existingPhotos = safeParsePhotos(drillHole.photos);
      const allPhotos = [...existingPhotos, ...newPhotoUrls];

      // Update drill hole with new photos using Sequelize
      await drillHole.update({
        photos: JSON.stringify(allPhotos)
      });

      // Get updated data for response with full media objects
      const updatedData = drillHole.toJSON();
      const photoIds = safeParsePhotos(updatedData.photos);
      updatedData.photos = await fetchMediaObjects(photoIds);

      return reply.status(200).send({
        message: 'Photos added successfully',
        data: updatedData,
        newPhotos: newPhotoUrls
      });

    } catch (error: any) {
      fastify.log.error('Add photos error:', error);
      return reply.status(500).send({
        error: 'Failed to add photos'
      });
    }
  });

  /**
   * DELETE /drillholes/:id/photos - Remove specific photos from a drill hole
   * Requires authentication
   */
  fastify.delete<{
    Params: { id: string };
    Body: { photoUrls: string[] }
  }>('/:id/photos', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { photoUrls } = request.body as { photoUrls: string[] };

      if (!photoUrls || photoUrls.length === 0) {
        return reply.status(400).send({
          error: 'Photo URLs are required'
        });
      }

      // Get drill hole using Sequelize
      const drillHole = await Drilling.findByPk(id);
      
      if (!drillHole) {
        return reply.status(404).send({
          error: 'Drill hole not found'
        });
      }

      const existingPhotos = safeParsePhotos(drillHole.photos);

      // Filter out photos to be deleted
      const remainingPhotos = existingPhotos.filter((url: string) => !photoUrls.includes(url));

      // Delete photos from S3
      const s3Keys = photoUrls.map(url => {
        const urlParts = url.split('/');
        return urlParts.slice(-2).join('/');
      });
      await s3Service.deleteMultipleFiles(s3Keys);

      // Update drill hole using Sequelize
      await drillHole.update({
        photos: JSON.stringify(remainingPhotos)
      });

      // Get updated data for response with full media objects
      const updatedData = drillHole.toJSON();
      const photoIds = safeParsePhotos(updatedData.photos);
      updatedData.photos = await fetchMediaObjects(photoIds);

      return reply.status(200).send({
        message: 'Photos removed successfully',
        data: updatedData
      });

    } catch (error: any) {
      fastify.log.error('Remove photos error:', error);
      return reply.status(500).send({
        error: 'Failed to remove photos'
      });
    }
  });

  /**
   * GET /drillholes/create-data - Get dropdown data for creating drill holes
   * Public endpoint (no authentication required)
   */
  fastify.get('/create-data', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get all active projects for dropdown using Sequelize
      const projects = await Project.findAll({
        where: {
          status: {
            [Op.ne]: 'archived'
          }
        },
        attributes: [
          ['id', 'id'],
          ['projectName', 'name'],
          ['projectCode', 'code']
        ],
        order: [['projectName', 'ASC']]
      });

      // Static dropdown options
      const shifts = Object.values(ShiftType);
      const downtimeCategories = Object.values(DowntimeCategory);

      return reply.status(200).send({
        projects,
        shifts,
        downtimeCategories
      });

    } catch (error: any) {
      fastify.log.error('Get create data error:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve create data'
      });
    }
  });

  /**
   * GET /drillholes/stats/:projectId - Get drilling statistics for a project
   * Requires authentication
   */
  fastify.get<{
    Params: { projectId: string }
  }>('/stats/:projectId', {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { projectId } = request.params as { projectId: string };

      // Validate project exists using Sequelize
      const project = await Project.findByPk(projectId);
      if (!project) {
        return reply.status(404).send({
          error: 'Project not found'
        });
      }

      // Get drilling statistics using Sequelize aggregation
      const stats = await Drilling.findAll({
        where: { projectId },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalHoles'],
          [Sequelize.fn('SUM', Sequelize.col('metersDrilled')), 'totalMetersDrilled'],
          [Sequelize.fn('SUM', Sequelize.col('expectedDepth')), 'totalExpectedDepth'],
          [Sequelize.fn('AVG', Sequelize.col('penetrationRate')), 'avgPenetrationRate'],
          [Sequelize.fn('AVG', Sequelize.col('utilisation')), 'avgUtilisation'],
          [Sequelize.fn('SUM', Sequelize.col('machineHours')), 'totalMachineHours'],
          [Sequelize.fn('SUM', Sequelize.col('drillingHours')), 'totalDrillingHours'],
          [Sequelize.fn('SUM', Sequelize.col('downtime')), 'totalDowntime'],
          [Sequelize.fn('SUM', Sequelize.col('waterUsed')), 'totalWaterUsed'],
          [Sequelize.fn('SUM', Sequelize.col('fuelUsed')), 'totalFuelUsed']
        ],
        raw: true
      });

      const rawStats: any = stats[0] || {};

      // Convert string numbers to actual numbers and handle nulls
      const processedStats: any = {};
      Object.keys(rawStats).forEach(key => {
        const value = rawStats[key as keyof typeof rawStats];
        if (value !== null && !isNaN(value)) {
          processedStats[key] = parseFloat(value);
        } else {
          processedStats[key] = 0;
        }
      });

      // Calculate completion percentage
      const completionPercentage = processedStats.totalExpectedDepth > 0 
        ? (processedStats.totalMetersDrilled / processedStats.totalExpectedDepth) * 100 
        : 0;

      return reply.status(200).send({
        message: 'Drilling statistics retrieved successfully',
        project: {
          id: project.id,
          name: project.projectName,
          code: project.projectCode
        },
        stats: {
          ...processedStats,
          completionPercentage: Math.round(completionPercentage * 100) / 100
        }
      });

    } catch (error: any) {
      fastify.log.error('Get drilling stats error:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve drilling statistics'
      });
    }
  });
}