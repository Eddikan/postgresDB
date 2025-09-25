import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { UserDao } from '../dataaccess';
import { databaseConnection } from '../datasource';
import { authenticate } from '../middleware/auth-sql';
import { requireActiveAccount } from '../middleware/account-status';

// Request body interfaces
interface UpdateProfileBody {
  email?: string;
  phoneNumber?: string;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export async function profileRoutes(fastify: FastifyInstance) {
  // Initialize UserDao
  const userDao = new UserDao(databaseConnection);

  // Get logged-in user profile
  fastify.get('/profile', { preHandler: [authenticate, requireActiveAccount] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const user = await userDao.getUserById(userId);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountStatus: user.accountStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.roleId ? {
          id: user.roleId,
          name: user.roleName,
          permissions: user.rolePermissions?.filter((p: any) => p !== null) || []
        } : null
      };

      reply.send({ user: userResponse });

    } catch (error) {
      console.error('Get profile error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Edit profile fields
  fastify.put<{ Body: UpdateProfileBody }>('/profile', { preHandler: [authenticate, requireActiveAccount] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { email, phoneNumber } = request.body;

      // Validate input
      if (!email && !phoneNumber) {
        return reply.code(400).send({ error: 'At least one field must be provided for update' });
      }

      // Check if email is already taken by another user
      if (email) {
        const emailExists = await userDao.emailExists(email, userId);
        if (emailExists) {
          return reply.code(409).send({ error: 'Email already in use by another user' });
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (email) updateData.email = email;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;

      // Update user profile
      const updatedUser = await userDao.updateUser(userId, updateData);

      if (!updatedUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get updated user with role information
      const user = await userDao.getUserById(userId);

      const userResponse = {
        id: user!.id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        accountStatus: user!.accountStatus,
        twoFactorEnabled: user!.twoFactorEnabled,
        lastLogin: user!.lastLogin,
        createdAt: user!.createdAt,
        updatedAt: user!.updatedAt,
        role: user!.roleId ? {
          id: user!.roleId,
          name: user!.roleName,
          permissions: user!.rolePermissions?.filter((p: any) => p !== null) || []
        } : null
      };

      reply.send({
        message: 'Profile updated successfully',
        user: userResponse
      });

    } catch (error) {
      console.error('Update profile error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Change password
  fastify.put<{ Body: ChangePasswordBody }>('/profile/password', { preHandler: authenticate }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { currentPassword, newPassword } = request.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return reply.code(400).send({ error: 'Current password and new password are required' });
      }

      // Validate new password strength (you can customize these rules)
      if (newPassword.length < 8) {
        return reply.code(400).send({ error: 'New password must be at least 8 characters long' });
      }

      // Get current user
      const user = await userDao.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return reply.code(400).send({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await userDao.updateUser(userId, {
        passwordHash: newPasswordHash
      });

      reply.send({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}