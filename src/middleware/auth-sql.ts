import { FastifyRequest, FastifyReply } from 'fastify';
import passport from './passport';
import { PermissionService } from '../services/permission-sql.service';

// User status enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
}

// Permission enum (matching our database permissions)
export enum Permission {
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  INVITE_USER = 'INVITE_USER',
  CREATE_PROJECT = 'CREATE_PROJECT',
  READ_PROJECT = 'READ_PROJECT',
  UPDATE_PROJECT = 'UPDATE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  CREATE_DRILLING = 'CREATE_DRILLING',
  READ_DRILLING = 'READ_DRILLING',
  UPDATE_DRILLING = 'UPDATE_DRILLING',
  DELETE_DRILLING = 'DELETE_DRILLING',
  ADD_DATASET = 'ADD_DATASET',
  ADD_ENTRY = 'ADD_ENTRY',
  EDIT_DATASET = 'EDIT_DATASET',
  DELETE_DATASET = 'DELETE_DATASET',
  MANAGE_ROLES = 'MANAGE_ROLES',
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS'
}

// User interface for SQL results
export interface UserProfile {
  id: string;
  email: string;
  phoneNumber?: string;
  status: UserStatus;
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
      if (user.status !== UserStatus.ACTIVE) {
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
      if (user && user.status === UserStatus.ACTIVE) {
        request.userProfile = user;
      }
      resolve(user || null);
    })(request, reply);
  });
};