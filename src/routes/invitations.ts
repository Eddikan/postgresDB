import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { UserDao } from '../dataaccess';
import { DatabaseConnection } from '../datasource';
import { EmailService } from '../services';
import { authenticate, requirePermission, Permission } from '../middleware';
import { CreateUserData, AccountStatus, FieldRole } from '../entities';
import { config } from '../config/config';
import {Logger} from '../utils/Logger';

/**
 * User invitation routes
 */
export async function invitationRoutes(fastify: FastifyInstance) {
  // Initialize DAOs
  const database = new DatabaseConnection();
  const userDao = new UserDao();

  /**
   * POST /api/invitations/invite
   * Send user invitation
   */
  fastify.post<{
    Body: {
      email: string;
      firstName: string;
      lastName: string;
      roleId: string;
      fieldRole: string;
    };
  }>('/invite', {
    preHandler: [authenticate, requirePermission(Permission.SYSTEM_MANAGE_USERS)]
  }, async (request, reply) => {
    try {
      const { email, firstName, lastName, roleId, fieldRole } = request.body;
      // Validate required fields
      if (!email || !firstName || !lastName || !roleId || !fieldRole) {
        return reply.status(400).send({
          error: 'Email, first name, last name, role, and field role are required'
        });
      }

      // Validate fieldRole enum
      if (!Object.values(FieldRole).includes(fieldRole as FieldRole)) {
        return reply.status(400).send({
          error: 'Invalid field role. Must be one of: driller, geologist, miner'
        });
      }

      // Check if user already exists
      const existingUser = await userDao.getUserByEmail(email);
      if (existingUser) {
        return reply.status(409).send({
          error: 'User with this email already exists'
        });
      }

      // Generate secure password and invitation token
      const temporaryPassword = EmailService.generateSecurePassword();
      const invitationToken = EmailService.generateInvitationToken();
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      // Create user with inactive status
      const userData: CreateUserData = {
        email,
        firstName,
        lastName,
        password: passwordHash,
        accountStatus: AccountStatus.INACTIVE,
        roleId,
        fieldRole: fieldRole as FieldRole,
        twoFactorEnabled: false,
        invitedBy: request.userProfile!.id,  // Current authenticated user
        invitedAt: new Date()                // Current timestamp
      };
      const newUser = await userDao.createUser(userData);

      // Update user with invitation token
      await userDao.updateUser(newUser.id, {
        invitationToken,
        invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      const origin = request.headers.origin || request.headers.referer;
      const loginUrl = `${origin}/${config.FRONTEND_LOGIN_URL}`;
      // Send invitation email
      await EmailService.sendUserInvitationEmail(
        email,
        firstName,
        lastName,
        temporaryPassword,
        invitationToken,
        loginUrl
      );

      return reply.status(201).send({
        message: 'User invitation sent successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          accountStatus: newUser.accountStatus,
          roleId: newUser.roleId
        }
      });

    } catch (error: any) {
      console.log('error sendingss user invitation:',error)

      Logger.error('Error sendingsss user invitation:');
      return reply.status(500).send({
        error: 'Failed to send user invitation'
      });
    }
  });

  /**
   * POST /api/invitations/activate
   * Activate user account with invitation token (public endpoint - no auth required)
   */
  fastify.post<{
    Body: {
      token: string;
      newPassword: string;
    };
  }>('/activate', async (request, reply) => {
    try {
      const { token, newPassword } = request.body;

      // Validate required fields
      if (!token || !newPassword) {
        return reply.status(400).send({
          error: 'Token and new password are required'
        });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return reply.status(400).send({
          error: 'Password must be at least 8 characters long'
        });
      }

      // Find user by invitation token
      const user = await userDao.getUserByInvitationToken(token);
      if (!user) {
        return reply.status(400).send({
          error: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (user.invitationExpires && new Date() > user.invitationExpires) {
        return reply.status(400).send({
          error: 'Invitation token has expired'
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update user: activate account, set new password, clear invitation token
      await userDao.updateUser(user.id, {
        password: passwordHash,
        accountStatus: AccountStatus.ACTIVE,
        invitationToken: null,
        invitationExpires: null
      });

      return reply.status(200).send({
        message: 'Account activated successfully'
      });

    } catch (error: any) {
      fastify.log.error('Error activating user account:', error);
      return reply.status(500).send({
        error: 'Failed to activate account'
      });
    }
  });

  /**
   * POST /api/invitations/resend
   * Resend invitation email
   */
  fastify.post<{
    Body: {
      userId: string;
    };
  }>('/resend', {
    preHandler: [authenticate, requirePermission(Permission.SYSTEM_MANAGE_USERS)]
  }, async (request, reply) => {
    try {
      const { userId } = request.body;

      if (!userId) {
        return reply.status(400).send({
          error: 'User ID is required'
        });
      }

      // Get user details
      const user = await userDao.getUserById(userId);
      if (!user) {
        return reply.status(404).send({
          error: 'User not found'
        });
      }

      // Check if user is still inactive
      if (user.accountStatus !== AccountStatus.INACTIVE) {
        return reply.status(400).send({
          error: 'User account is already active'
        });
      }

      // Generate new temporary password and invitation token
      const temporaryPassword = EmailService.generateSecurePassword();
      const invitationToken = EmailService.generateInvitationToken();
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      // Update user with new credentials and token
      await userDao.updateUser(user.id, {
        password: passwordHash,
        invitationToken,
        invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      const origin = request.headers.origin || request.headers.referer;

      const loginUrl = `${origin}/${config.FRONTEND_LOGIN_URL}`;

      // Send new invitation email
      await EmailService.sendUserInvitationEmail(
        user.email,
        user.firstName || 'User',
        user.lastName || '',
        temporaryPassword,
        invitationToken,
        loginUrl
      );

      return reply.status(200).send({
        message: 'Invitation resent successfully'
      });

    } catch (error: any) {
      fastify.log.error('Error resending invitation:', error);
      return reply.status(500).send({
        error: 'Failed to resend invitation'
      });
    }
  });

  /**
   * GET /api/invitations/verify/:token
   * Verify invitation token validity (public endpoint - no auth required)
   */
  fastify.get<{
    Params: {
      token: string;
    };
  }>('/verify/:token', async (request, reply) => {
    try {
      const { token } = request.params;

      // Find user by invitation token
      const user = await userDao.getUserByInvitationToken(token);
      if (!user) {
        return reply.status(400).send({
          valid: false,
          error: 'Invalid invitation token'
        });
      }

      // Check if invitation has expired
      if (user.invitationExpires && new Date() > user.invitationExpires) {
        return reply.status(400).send({
          valid: false,
          error: 'Invitation token has expired'
        });
      }

      // Check if user is already active
      if (user.accountStatus === AccountStatus.ACTIVE) {
        return reply.status(400).send({
          valid: false,
          error: 'Account is already active'
        });
      }

      return reply.status(200).send({
        valid: true,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });

    } catch (error: any) {
      fastify.log.error('Error verifying invitation token:', error);
      return reply.status(500).send({
        valid: false,
        error: 'Failed to verify invitation token'
      });
    }
  });
}