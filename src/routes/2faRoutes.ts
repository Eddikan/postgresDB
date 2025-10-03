import { FastifyInstance } from 'fastify';
import { TwoFactorService, TwoFactorSetupRequest, TwoFactorVerificationRequest } from '../services/twoFactor.service';
import { TwoFactorType } from '../entities/User';
import { authenticate } from '../middleware';
import { requireActiveAccount } from '../middleware/account-status';
import { requireJWT } from '@/middleware/auth-sql';

export async function twoFactorRoutes(fastify: FastifyInstance) {
  const twoFactorService = new TwoFactorService();

  /**
   * POST /2fa/setup
   * Setup 2FA for the authenticated user
   */
  fastify.post<{
    Body: TwoFactorSetupRequest;
  }>('/setup', {
    preHandler: [authenticate, requireActiveAccount]
  }, async (request, reply) => {
    try {
      const { type, target } = request.body;
      const userId = request.userProfile!.id;

      // Validate input
      if (!Object.values(TwoFactorType).includes(type)) {
        return reply.status(400).send({
          error: 'Invalid 2FA type',
          validTypes: Object.values(TwoFactorType)
        });
      }

      if (type !== TwoFactorType.TOTP && !target) {
        return reply.status(400).send({
          error: 'Target (email or phone) is required for email and SMS 2FA'
        });
      }

      const result = await twoFactorService.setup(userId, { type, target });

      if (result.success) {
        // Get updated user data to include expiration time for OTP codes
        const { UserDao } = await import('../dataaccess');
        const { databaseConnection } = await import('../datasource');
        const userDao = new UserDao(databaseConnection);
        const updatedUser = await userDao.getUserById(userId);

        // Calculate minutes before code expires for Email/SMS
        let minutesBeforeCodeExpires: number | undefined = undefined;
        if (updatedUser?.twoFactorCodeExpires) {
          const now = new Date();
          const expiresAt = new Date(updatedUser.twoFactorCodeExpires);
          const diffInMs = expiresAt.getTime() - now.getTime();
          minutesBeforeCodeExpires = Math.max(0, Math.ceil(diffInMs / (1000 * 60))); // Round up to nearest minute
        }

        return reply.status(200).send({
          message: result.message,
          qrCode: result.qrCode, // Only present for TOTP
          type: type,
          minutesBeforeCodeExpires // Only present for Email/SMS
        });
      } else {
        return reply.status(400).send({ error: result.error });
      }
    } catch (error: any) {
      fastify.log.error('2FA setup error:', error);
    console.error('2FA setup error:', error);
      return reply.status(500).send({ error: 'Setup failed' });
    }
  });

  /**
   * POST /2fa/send-otp
   * Send OTP code with type specification
   */
  fastify.post<{
    Body: {
      type: 'setup' | 'login';
      method?: 'email' | 'sms' | 'totp'; // 2FA method for setup
      target?: string; // Required for login type (email or phone number)
    };
  }>('/send-otp',{
      preHandler: requireJWT
    }, async (request, reply) => {
    try {
      const { type, method, target } = request.body;

      if (!type || !['setup', 'login'].includes(type)) {
        return reply.status(400).send({
          error: 'Type is required and must be either "setup" or "login"'
        });
      }

      if (type === 'setup') {
        // For setup - requires authentication
        if (!request.userProfile) {
          return reply.status(401).send({ error: 'Authentication required for setup OTP' });
        }

        // TOTP doesn't require sending OTP (uses QR code)
        if (method === 'totp') {
          return reply.status(400).send({
            error: 'TOTP does not require sending OTP codes. Use QR code from setup instead.'
          });
        }

        // For email/sms setup, we can send OTP
        const userId = request.userProfile.id;
        const result = await twoFactorService.sendOTP(userId);

        if (result.success) {
          return reply.status(200).send({ message: result.message });
        } else {
          return reply.status(400).send({ error: result.error });
        }
      } else if (type === 'login') {
        // For login - no authentication required, but target is needed
        if (!target) {
          return reply.status(400).send({
            error: 'Target (email or phone number) is required for login OTP'
          });
        }

        // Import UserDao to get user by target (email or phone)
        const { UserDao } = await import('../dataaccess');
        const { databaseConnection } = await import('../datasource');
        const userDao = new UserDao(databaseConnection);
        
        // Get user by target (email or phone number)
        const user = await userDao.getUserByTwoFactorTarget(target);
        if (!user) {
          // Don't reveal if user exists or not for security
          return reply.status(400).send({
            error: 'Invalid target or 2FA not configured'
          });
        }

        // Check if user has TOTP enabled (no OTP sending needed)
        if (user.twoFactorType === 'totp') {
          return reply.status(400).send({
            error: 'TOTP users should use their authenticator app. No OTP code needed.'
          });
        }

        const result = await twoFactorService.sendLoginOTP(user.id);

        if (result.success) {
          return reply.status(200).send({ message: result.message });
        } else {
          return reply.status(400).send({ error: result.error });
        }
      }
    } catch (error: any) {
      fastify.log.error('Send OTP error:', error);
      return reply.status(500).send({ error: 'Failed to send OTP' });
    }
  });

  /**
   * POST /2fa/verify
   * Verify 2FA code to complete setup or during authentication
   */
  fastify.post<{
    Body: {
      code: string;
    };
  }>('/verify', {
    preHandler: [authenticate, requireActiveAccount]
  }, async (request, reply) => {
    try {
      const { code } = request.body;
      const userId = request.userProfile!.id;

      if (!code || code.length !== 6) {
        return reply.status(400).send({
          error: 'Valid 6-digit code is required'
        });
      }

      const result = await twoFactorService.verify({ userId, code });

      if (result.success) {
        return reply.status(200).send({ message: result.message });
      } else {
        return reply.status(400).send({ error: result.error });
      }
    } catch (error: any) {
      fastify.log.error('2FA verification error:', error);
      return reply.status(500).send({ error: 'Verification failed' });
    }
  });

  /**
   * POST /2fa/verify-login
   * Verify 2FA code during login process (separate from setup)
   */
  fastify.post<{
    Body: {
      code: string;
      target: string; // Use target (email or phone) instead of userId for login flow
    };
  }>('/verify-login', async (request, reply) => {
    try {
      const { code, target } = request.body;

      if (!code || code.length !== 6) {
        return reply.status(400).send({
          error: 'Valid 6-digit code is required'
        });
      }

      if (!target) {
        return reply.status(400).send({
          error: 'Target (email or phone number) is required'
        });
      }

      // Import UserDao to get user by target
      const { UserDao } = await import('../dataaccess');
      const { databaseConnection } = await import('../datasource');
      const userDao = new UserDao(databaseConnection);
      
      // Get user by target (email or phone number)
      const user = await userDao.getUserByTwoFactorTarget(target);
      if (!user) {
        // Don't reveal if user exists or not for security
        return reply.status(400).send({
          error: 'Invalid target or 2FA not configured'
        });
      }

      const result = await twoFactorService.verifyForLogin(user.id, code);

      if (result.success) {
        // Import jwt for token generation
        const jwt = await import('jsonwebtoken');
        const { config } = await import('../config/config');

        // Update last login
        await userDao.updateLastLogin(user.id);

        // Generate JWT token (same as login route)
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.roleName
          },
          config.JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Return user data (same format as login route)
        const userResponse = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accountStatus: user.accountStatus,
          twoFactorEnabled: user.twoFactorEnabled,
          lastLogin: new Date(),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          role: user.roleId ? {
            id: user.roleId,
            name: user.roleName,
            permissions: user.rolePermissions?.filter((p: any) => p !== null) || []
          } : null
        };

        return reply.status(200).send({
          message: 'Login successful',
          user: userResponse,
          token
        });
      } else {
        return reply.status(400).send({ error: result.error });
      }
    } catch (error: any) {
      fastify.log.error('2FA login verification error:', error);
      return reply.status(500).send({ error: 'Verification failed' });
    }
  });

  /**
   * POST /2fa/disable
   * Disable 2FA for the authenticated user
   */
  fastify.post('/disable', {
    preHandler: [authenticate, requireActiveAccount]
  }, async (request, reply) => {
    try {
      const userId = request.userProfile!.id;

      const result = await twoFactorService.disable(userId);

      if (result.success) {
        return reply.status(200).send({ message: result.message });
      } else {
        return reply.status(400).send({ error: result.error });
      }
    } catch (error: any) {
      fastify.log.error('2FA disable error:', error);
      return reply.status(500).send({ error: 'Failed to disable 2FA' });
    }
  });

  /**
   * GET /2fa/status
   * Get current 2FA status for the authenticated user
   */
  fastify.get('/status', {
    preHandler: [authenticate, requireActiveAccount]
  }, async (request, reply) => {
    try {
      const userId = request.userProfile!.id;
      
      // Import UserDao to get complete user data
      const { UserDao } = await import('../dataaccess');
      const { databaseConnection } = await import('../datasource');
      const userDao = new UserDao(databaseConnection);
      
      // Get complete user from database
      const user = await userDao.getUserById(userId);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check 2FA requirement status
      const twoFactorService = new TwoFactorService();
      const requirement = await twoFactorService.checkTwoFactorRequirement(user);

      return reply.status(200).send({
        twoFactorEnabled: user.twoFactorEnabled || false,
        twoFactorType: user.twoFactorType || null,
        hasChangedDefaultPassword: user.has_changed_default_password || false,
        passwordChangedAt: user.passwordChangedAt || null,
        requirement: {
          required: requirement.required,
          daysRemaining: requirement.daysRemaining,
          blocked: requirement.blocked
        }
      });
    } catch (error: any) {
      fastify.log.error('2FA status error:', error);
      return reply.status(500).send({ error: 'Failed to get 2FA status' });
    }
  });
}