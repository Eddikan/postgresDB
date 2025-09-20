import { BaseDao } from './BaseDao';
import { Drilling, CreateDrillingData, UpdateDrillingData } from '../entities';
import { DatabaseConnection } from '../datasource';

/**
 * Drilling Data Access Object with SQL injection protection
 * All queries use parameterized statements to prevent SQL injection
 */
export class DrillingDao extends BaseDao {
  constructor(database: DatabaseConnection) {
    super(database);
  }

  /**
   * Get drilling by ID
   * @param id Drilling ID
   * @returns Drilling or null
   */
  async getDrillingById(id: string): Promise<Drilling | null> {
    const query = `
      SELECT id, name, "projectId", location, "startDate", "endDate", 
             depth, status, "createdById", "createdAt", "updatedAt"
      FROM drillings
      WHERE id = $1
    `;
    
    const result = await this.query<Drilling>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all drillings with optional filtering
   * @param options Query options
   * @returns Drillings and total count
   */
  async getDrillings(options: {
    page?: number;
    limit?: number;
    projectId?: string;
    status?: string;
    createdById?: string;
    search?: string;
  } = {}): Promise<{ drillings: Drilling[]; total: number }> {
    const { page = 1, limit = 10, projectId, status, createdById, search } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      conditions.push(`"projectId" = $${paramIndex++}`);
      params.push(projectId);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (createdById) {
      conditions.push(`"createdById" = $${paramIndex++}`);
      params.push(createdById);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM drillings 
      ${whereClause}
    `;
    const countResult = await this.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get drillings with pagination
    const drillingsQuery = `
      SELECT id, name, "projectId", location, "startDate", "endDate", 
             depth, status, "createdById", "createdAt", "updatedAt"
      FROM drillings
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const drillingsResult = await this.query<Drilling>(drillingsQuery, [...params, limit, offset]);

    return {
      drillings: drillingsResult.rows,
      total
    };
  }

  /**
   * Create a new drilling
   * @param drillingData Drilling data
   * @returns Created drilling
   */
  async createDrilling(drillingData: CreateDrillingData): Promise<Drilling> {
    const { columns, values, params } = this.buildInsertClause(drillingData);
    
    const query = `
      INSERT INTO drillings (${columns})
      VALUES (${values})
      RETURNING *
    `;
    
    const result = await this.query<Drilling>(query, params);
    return result.rows[0];
  }

  /**
   * Update drilling by ID
   * @param id Drilling ID
   * @param updates Drilling updates
   * @returns Updated drilling or null
   */
  async updateDrilling(id: string, updates: Omit<UpdateDrillingData, 'id'>): Promise<Drilling | null> {
    const { setClause, params } = this.buildSetClause(updates);
    
    if (!setClause) {
      throw new Error('No updates provided');
    }

    const query = `
      UPDATE drillings 
      ${setClause}
      WHERE id = $${params.length + 1}
      RETURNING *
    `;
    
    const result = await this.query<Drilling>(query, [...params, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete drilling by ID
   * @param id Drilling ID
   * @returns Boolean indicating success
   */
  async deleteDrilling(id: string): Promise<boolean> {
    const query = `DELETE FROM drillings WHERE id = $1`;
    const result = await this.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get drillings by project ID
   * @param projectId Project ID
   * @returns Array of drillings
   */
  async getDrillingsByProjectId(projectId: string): Promise<Drilling[]> {
    const query = `
      SELECT id, name, "projectId", location, "startDate", "endDate", 
             depth, status, "createdById", "createdAt", "updatedAt"
      FROM drillings
      WHERE "projectId" = $1
      ORDER BY "createdAt" DESC
    `;
    
    const result = await this.query<Drilling>(query, [projectId]);
    return result.rows;
  }

  /**
   * Get drillings by user ID (created by user)
   * @param userId User ID
   * @returns Array of drillings
   */
  async getDrillingsByUserId(userId: string): Promise<Drilling[]> {
    const query = `
      SELECT id, name, "projectId", location, "startDate", "endDate", 
             depth, status, "createdById", "createdAt", "updatedAt"
      FROM drillings
      WHERE "createdById" = $1
      ORDER BY "createdAt" DESC
    `;
    
    const result = await this.query<Drilling>(query, [userId]);
    return result.rows;
  }

  /**
   * Check if drilling name exists within a project
   * @param name Drilling name
   * @param projectId Project ID
   * @param excludeDrillingId Optional drilling ID to exclude from check
   * @returns Boolean indicating if name exists
   */
  async drillingNameExistsInProject(name: string, projectId: string, excludeDrillingId?: string): Promise<boolean> {
    let query = `SELECT id FROM drillings WHERE name = $1 AND "projectId" = $2`;
    const params = [name, projectId];

    if (excludeDrillingId) {
      query += ` AND id != $3`;
      params.push(excludeDrillingId);
    }

    const result = await this.query(query, params);
    return result.rows.length > 0;
  }

  /**
   * Update drilling status
   * @param id Drilling ID
   * @param status New status
   * @returns Boolean indicating success
   */
  async updateDrillingStatus(id: string, status: string): Promise<boolean> {
    const query = `
      UPDATE drillings 
      SET status = $1, "updatedAt" = NOW()
      WHERE id = $2
    `;
    const result = await this.query(query, [status, id]);
    return (result.rowCount ?? 0) > 0;
  }
}