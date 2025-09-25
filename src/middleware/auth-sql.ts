import { FastifyRequest, FastifyReply } from 'fastify';
import passport from './passport';
import { PermissionService } from '../services/permission-sql.service';
import { AccountStatus } from '../entities';

// Permission enum (matching DMP database permissions)
export enum Permission {
  // System Management (Super Admin only)
  SYSTEM_MANAGE_USERS = 'system.manage_users',
  SYSTEM_SCHEMA_CHANGES = 'system.schema_changes',
  SYSTEM_INTEGRATIONS = 'system.integrations',
  SYSTEM_AUDIT_LOGS = 'system.audit_logs',
  SYSTEM_OVERRIDE_CHANGES = 'system.override_changes',
  
  // Project Management
  PROJECT_CREATE = 'project.create',
  PROJECT_ARCHIVE = 'project.archive',
  PROJECT_READ = 'project.read',
  PROJECT_ASSIGN_PERMISSIONS = 'project.assign_permissions',
  
  // Drilling Operations & Logs
  DRILLING_APPROVE_LOGS = 'drilling.approve_logs',
  DRILLING_APPROVE_MODELS = 'drilling.approve_models',
  DRILLING_REVIEW_PROGRESS = 'drilling.review_progress',
  DRILLING_APPROVE_ADJUSTMENTS = 'drilling.approve_adjustments',
  DRILLING_VALIDATE_DATA = 'drilling.validate_data',
  DRILLING_INPUT_LOGS = 'drilling.input_logs',
  DRILLING_UPLOAD_PHOTOS = 'drilling.upload_photos',
  DRILLING_ENTER_ASSAYS = 'drilling.enter_assays',
  DRILLING_UPDATE_GEOLOGY = 'drilling.update_geology',
  DRILLING_INPUT_PROGRESS = 'drilling.input_progress',
  DRILLING_TRACK_SAMPLES = 'drilling.track_samples',
  DRILLING_UPLOAD_NOTES = 'drilling.upload_notes',
  DRILLING_READ = 'drilling.read',
  
  // Reporting & Analytics
  REPORTS_RUN_EXPORT = 'reports.run_export',
  REPORTS_CONFIGURE_DASHBOARDS = 'reports.configure_dashboards',
  REPORTS_RUN_VISUALIZATIONS = 'reports.run_visualizations',
  REPORTS_VIEW_DASHBOARDS = 'reports.view_dashboards',
  REPORTS_VIEW_ESG_METRICS = 'reports.view_esg_metrics',
  
  // Data Integrity
  DATA_DELETE_HISTORICAL = 'data.delete_historical',
  DATA_LOCK_VALIDATED = 'data.lock_validated',
  DATA_REQUIRE_APPROVAL = 'data.require_approval',
  
  // Site Access
  ACCESS_ALL_PROJECTS = 'access.all_projects',
  ACCESS_ASSIGNED_PROJECTS = 'access.assigned_projects'
}

// User interface for SQL results
export interface UserProfile {
  id: string;
  email: string;
  accountStatus: AccountStatus;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  role?: {
    id: string;
    name: string;
    permissions: Permission[];
    description?: string;
  };
}

// Extend FastifyRequest to include user profile
declare module 'fastify' {
  interface FastifyRequest {
    userProfile?: UserProfile;
  }
}

/**
 * Middleware to authenticate user using JWT
 */
export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: UserProfile) => {
      if (err) {
        return reject(err);
      }
      
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized Access' });
      }

      // Check if user is active
      if (user.accountStatus !== AccountStatus.ACTIVE) {
        return reply.code(403).send({ error: 'Account is inactive' });
      }

      request.userProfile = user;
      resolve(user);
    })(request, reply);
  });
};

/**
 * Middleware to require specific permissions
 */
export const requirePermission = (permission: Permission) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userProfile) {
      return reply.code(401).send({ error: 'Unauthorized Access' });
    }

    if (!PermissionService.hasPermission(request.userProfile, permission)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
};

/**
 * Middleware to require any of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userProfile) {
      return reply.code(401).send({ error: 'Unauthorized Access' });
    }

    if (!PermissionService.hasAnyPermission(request.userProfile, permissions)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
};

/**
 * Middleware to require admin role (super_admin or admin)
 */
export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.userProfile) {
    return reply.code(401).send({ error: 'Unauthorized Access' });
  }

  if (!PermissionService.isAdmin(request.userProfile)) {
    return reply.code(403).send({ error: 'Admin access required' });
  }
};

/**
 * Middleware to require super admin role
 */
export const requireSuperAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.userProfile) {
    return reply.code(401).send({ error: 'Unauthorized Access' });
  }

  if (!PermissionService.isSuperAdmin(request.userProfile)) {
    return reply.code(403).send({ error: 'Super admin access required' });
  }
};

/**
 * Optional authentication - doesn't fail if user is not authenticated
 */
export const optionalAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  return new Promise((resolve) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: UserProfile) => {
      if (user && user.accountStatus === AccountStatus.ACTIVE) {
        request.userProfile = user;
      }
      resolve(user || null);
    })(request, reply);
  });
};