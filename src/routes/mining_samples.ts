import { FastifyInstance } from 'fastify';
import * as xlsx from 'xlsx';
import multer from 'fastify-multer';
import fs from 'fs';
import path from 'path';
import { MiningSamplesDao } from '../dataaccess/MiningSamplesDao';
import { DatabaseConnection } from '../datasource';

export async function miningSamplesRoutes(fastify: FastifyInstance) {
  fastify.register(require('fastify-multer').contentParser);
  const database = new DatabaseConnection();
  const miningSamplesDao = new MiningSamplesDao(database);
  const upload = multer({ dest: 'uploads/' });

  fastify.get('/mining-samples', async (request, reply) => {
    try {
      const { page = '1', limit = '10' } = (request.query || {}) as { page?: string; limit?: string };
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return reply.status(400).send({ error: 'Page must be a positive integer' });
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.status(400).send({ error: 'Limit must be between 1 and 100' });
      }
      const { samples, total } = await miningSamplesDao.getPaginatedSamples(pageNum, limitNum);
      reply.send({
        message: 'Mining samples retrieved successfully',
        samples,
        count: total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      });
    } catch (err: any) {
      reply.status(500).send({ error: 'Database error', details: err.message });
    }
  });

  fastify.post('/mining-samples/upload', { preHandler: upload.single('file') }, async (request: any, reply) => {
    try {
      const file = request.file;
      if (!file) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }
      const ext = path.extname(file.originalname).toLowerCase();
      let rows: any[] = [];
      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
      } else if (ext === '.csv') {
        const workbook = xlsx.readFile(file.path, { type: 'file', raw: true });
        const sheetName = workbook.SheetNames[0];
        rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
      } else {
        fs.unlinkSync(file.path);
        return reply.status(400).send({ error: 'Unsupported file type' });
      }
      fs.unlinkSync(file.path);
      if (!rows.length) {
        return reply.status(400).send({ error: 'No data found in file' });
      }
      // Map columns
      const directCols = ['sample_id', 'depth_m', 'latitude', 'longitude'];
      const insertRows = rows.map(row => {
        const direct: any = {};
        const meta: any = {};
        for (const key in row) {
          const lowerKey = key.toLowerCase();
          if (directCols.includes(lowerKey)) {
            direct[lowerKey] = row[key];
          } else {
            meta[key] = row[key];
          }
        }
        return {
          sample_id: direct['sample_id'] ?? null,
          depth_m: direct['depth_m'] ?? null,
          latitude: direct['latitude'] ?? null,
          longitude: direct['longitude'] ?? null,
          meta: Object.keys(meta).length ? meta : null
        };
      });

      // Check for duplicate sample_id in file
      const sampleIds = insertRows.map(r => r.sample_id).filter(id => id != null);
      // Find all duplicate sample_ids and their row indices
      const fileDuplicateMap: Record<string, number[]> = {};
      sampleIds.forEach((id, idx) => {
        if (!fileDuplicateMap[id]) fileDuplicateMap[id] = [];
        fileDuplicateMap[id].push(idx);
      });
      const fileDuplicates = Object.entries(fileDuplicateMap)
        .filter(([_, idxs]) => idxs.length > 1)
        .map(([id, idxs]) => ({ sample_id: id, rows: idxs }));
      if (fileDuplicates.length) {
        return reply.status(400).send({
          error: 'Duplicate sample_id(s) found in file',
          duplicates: fileDuplicates
        });
      }

      // Check for existing sample_id in DB
      if (sampleIds.length) {
        const existingIds = await miningSamplesDao.getExistingSampleIds(sampleIds);
        if (existingIds.length) {
          const affectedRows = insertRows
            .map((r, idx) => existingIds.includes(r.sample_id) ? { sample_id: r.sample_id, row: idx } : null)
            .filter(Boolean);
          return reply.status(409).send({
            error: 'Duplicate sample_id(s) already exist in database',
            duplicates: affectedRows
          });
        }
      }
      // Bulk insert
      const insertedCount = await miningSamplesDao.bulkInsertSamples(insertRows);
      reply.send({ success: true, insertedRows: insertedCount });
    } catch (err: any) {
      reply.status(500).send({ error: 'Parsing error', details: err.message });
    }
  });
}
