import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TwoFactorService } from '../services/twoFactor.service';
import { UserDao } from '../dataaccess/UserDao';
import { DatabaseConnection } from '../datasource';

export interface AuthCheckOptions {
  excludePaths?: string[]; // Paths to exclude from 2FA check
  excludePatterns?: RegExp[]; // Path patterns to exclude
}

/**
 * Global authentication hook to enforce 2FA requirement
 */
export function createAuthCheckHook(options: AuthCheckOptions = {}) {
  const defaultExcludePaths = [
    '/auth/login',
    '/auth/register', 
    '/auth/forgot-password',
    '/auth/reset-password',
    '/health',
    '/2fa/setup',
    '/2fa/verify',
    '/2fa/send-otp',
    '/2fa/status'
  ];

  const excludePaths = [...defaultExcludePaths, ...(options.excludePaths || [])];
  const excludePatterns = options.excludePatterns || [];

  return async function authCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Skip check for excluded paths
      const requestPath = request.url.split('?')[0]; // Remove query parameters
      
      if (excludePaths.includes(requestPath)) {
        return;
      }

      // Skip check for excluded patterns
      if (excludePatterns.some(pattern => pattern.test(requestPath))) {
        return;
      }

      // Skip if user is not authenticated
      const user = (request as any).user;
      if (!user || !user.id) {
        return; // Let other auth middleware handle this
      }

      // Get full user data to check 2FA requirements
      const userDao = new UserDao();
      const fullUser = await userDao.getUserById(user.id);
      
      if (!fullUser) {
        return reply.status(401).send({ 
          error: 'User not found' 
        });
      }

      // Check 2FA requirement
      const twoFactorService = new TwoFactorService();
      const requirement = await twoFactorService.checkTwoFactorRequirement(fullUser);

      if (requirement.blocked) {
        return reply.status(403).send({
          error: '2FA required before continuing',
          message: 'You must enable two-factor authentication to continue using the system. Your 7-day grace period has expired.',
          code: 'TWO_FACTOR_REQUIRED',
          requirement: {
            required: true,
            blocked: true,
            daysRemaining: 0
          }
        });
      }

      if (requirement.required && !requirement.blocked) {
        // Add warning header but allow the request to continue
        reply.header('X-2FA-Warning', `2FA setup recommended. ${requirement.daysRemaining} days remaining before access is blocked.`);
      }

    } catch (error) {
      // Log error but don't block the request
      console.error('Auth check hook error:', error);
    }
  };
}

/**
 * Register the auth check hook with Fastify
 */
export async function registerAuthCheckHook(fastify: FastifyInstance, options?: AuthCheckOptions) {
  const authCheckHook = createAuthCheckHook(options);

  // Register as a preHandler hook for all routes
  fastify.addHook('preHandler', authCheckHook);
}