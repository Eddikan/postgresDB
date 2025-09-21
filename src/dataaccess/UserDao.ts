import { BaseDao } from './BaseDao';
import { User, CreateUserData, UpdateUserData } from '../entities';
import { DatabaseConnection } from '../datasource';

export interface UserWithRole extends User {
  roleName?: string;
  rolePermissions?: string[];
}

/**
 * User Data Access Object with SQL injection protection
 * All queries use parameterized statements to prevent SQL injection
 */
export class UserDao extends BaseDao {
  constructor(database: DatabaseConnection) {
    super(database);
  }

  /**
   * Get user by ID with role information
   * @param id User ID
   * @returns User with role information or null
   */
  async getUserById(id: string): Promise<UserWithRole | null> {
    const query = `
      SELECT 
        u.id, u.email, u."firstName", u."lastName", u."phoneNumber", u.password as "passwordHash", u.status,
        u."twoFactorEnabled", u."twoFactorSecret", u."lastLogin",
        u."resetPasswordToken", u."resetPasswordExpires", u."invitationToken",
        u."invitationExpires", u."createdAt", u."updatedAt", u."roleId",
        r.name as "roleName",
        array_agg(p.name) FILTER (WHERE p.name IS NOT NULL) as "rolePermissions"
      FROM users u
      LEFT JOIN roles r ON u."roleId" = r.id
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p ON rp."permissionId" = p.id
      WHERE u.id = $1
      GROUP BY u.id, r.name
    `;
    
    const result = await this.query<UserWithRole>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get user by email with role information
   * @param email User email
   * @returns User with role information or null
   */
  async getUserByEmail(email: string): Promise<UserWithRole | null> {
    const query = `
      SELECT 
        u.id, u.email, u."firstName", u."lastName", u."phoneNumber", u.password as "passwordHash", u.status,
        u."twoFactorEnabled", u."twoFactorSecret", u."lastLogin",
        u."resetPasswordToken", u."resetPasswordExpires", u."invitationToken",
        u."invitationExpires", u."createdAt", u."updatedAt", u."roleId",
        r.name as "roleName",
        array_agg(p.name) FILTER (WHERE p.name IS NOT NULL) as "rolePermissions"
      FROM users u
      LEFT JOIN roles r ON u."roleId" = r.id
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p ON rp."permissionId" = p.id
      WHERE u.email = $1
      GROUP BY u.id, r.name
    `;
    
    const result = await this.query<UserWithRole>(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Get user by password reset token
   * @param token Password reset token
   * @returns User or null
   */
  async getUserByPasswordResetToken(token: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE "resetPasswordToken" = $1 
      AND "resetPasswordExpires" > NOW()
    `;
    
    const result = await this.query<User>(query, [token]);
    return result.rows[0] || null;
  }

  /**
   * Get user by invitation token
   * @param token Invitation token
   * @returns User or null
   */
  async getUserByInvitationToken(token: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE "invitationToken" = $1
    `;
    
    const result = await this.query<User>(query, [token]);
    return result.rows[0] || null;
  }

  /**
   * Create a new user
   * @param userData User data
   * @returns Created user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const { columns, values, params } = this.buildInsertClause(userData);
    
    const query = `
      INSERT INTO users (${columns})
      VALUES (${values})
      RETURNING *
    `;
    
    const result = await this.query<User>(query, params);
    return result.rows[0];
  }

  /**
   * Update user by ID
   * @param id User ID
   * @param updates User updates
   * @returns Updated user or null
   */
  async updateUser(id: string, updates: Omit<UpdateUserData, 'id'>): Promise<User | null> {
    const { setClause, params } = this.buildSetClause(updates);
    
    if (!setClause) {
      throw new Error('No updates provided');
    }

    const query = `
      UPDATE users 
      ${setClause}
      WHERE id = $${params.length + 1}
      RETURNING *
    `;
    
    const result = await this.query<User>(query, [...params, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete user by ID
   * @param id User ID
   * @returns Boolean indicating success
   */
  async deleteUser(id: string): Promise<boolean> {
    const query = `DELETE FROM users WHERE id = $1`;
    const result = await this.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get all users with pagination and optional filtering
   * @param options Query options
   * @returns Users and total count
   */
  async getUsers(options: {
    page?: number;
    limit?: number;
    roleId?: string;
    isActive?: boolean;
    search?: string;
  } = {}): Promise<{ users: UserWithRole[]; total: number }> {
    const { page = 1, limit = 10, roleId, isActive, search } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (roleId) {
      conditions.push(`u."roleId" = $${paramIndex++}`);
      params.push(roleId);
    }

    if (isActive !== undefined) {
      conditions.push(`u.status = $${paramIndex++}`);
      params.push(isActive ? 'active' : 'inactive');
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u."firstName" ILIKE $${paramIndex} OR u."lastName" ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      ${whereClause}
    `;
    const countResult = await this.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get users with pagination
    const usersQuery = `
      SELECT 
        u.id, u.email, u."firstName", u."lastName", u."phoneNumber",
        u."twoFactorEnabled", u.status, u."lastLogin", u."createdAt", u."updatedAt", u."roleId",
        r.name as "roleName",
        array_agg(p.name) as "rolePermissions"
      FROM users u
      LEFT JOIN roles r ON u."roleId" = r.id
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p ON rp."permissionId" = p.id
      ${whereClause}
      GROUP BY u.id, r.name
      ORDER BY u."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const usersResult = await this.query<UserWithRole>(usersQuery, [...params, limit, offset]);

    return {
      users: usersResult.rows,
      total
    };
  }

  /**
   * Update user's last login timestamp
   * @param id User ID
   * @returns Boolean indicating success
   */
  async updateLastLogin(id: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET "lastLogin" = NOW() 
      WHERE id = $1
    `;
    const result = await this.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Clear password reset token
   * @param id User ID
   * @returns Boolean indicating success
   */
  async clearPasswordResetToken(id: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET "resetPasswordToken" = NULL, "resetPasswordExpires" = NULL
      WHERE id = $1
    `;
    const result = await this.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if email exists
   * @param email Email to check
   * @param excludeUserId Optional user ID to exclude from check
   * @returns Boolean indicating if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    let query = `SELECT id FROM users WHERE email = $1`;
    const params = [email];

    if (excludeUserId) {
      query += ` AND id != $2`;
      params.push(excludeUserId);
    }

    const result = await this.query(query, params);
    return result.rows.length > 0;
  }
}