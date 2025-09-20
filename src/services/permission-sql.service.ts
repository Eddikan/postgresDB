import { Permission, UserProfile } from '../middleware/auth-sql';

export class PermissionService {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(user: UserProfile, permission: Permission): boolean {
    if (!user.role || !user.role.permissions) {
      return false;
    }

    return user.role.permissions.includes(permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(user: UserProfile, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(user: UserProfile, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if a user is an admin (super_admin or admin)
   */
  static isAdmin(user: UserProfile): boolean {
    if (!user.role) {
      return false;
    }

    return user.role.name === 'super_admin' || user.role.name === 'admin';
  }

  /**
   * Check if a user is a super admin
   */
  static isSuperAdmin(user: UserProfile): boolean {
    if (!user.role) {
      return false;
    }

    return user.role.name === 'super_admin';
  }

  /**
   * Get all permissions for a user
   */
  static getUserPermissions(user: UserProfile): Permission[] {
    if (!user.role || !user.role.permissions) {
      return [];
    }

    return user.role.permissions;
  }
}