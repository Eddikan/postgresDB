import { BaseDao } from './BaseDao';
import { Role, RoleName, Permission } from '../entities';
import { DatabaseConnection } from '../datasource';

export interface RoleWithPermissions extends Omit<Role, 'permissions'> {
  permissions?: string[];
}

export interface CreateRoleData {
  name: string;
  description?: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}

/**
 * Role Data Access Object with SQL injection protection
 * All queries use parameterized statements to prevent SQL injection
 */
export class RoleDao extends BaseDao {
  constructor(database: DatabaseConnection) {
    super(database);
  }

  /**
   * Get role by ID with permissions
   * @param id Role ID
   * @returns Role with permissions or null
   */
  async getRoleById(id: string): Promise<RoleWithPermissions | null> {
    const query = `
      SELECT 
        r.id, r.name, r.description, r."createdAt", r."updatedAt",
        array_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p ON rp."permissionId" = p.id
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.description, r."createdAt", r."updatedAt"
    `;
    
    const result = await this.query<RoleWithPermissions>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get role by name with permissions
   * @param name Role name
   * @returns Role with permissions or null
   */
  async getRoleByName(name: string): Promise<RoleWithPermissions | null> {
    const query = `
      SELECT 
        r.id, r.name, r.description, r."createdAt", r."updatedAt",
        array_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p ON rp."permissionId" = p.id
      WHERE r.name = $1
      GROUP BY r.id, r.name, r.description, r."createdAt", r."updatedAt"
    `;
    
    const result = await this.query<RoleWithPermissions>(query, [name]);
    return result.rows[0] || null;
  }

  /**
   * Get all roles with permissions
   * @returns Array of roles with permissions
   */
  async getAllRoles(): Promise<RoleWithPermissions[]> {
    const query = `
      SELECT 
        r.id, r.name, r.description, r."createdAt", r."updatedAt",
        array_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p ON rp."permissionId" = p.id
      GROUP BY r.id, r.name, r.description, r."createdAt", r."updatedAt"
      ORDER BY r.name
    `;
    
    const result = await this.query<RoleWithPermissions>(query);
    return result.rows;
  }

  /**
   * Create a new role
   * @param roleData Role data
   * @returns Created role
   */
  async createRole(roleData: CreateRoleData): Promise<Role> {
    const { columns, values, params } = this.buildInsertClause(roleData);
    
    const query = `
      INSERT INTO roles (${columns})
      VALUES (${values})
      RETURNING *
    `;
    
    const result = await this.query<Role>(query, params);
    return result.rows[0];
  }

  /**
   * Update role by ID
   * @param id Role ID
   * @param updates Role updates
   * @returns Updated role or null
   */
  async updateRole(id: string, updates: UpdateRoleData): Promise<Role | null> {
    const { setClause, params } = this.buildSetClause(updates);
    
    if (!setClause) {
      throw new Error('No updates provided');
    }

    const query = `
      UPDATE roles 
      ${setClause}
      WHERE id = $${params.length + 1}
      RETURNING *
    `;
    
    const result = await this.query<Role>(query, [...params, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete role by ID
   * @param id Role ID
   * @returns Boolean indicating success
   */
  async deleteRole(id: string): Promise<boolean> {
    const query = `DELETE FROM roles WHERE id = $1`;
    const result = await this.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Add permission to role
   * @param roleId Role ID
   * @param permissionId Permission ID
   * @returns Boolean indicating success
   */
  async addPermissionToRole(roleId: string, permissionId: string): Promise<boolean> {
    const query = `
      INSERT INTO role_permissions ("roleId", "permissionId")
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;
    const result = await this.query(query, [roleId, permissionId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Remove permission from role
   * @param roleId Role ID
   * @param permissionId Permission ID
   * @returns Boolean indicating success
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean> {
    const query = `
      DELETE FROM role_permissions 
      WHERE "roleId" = $1 AND "permissionId" = $2
    `;
    const result = await this.query(query, [roleId, permissionId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Set permissions for a role (replaces all existing permissions)
   * @param roleId Role ID
   * @param permissionIds Array of permission IDs
   * @returns Boolean indicating success
   */
  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<boolean> {
    return await this.transaction(async (query) => {
      // Remove all existing permissions for this role
      await query('DELETE FROM role_permissions WHERE "roleId" = $1', [roleId]);
      
      // Add new permissions
      for (const permissionId of permissionIds) {
        await query(
          'INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2)',
          [roleId, permissionId]
        );
      }
      
      return true;
    });
  }

  /**
   * Check if role name exists
   * @param name Role name
   * @param excludeRoleId Optional role ID to exclude from check
   * @returns Boolean indicating if name exists
   */
  async roleNameExists(name: string, excludeRoleId?: string): Promise<boolean> {
    let query = `SELECT id FROM roles WHERE name = $1`;
    const params = [name];

    if (excludeRoleId) {
      query += ` AND id != $2`;
      params.push(excludeRoleId);
    }

    const result = await this.query(query, params);
    return result.rows.length > 0;
  }

  /**
   * Get roles with pagination
   * @param options Query options
   * @returns Roles and total count
   */
  async getRoles(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ roles: RoleWithPermissions[]; total: number }> {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM roles r 
      ${whereClause}
    `;
    const countResult = await this.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get roles with pagination
    const rolesQuery = `
      SELECT 
        r.id, r.name, r.description, r."createdAt", r."updatedAt",
        array_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p ON rp."permissionId" = p.id
      ${whereClause}
      GROUP BY r.id, r.name, r.description, r."createdAt", r."updatedAt"
      ORDER BY r.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const rolesResult = await this.query<RoleWithPermissions>(rolesQuery, [...params, limit, offset]);

    return {
      roles: rolesResult.rows,
      total
    };
  }
}