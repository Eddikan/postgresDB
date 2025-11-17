import { SequelizeBaseDao } from './SequelizeBaseDao';
import { User, CreateUserData, UpdateUserData } from '../entities';
import UserModel from '../models/user.model';
import RoleModel from '../models/role.model';
import { PermissionDao } from './PermissionDao';
import { Op } from 'sequelize';

export interface UserWithRole extends User {
  roleName?: string;
  rolePermissions?: string[];
}

/**
 * User Data Access Object with Sequelize integration
 * All queries use Sequelize with parameterized statements for SQL injection protection
 */
export class UserDao extends SequelizeBaseDao {
  constructor() {
    super();
  }

  /**
   * Get user by ID with role information
   * @param id User ID
   * @returns User with role information or null
   */
  async getUserById(id: string): Promise<UserWithRole | null> {
    const user = await UserModel.findByPk(id);

    if (!user) {
      return null;
    }

    // Get role permissions if user has a role
    let rolePermissions: string[] = [];
    let roleName: string | undefined;
    
    if (user.roleId) {
      const permissionDao = new PermissionDao();
      const permissions = await permissionDao.getPermissionsByRoleId(user.roleId);
      rolePermissions = permissions.map(permission => permission.name);
      
      // Also get role name
      const role = await RoleModel.findByPk(user.roleId);
      roleName = role?.name;
    }

    const userWithRole: UserWithRole = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: user.password,
      accountStatus: user.accountStatus,
      roleId: user.roleId,
      organisationId: user.organisationId,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      twoFactorType: user.twoFactorType,
      twoFactorCode: user.twoFactorCode,
      twoFactorCodeExpires: user.twoFactorCodeExpires,
      twoFactorTarget: user.twoFactorTarget,
      lastLogin: user.lastLogin,
      invitationToken: user.invitationToken,
      invitationExpires: user.invitationExpires,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      activatedAt: user.activatedAt,
      has_changed_default_password: user.has_changed_default_password,
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleName: roleName,
      rolePermissions: rolePermissions
    };

    return userWithRole;
  }

  /**
   * Get user by email with role information
   * @param email User email
   * @returns User with role information or null
   */
  async getUserByEmail(email: string): Promise<UserWithRole | null> {
    const user = await UserModel.findOne({
      where: { email }
    });

    if (!user) {
      return null;
    }

    // Get role permissions if user has a role
    let rolePermissions: string[] = [];
    let roleName: string | undefined;
    
    if (user.roleId) {
      const permissionDao = new PermissionDao();
      const permissions = await permissionDao.getPermissionsByRoleId(user.roleId);
      rolePermissions = permissions.map(permission => permission.name);
      
      // Also get role name
      const role = await RoleModel.findByPk(user.roleId);
      roleName = role?.name;
    }

    // Convert Sequelize model to UserWithRole interface
    const userWithRole: UserWithRole = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: user.password,
      accountStatus: user.accountStatus,
      roleId: user.roleId,
      organisationId: user.organisationId,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      twoFactorType: user.twoFactorType,
      twoFactorCode: user.twoFactorCode,
      twoFactorCodeExpires: user.twoFactorCodeExpires,
      twoFactorTarget: user.twoFactorTarget,
      lastLogin: user.lastLogin,
      invitationToken: user.invitationToken,
      invitationExpires: user.invitationExpires,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      activatedAt: user.activatedAt,
      has_changed_default_password: user.has_changed_default_password,
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleName: roleName,
      rolePermissions: rolePermissions
    };

    return userWithRole;
  }

  /**
   * Get user by invitation token
   * @param token Invitation token
   * @returns User or null
   */
  async getUserByInvitationToken(token: string): Promise<User | null> {
    const user = await UserModel.findOne({
      where: {
        invitationToken: token,
        invitationExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    return user ? user.toJSON() as User : null;
  }

  /**
   * Create a new user
   * @param userData User data
   * @returns Created user
   */
  async createUser(userData: CreateUserData): Promise<User> {
      // If roleId is provided, check if it exists
      if (userData.roleId) {
        const role = await RoleModel.findByPk(userData.roleId);
        if (!role) {
          throw new Error('Role does not exist: ' + userData.roleId);
        }
      }

      const user = await UserModel.create(userData as any);
      return user.toJSON() as User;
  }

  /**
   * Update user by ID
   * @param id User ID
   * @param updates User updates
   * @returns Updated user or null
   */
  async updateUser(id: string, updates: Omit<UpdateUserData, 'id'>): Promise<User | null> {
    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    const [affectedRows] = await UserModel.update(updates as any, {
      where: { id },
      returning: true
    });

    if (affectedRows === 0) {
      return null;
    }

    // Fetch and return the updated user
    const updatedUser = await UserModel.findByPk(id);
    return updatedUser ? updatedUser.toJSON() as User : null;
  }

  /**
   * Delete user by ID
   * @param id User ID
   * @returns Boolean indicating success
   */
  async deleteUser(id: string): Promise<boolean> {
    const affectedRows = await UserModel.destroy({
      where: { id }
    });
    return affectedRows > 0;
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
    const whereConditions: any = {};

    if (roleId) {
      whereConditions.roleId = roleId;
    }

    if (isActive !== undefined) {
      whereConditions.accountStatus = isActive ? 'active' : 'inactive';
    }

    if (search) {
      whereConditions[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get users with pagination
    const result = await UserModel.findAndCountAll({
      where: whereConditions,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Convert Sequelize models to UserWithRole interface
    const users: UserWithRole[] = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: user.password,
      accountStatus: user.accountStatus,
      roleId: user.roleId,
      organisationId: user.organisationId,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      twoFactorType: user.twoFactorType,
      twoFactorCode: user.twoFactorCode,
      twoFactorCodeExpires: user.twoFactorCodeExpires,
      twoFactorTarget: user.twoFactorTarget,
      lastLogin: user.lastLogin,
      invitationToken: user.invitationToken,
      invitationExpires: user.invitationExpires,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      activatedAt: user.activatedAt,
      has_changed_default_password: user.has_changed_default_password,
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // roleName: (user as any).role?.name, // Will work once associations are set up
      // rolePermissions: [] // Will need proper association setup
    }));

    return {
      users,
      total: result.count
    };
  }

  /**
   * Update user's last login timestamp
   * @param id User ID
   * @returns Boolean indicating success
   */
  async updateLastLogin(id: string): Promise<boolean> {
    const [affectedRows] = await UserModel.update(
      { lastLogin: new Date() },
      { where: { id } }
    );
    return affectedRows > 0;
  }

  /**
   * Clear invitation token after activation
   * @param id User ID
   * @returns Boolean indicating success
   */
  async clearInvitationToken(id: string): Promise<boolean> {
    const [affectedRows] = await UserModel.update(
      { 
        invitationToken: null,
        invitationExpires: null,
        activatedAt: new Date()
      },
      { where: { id } }
    );
    return affectedRows > 0;
  }

  /**
   * Get user by 2FA target (email or phone number)
   * @param target Email address or phone number used for 2FA
   * @returns User with role information or null
   */
  async getUserByTwoFactorTarget(target: string): Promise<UserWithRole | null> {
    const user = await UserModel.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { email: target },
              { twoFactorTarget: target }
            ]
          },
          { twoFactorEnabled: true }
        ]
      }
    });

    if (!user) {
      return null;
    }

    // Get role permissions if user has a role
    let rolePermissions: string[] = [];
    let roleName: string | undefined;
    
    if (user.roleId) {
      const permissionDao = new PermissionDao();
      const permissions = await permissionDao.getPermissionsByRoleId(user.roleId);
      rolePermissions = permissions.map(permission => permission.name);
      
      // Also get role name
      const role = await RoleModel.findByPk(user.roleId);
      roleName = role?.name;
    }

    // Convert to UserWithRole interface
    const userWithRole: UserWithRole = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: user.password,
      accountStatus: user.accountStatus,
      roleId: user.roleId,
      organisationId: user.organisationId,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      twoFactorType: user.twoFactorType,
      twoFactorCode: user.twoFactorCode,
      twoFactorCodeExpires: user.twoFactorCodeExpires,
      twoFactorTarget: user.twoFactorTarget,
      lastLogin: user.lastLogin,
      invitationToken: user.invitationToken,
      invitationExpires: user.invitationExpires,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      activatedAt: user.activatedAt,
      has_changed_default_password: user.has_changed_default_password,
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleName: roleName,
      rolePermissions: rolePermissions
    };

    return userWithRole;
  }

  /**
   * Check if email exists
   * @param email Email to check
   * @param excludeUserId Optional user ID to exclude from check
   * @returns Boolean indicating if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const whereConditions: any = { email };

    if (excludeUserId) {
      whereConditions.id = { [Op.ne]: excludeUserId };
    }

    const count = await UserModel.count({
      where: whereConditions
    });
    
    return count > 0;
  }

  /**
   * Create a user for organisation setup (superadmin)
   * @param userData User data including organisation info
   * @returns Created user with role information
   */
  async createOrganisationUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    password: string;
    accountStatus?: string;
    organisationId: string;
    roleId: string;
  }): Promise<UserWithRole | null> {
    const user = await UserModel.create({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      password: userData.password,
      organisationId: userData.organisationId,
      roleId: userData.roleId,
      accountStatus: userData.accountStatus || 'active',
      has_changed_default_password: false
    });

    return this.getUserById(user.id);
  }

  /**
   * Check if an organisation already has a superadmin
   * @param organisationId Organisation ID
   * @returns True if superadmin exists
   */
  async organisationHasSuperAdmin(organisationId: string): Promise<boolean> {
    const count = await UserModel.count({
      include: [{
        model: RoleModel,
        where: { name: 'super_admin' }
      }],
      where: { organisationId }
    });
    
    return count > 0;
  }

  /**
   * Get users by organisation
   * @param organisationId Organisation ID
   * @returns Array of users
   */
  async getUsersByOrganisation(organisationId: string): Promise<UserWithRole[]> {
    const users = await UserModel.findAll({
      where: { organisationId },
      include: [{
        model: RoleModel,
        attributes: ['name', 'description']
      }]
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      password: user.password,
      accountStatus: user.accountStatus,
      roleId: user.roleId,
      organisationId: user.organisationId,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      twoFactorType: user.twoFactorType,
      twoFactorCode: user.twoFactorCode,
      twoFactorCodeExpires: user.twoFactorCodeExpires,
      twoFactorTarget: user.twoFactorTarget,
      lastLogin: user.lastLogin,
      invitationToken: user.invitationToken,
      invitationExpires: user.invitationExpires,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      activatedAt: user.activatedAt,
      passwordChangedAt: user.passwordChangedAt,
      has_changed_default_password: user.has_changed_default_password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleName: (user as any).Role?.name
    }));
  }

  /**
   * Get users by organisation ID
   * @param organisationId Organisation ID
   * @returns Array of users
   */
  async getUsersByOrganisationId(organisationId: string): Promise<User[]> {
    const users = await UserModel.findAll({
      where: { organisationId },
      include: [{
        model: RoleModel,
        attributes: ['name', 'description']
      }],
      order: [['createdAt', 'DESC']]
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      password: user.password,
      accountStatus: user.accountStatus,
      roleId: user.roleId,
      organisationId: user.organisationId,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      twoFactorType: user.twoFactorType,
      twoFactorCode: user.twoFactorCode,
      twoFactorCodeExpires: user.twoFactorCodeExpires,
      twoFactorTarget: user.twoFactorTarget,
      lastLogin: user.lastLogin,
      invitationToken: user.invitationToken,
      invitationExpires: user.invitationExpires,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      activatedAt: user.activatedAt,
      passwordChangedAt: user.passwordChangedAt,
      has_changed_default_password: user.has_changed_default_password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleName: (user as any).Role?.name
    }));
  }
}