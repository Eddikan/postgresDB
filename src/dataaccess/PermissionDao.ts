import { BaseDao } from './BaseDao';
import { Permission } from '../entities';
import { DatabaseConnection } from '../datasource';

export interface PermissionEntity {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePermissionData {
  name: string;
  description?: string;
}

export interface UpdatePermissionData {
  name?: string;
  description?: string;
}

/**
 * Permission Data Access Object with SQL injection protection
 * All queries use parameterized statements to prevent SQL injection
 */
export class PermissionDao extends BaseDao {
  constructor(database: DatabaseConnection) {
    super(database);
  }

  /**
   * Get permission by ID
   * @param id Permission ID
   * @returns Permission or null
   */
  async getPermissionById(id: string): Promise<PermissionEntity | null> {
    const query = `
      SELECT id, name, description, "createdAt", "updatedAt"
      FROM permissions
      WHERE id = $1
    `;
    
    const result = await this.query<PermissionEntity>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get permission by name
   * @param name Permission name
   * @returns Permission or null
   */
  async getPermissionByName(name: string): Promise<PermissionEntity | null> {
    const query = `
      SELECT id, name, description, "createdAt", "updatedAt"
      FROM permissions
      WHERE name = $1
    `;
    
    const result = await this.query<PermissionEntity>(query, [name]);
    return result.rows[0] || null;
  }

  /**
   * Get all permissions
   * @returns Array of permissions
   */
  async getAllPermissions(): Promise<PermissionEntity[]> {
    const query = `
      SELECT id, name, description, "createdAt", "updatedAt"
      FROM permissions
      ORDER BY name
    `;
    
    const result = await this.query<PermissionEntity>(query);
    return result.rows;
  }

  /**
   * Get permissions by role ID
   * @param roleId Role ID
   * @returns Array of permissions for the role
   */
  async getPermissionsByRoleId(roleId: string): Promise<PermissionEntity[]> {
    const query = `
      SELECT p.id, p.name, p.description, p."createdAt", p."updatedAt"
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp."permissionId"
      WHERE rp."roleId" = $1
      ORDER BY p.name
    `;
    
    const result = await this.query<PermissionEntity>(query, [roleId]);
    return result.rows;
  }

  /**
   * Get permissions by user ID (through role)
   * @param userId User ID
   * @returns Array of permissions for the user
   */
  async getPermissionsByUserId(userId: string): Promise<PermissionEntity[]> {
    const query = `
      SELECT DISTINCT p.id, p.name, p.description, p."createdAt", p."updatedAt"
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp."permissionId"
      INNER JOIN users u ON rp."roleId" = u."roleId"
      WHERE u.id = $1
      ORDER BY p.name
    `;
    
    const result = await this.query<PermissionEntity>(query, [userId]);
    return result.rows;
  }

  /**
   * Create a new permission
   * @param permissionData Permission data
   * @returns Created permission
   */
  async createPermission(permissionData: CreatePermissionData): Promise<PermissionEntity> {
    const { columns, values, params } = this.buildInsertClause(permissionData);
    
    const query = `
      INSERT INTO permissions (${columns})
      VALUES (${values})
      RETURNING *
    `;
    
    const result = await this.query<PermissionEntity>(query, params);
    return result.rows[0];
  }

  /**
   * Update permission by ID
   * @param id Permission ID
   * @param updates Permission updates
   * @returns Updated permission or null
   */
  async updatePermission(id: string, updates: UpdatePermissionData): Promise<PermissionEntity | null> {
    const { setClause, params } = this.buildSetClause(updates);
    
    if (!setClause) {
      throw new Error('No updates provided');
    }

    const query = `
      UPDATE permissions 
      ${setClause}
      WHERE id = $${params.length + 1}
      RETURNING *
    `;
    
    const result = await this.query<PermissionEntity>(query, [...params, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete permission by ID
   * @param id Permission ID
   * @returns Boolean indicating success
   */
  async deletePermission(id: string): Promise<boolean> {
    const query = `DELETE FROM permissions WHERE id = $1`;
    const result = await this.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if permission name exists
   * @param name Permission name
   * @param excludePermissionId Optional permission ID to exclude from check
   * @returns Boolean indicating if name exists
   */
  async permissionNameExists(name: string, excludePermissionId?: string): Promise<boolean> {
    let query = `SELECT id FROM permissions WHERE name = $1`;
    const params = [name];

    if (excludePermissionId) {
      query += ` AND id != $2`;
      params.push(excludePermissionId);
    }

    const result = await this.query(query, params);
    return result.rows.length > 0;
  }

  /**
   * Check if user has specific permission
   * @param userId User ID
   * @param permissionName Permission name
   * @returns Boolean indicating if user has permission
   */
  async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp."permissionId"
      INNER JOIN users u ON rp."roleId" = u."roleId"
      WHERE u.id = $1 AND p.name = $2
      LIMIT 1
    `;
    
    const result = await this.query(query, [userId, permissionName]);
    return result.rows.length > 0;
  }

  /**
   * Get permissions with pagination
   * @param options Query options
   * @returns Permissions and total count
   */
  async getPermissions(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ permissions: PermissionEntity[]; total: number }> {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM permissions 
      ${whereClause}
    `;
    const countResult = await this.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get permissions with pagination
    const permissionsQuery = `
      SELECT id, name, description, "createdAt", "updatedAt"
      FROM permissions
      ${whereClause}
      ORDER BY name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const permissionsResult = await this.query<PermissionEntity>(permissionsQuery, [...params, limit, offset]);

    return {
      permissions: permissionsResult.rows,
      total
    };
  }
}