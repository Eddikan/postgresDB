import { SequelizeBaseDao } from './SequelizeBaseDao';
import { Project, CreateProjectData, UpdateProjectData, ProjectStatus } from '../entities';
import { randomUUID } from 'crypto';

/**
 * Project Data Access Object with Sequelize integration
 * All queries use Sequelize with parameterized statements for SQL injection protection
 */
export class ProjectDao extends SequelizeBaseDao {
  constructor() {
    super();
  }

  /**
   * Get project by ID
   * @param id Project ID
   * @returns Project or null
   */
  async getProjectById(id: string): Promise<Project | null> {
    const query = `
      SELECT 
        id, 
        "projectName", 
        "projectCode", 
        country, 
        state, 
        "startDate", 
        "endDate", 
        status,
        "organisationId",
        "createdBy", 
        "drillHoles",
        "createdAt", 
        "updatedAt"
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
    createdById?: string;
    organisationId?: string;
    search?: string;
  } = {}): Promise<{ projects: Project[]; total: number }> {
    const { page = 1, limit = 10, createdById, organisationId, search } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (organisationId) {
      conditions.push(`"organisationId" = $${paramIndex++}`);
      params.push(organisationId);
    }

    if (createdById) {
      conditions.push(`"createdBy" = $${paramIndex++}`);
      params.push(createdById);
    }

    if (search) {
      conditions.push(`("projectName" ILIKE $${paramIndex} OR "projectCode" ILIKE $${paramIndex} OR country ILIKE $${paramIndex} OR state ILIKE $${paramIndex})`);
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
      SELECT 
        id, 
        "projectName", 
        "projectCode", 
        country, 
        state, 
        "startDate", 
        "endDate", 
        status,
        "organisationId",
        "createdBy", 
        "drillHoles",
        "createdAt", 
        "updatedAt"
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
    // Generate UUID in application code using Node.js built-in crypto
    const projectId = randomUUID();
    
    const query = `
      INSERT INTO projects (
        id, 
        "projectName", 
        "projectCode", 
        country, 
        state, 
        "startDate", 
        "endDate", 
        status,
        "organisationId",
        "createdBy",
        "drillHoles",
        "createdAt", 
        "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        NOW(), NOW()
      )
      RETURNING *
    `;
    
    const result = await this.query<Project>(query, [
      projectId,
      projectData.projectName,
      projectData.projectCode,
      projectData.country,
      projectData.state,
      projectData.startDate,
      projectData.endDate,
      projectData.status || 'pending', // Default to pending
      projectData.organisationId,
      projectData.createdBy,
      JSON.stringify([]) // Empty drill holes array
    ]);
    
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
      SELECT 
        id, 
        "projectName", 
        "projectCode", 
        country, 
        state, 
        "startDate", 
        "endDate", 
        status,
        "organisationId",
        "createdBy", 
        "drillHoles",
        "createdAt", 
        "updatedAt"
      FROM projects
      WHERE "createdBy" = $1
      ORDER BY "createdAt" DESC
    `;
    
    const result = await this.query<Project>(query, [userId]);
    return result.rows;
  }

  /**
   * Get projects by organisation ID
   * @param organisationId Organisation ID
   * @returns Array of projects
   */
  async getProjectsByOrganisationId(organisationId: string): Promise<Project[]> {
    const query = `
      SELECT 
        id, 
        "projectName", 
        "projectCode", 
        country, 
        state, 
        "startDate", 
        "endDate", 
        status,
        "organisationId",
        "createdBy", 
        "drillHoles",
        "createdAt", 
        "updatedAt"
      FROM projects
      WHERE "organisationId" = $1
      ORDER BY "createdAt" DESC
    `;
    
    const result = await this.query<Project>(query, [organisationId]);
    return result.rows;
  }

  /**
   * Archive a project (set status to archived)
   * @param id Project ID
   * @returns Updated project or null
   */
  async archiveProject(id: string): Promise<Project | null> {
    const query = `
      UPDATE projects 
      SET status = 'archived', "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.query<Project>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Check if project code exists
   * @param projectCode Project code
   * @param excludeProjectId Optional project ID to exclude from check
   * @returns Boolean indicating if project code exists
   */
  async projectCodeExists(projectCode: string, excludeProjectId?: string): Promise<boolean> {
    let query = `SELECT id FROM projects WHERE "projectCode" = $1`;
    const params = [projectCode];

    if (excludeProjectId) {
      query += ` AND id != $2`;
      params.push(excludeProjectId);
    }

    const result = await this.query(query, params);
    return result.rows.length > 0;
  }

  /**
   * Check if project name exists
   * @param projectName Project name
   * @param excludeProjectId Optional project ID to exclude from check
   * @returns Boolean indicating if project name exists
   */
  async projectNameExists(projectName: string, excludeProjectId?: string): Promise<boolean> {
    let query = `SELECT id FROM projects WHERE "projectName" = $1`;
    const params = [projectName];

    if (excludeProjectId) {
      query += ` AND id != $2`;
      params.push(excludeProjectId);
    }

    const result = await this.query(query, params);
    return result.rows.length > 0;
  }
}