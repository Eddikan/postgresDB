import { FastifyInstance } from 'fastify';
import * as xlsx from 'xlsx';
import pg from 'pg';
import multer from 'fastify-multer';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const upload = multer({ dest: 'uploads/' });

export async function miningSamplesRoutes(fastify: FastifyInstance) {
  fastify.register(require('fastify-multer').contentParser);

  fastify.get('/mining-samples', async (request, reply) => {
    try {
      // Parse query params
      const { page = '1', limit = '10' } = (request.query || {}) as { page?: string; limit?: string };
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return reply.status(400).send({ error: 'Page must be a positive integer' });
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.status(400).send({ error: 'Limit must be between 1 and 100' });
      }
      const offset = (pageNum - 1) * limitNum;
      const client = await pool.connect();
      try {
        // Get total count
        const countResult = await client.query('SELECT COUNT(*) FROM mining_samples');
        const total = parseInt(countResult.rows[0].count, 10);
        // Get paginated rows
        const dataResult = await client.query('SELECT * FROM mining_samples ORDER BY id LIMIT $1 OFFSET $2', [limitNum, offset]);
        reply.send({
          message: 'Mining samples retrieved successfully',
          samples: dataResult.rows,
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
      } finally {
        client.release();
      }
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
      const client = await pool.connect();
      try {
        if (sampleIds.length) {
          const dbResult = await client.query(
            `SELECT sample_id FROM mining_samples WHERE sample_id = ANY($1)`,
            [sampleIds]
          );
          if (dbResult.rows.length) {
            // Find all rows in the upload that match existing DB sample_ids
            const existingIds = dbResult.rows.map(r => r.sample_id);
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
        const values = insertRows.map(r => [r.sample_id, r.depth_m, r.latitude, r.longitude, r.meta]);
        const placeholders = values.map((_, i) => `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`).join(', ');
        const flatValues = values.flat();
        const sql = `INSERT INTO mining_samples (sample_id, depth_m, latitude, longitude, meta) VALUES ${placeholders}`;
        await client.query(sql, flatValues);
        reply.send({ success: true, insertedRows: insertRows.length });
      } catch (dbErr:any) {
        reply.status(500).send({ error: 'Database error', details: dbErr.message });
      } finally {
        client.release();
      }
    } catch (err: any) {
      reply.status(500).send({ error: 'Parsing error', details: err.message });
    }
  });
}
