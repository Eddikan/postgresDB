import { DatabaseConnection } from '../datasource';

export class MiningSamplesDao {
  private db: DatabaseConnection;
  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async getPaginatedSamples(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const client = await this.db.getPool().connect();
    try {
      const countResult = await client.query('SELECT COUNT(*) FROM mining_samples');
      const total = parseInt(countResult.rows[0].count, 10);
      const dataResult = await client.query('SELECT * FROM mining_samples ORDER BY id LIMIT $1 OFFSET $2', [limit, offset]);
      return { samples: dataResult.rows, total };
    } finally {
      client.release();
    }
  }

  async getExistingSampleIds(sampleIds: string[]) {
    const client = await this.db.getPool().connect();
    try {
      const dbResult = await client.query(
        `SELECT sample_id FROM mining_samples WHERE sample_id = ANY($1)`,
        [sampleIds]
      );
      return dbResult.rows.map(r => r.sample_id);
    } finally {
      client.release();
    }
  }

  async bulkInsertSamples(insertRows: any[]) {
    const client = await this.db.getPool().connect();
    try {
      const values = insertRows.map(r => [r.sample_id, r.depth_m, r.latitude, r.longitude, r.meta]);
      const placeholders = values.map((_, i) => `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`).join(', ');
      const flatValues = values.flat();
      const sql = `INSERT INTO mining_samples (sample_id, depth_m, latitude, longitude, meta) VALUES ${placeholders}`;
      await client.query(sql, flatValues);
      return insertRows.length;
    } finally {
      client.release();
    }
  }
}
