import { BaseDao } from './BaseDao';
import { Project, CreateProjectData, UpdateProjectData } from '../entities';
import { DatabaseConnection } from '../datasource';

/**
 * Project Data Access Object with SQL injection protection
 * All queries use parameterized statements to prevent SQL injection
 */
export class ProjectDao extends BaseDao {
  constructor(database: DatabaseConnection) {
    super(database);
  }

  /**
   * Get project by ID
   * @param id Project ID
   * @returns Project or null
   */
  async getProjectById(id: string): Promise<Project | null> {
    const query = `
      SELECT id, name, description, location, status, "createdById", "createdAt", "updatedAt"
      FROM projects
      WHERE id = $1
    `;
    
    const result = await this.query<Project>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all projects with optional filtering
   * @param options Query options
   * @returns Projects and total count
   */
  async getProjects(options: {
    page?: number;
    limit?: number;
    status?: string;
    createdById?: string;
    search?: string;
  } = {}): Promise<{ projects: Project[]; total: number }> {
    const { page = 1, limit = 10, status, createdById, search } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (createdById) {
      conditions.push(`"createdById" = $${paramIndex++}`);
      params.push(createdById);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM projects 
      ${whereClause}
    `;
    const countResult = await this.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get projects with pagination
    const projectsQuery = `
      SELECT id, name, description, location, status, "createdById", "createdAt", "updatedAt"
      FROM projects
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const projectsResult = await this.query<Project>(projectsQuery, [...params, limit, offset]);

    return {
      projects: projectsResult.rows,
      total
    };
  }

  /**
   * Create a new project
   * @param projectData Project data
   * @returns Created project
   */
  async createProject(projectData: CreateProjectData): Promise<Project> {
    const { columns, values, params } = this.buildInsertClause(projectData);
    
    const query = `
      INSERT INTO projects (${columns})
      VALUES (${values})
      RETURNING *
    `;
    
    const result = await this.query<Project>(query, params);
    return result.rows[0];
  }

  /**
   * Update project by ID
   * @param id Project ID
   * @param updates Project updates
   * @returns Updated project or null
   */
  async updateProject(id: string, updates: Omit<UpdateProjectData, 'id'>): Promise<Project | null> {
    const { setClause, params } = this.buildSetClause(updates);
    
    if (!setClause) {
      throw new Error('No updates provided');
    }

    const query = `
      UPDATE projects 
      ${setClause}
      WHERE id = $${params.length + 1}
      RETURNING *
    `;
    
    const result = await this.query<Project>(query, [...params, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete project by ID
   * @param id Project ID
   * @returns Boolean indicating success
   */
  async deleteProject(id: string): Promise<boolean> {
    const query = `DELETE FROM projects WHERE id = $1`;
    const result = await this.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get projects by user ID (created by user)
   * @param userId User ID
   * @returns Array of projects
   */
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const query = `
      SELECT id, name, description, location, status, "createdById", "createdAt", "updatedAt"
      FROM projects
      WHERE "createdById" = $1
      ORDER BY "createdAt" DESC
    `;
    
    const result = await this.query<Project>(query, [userId]);
    return result.rows;
  }

  /**
   * Check if project name exists
   * @param name Project name
   * @param excludeProjectId Optional project ID to exclude from check
   * @returns Boolean indicating if name exists
   */
  async projectNameExists(name: string, excludeProjectId?: string): Promise<boolean> {
    let query = `SELECT id FROM projects WHERE name = $1`;
    const params = [name];

    if (excludeProjectId) {
      query += ` AND id != $2`;
      params.push(excludeProjectId);
    }

    const result = await this.query(query, params);
    return result.rows.length > 0;
  }
}