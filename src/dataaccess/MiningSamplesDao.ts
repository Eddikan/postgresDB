import { SequelizeBaseDao } from './SequelizeBaseDao';

export class MiningSamplesDao extends SequelizeBaseDao {
  constructor() {
    super();
  }

  async getPaginatedSamples(page: number, limit: number) {
    const offset = (page - 1) * limit;
    
    const countResult = await this.query<{ count: string }>('SELECT COUNT(*) FROM mining_samples');
    const total = parseInt(countResult.rows[0].count, 10);
    
    const dataResult = await this.query('SELECT * FROM mining_samples ORDER BY id LIMIT $1 OFFSET $2', [limit, offset]);
    
    return { samples: dataResult.rows, total };
  }

  async getExistingSampleIds(sampleIds: string[]) {
    // Use IN clause instead of ANY() for better Sequelize compatibility
    const placeholders = sampleIds.map((_, index) => `$${index + 1}`).join(', ');
    const query = `SELECT sample_id FROM mining_samples WHERE sample_id IN (${placeholders})`;
    
    const dbResult = await this.query<{ sample_id: string }>(query, sampleIds);
    return dbResult.rows.map((r: { sample_id: string }) => r.sample_id);
  }

  async bulkInsertSamples(insertRows: any[]) {
    const values = insertRows.map(r => [r.sample_id, r.depth_m, r.latitude, r.longitude, r.meta]);
    const placeholders = values.map((_, i) => `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`).join(', ');
    const flatValues = values.flat();
    const sql = `INSERT INTO mining_samples (sample_id, depth_m, latitude, longitude, meta) VALUES ${placeholders}`;
    
    await this.query(sql, flatValues);
    return insertRows.length;
  }
}
