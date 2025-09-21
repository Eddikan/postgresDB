import { FastifyRequest, FastifyReply } from 'fastify';
import { UserStatus } from './auth-sql';

/**
 * Middleware to check if user's account is active
 * Blocks access to routes for inactive accounts, except password change routes
 */
export const checkAccountActive = async (request: FastifyRequest, reply: FastifyReply) => {
  // Skip check if user is not authenticated
  if (!request.userProfile) {
    return;
  }

  // Allow access to these routes even if account is inactive
  const allowedInactiveRoutes = [
    '/profile/password',
    '/auth/logout',
    '/activate-account'
  ];

  // Check if current route is allowed for inactive accounts
  const isAllowedRoute = allowedInactiveRoutes.some(route => 
    request.url.includes(route)
  );

  if (isAllowedRoute) {
    return; // Allow access
  }

  // Block access if account is not active
  if (request.userProfile.status !== UserStatus.ACTIVE) {
    return reply.code(403).send({
      error: 'Account inactive. Please change your password to activate your account.',
      accountStatus: request.userProfile.status,
      activationRequired: true
    });
  }
};

/**
 * Middleware specifically for routes that require active account
 * More explicit version of checkAccountActive
 */
export const requireActiveAccount = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.userProfile) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  if (request.userProfile.status !== UserStatus.ACTIVE) {
    return reply.code(403).send({
      error: 'Account inactive. Please change your password to activate your account.',
      accountStatus: request.userProfile.status,
      activationRequired: true
    });
  }
};