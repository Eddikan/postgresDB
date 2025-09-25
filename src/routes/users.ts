import { FastifyInstance } from 'fastify';
import { UserDao } from '../dataaccess';
import { DatabaseConnection } from '../datasource';
import { authenticate, requirePermission, Permission } from '../middleware';
import { requireActiveAccount } from '../middleware/account-status';
import { AccountStatus } from '../entities';

export async function userRoutes(fastify: FastifyInstance) {
  // Initialize DAO
  const database = new DatabaseConnection();
  const userDao = new UserDao(database);

  /**
   * GET /users
   * Get all users with pagination and filtering
   */
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      roleId?: string;
      isActive?: string;
      search?: string;
    };
  }>('/', {
    preHandler: [authenticate, requireActiveAccount, requirePermission(Permission.READ_USER)]
  }, async (request, reply) => {
    try {
      const { page = '1', limit = '10', roleId, isActive, search } = request.query;

      // Parse and validate query parameters
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        return reply.status(400).send({
          error: 'Page must be a positive integer'
        });
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.status(400).send({
          error: 'Limit must be between 1 and 100'
        });
      }

      // Build query options
      const queryOptions: any = {
        page: pageNum,
        limit: limitNum
      };

      if (roleId) {
        queryOptions.roleId = roleId;
      }

      if (isActive !== undefined) {
        queryOptions.isActive = isActive === 'true';
      }

      if (search) {
        queryOptions.search = search.trim();
      }

      // Get users with pagination
      const result = await userDao.getUsers(queryOptions);

      // Remove sensitive information
      const sanitizedUsers = result.users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountStatus: user.accountStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roleId: user.roleId,
        roleName: user.roleName,
        rolePermissions: user.rolePermissions
      }));

      return reply.status(200).send({
        message: 'Users retrieved successfully',
        users: sanitizedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
          hasNext: pageNum * limitNum < result.total,
          hasPrev: pageNum > 1
        }
      });

    } catch (error: any) {
      fastify.log.error('Error retrieving users:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve users'
      });
    }
  });

  /**
   * GET /users/:id
   * Get a single user by ID
   */
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    preHandler: [authenticate, requireActiveAccount, requirePermission(Permission.READ_USER)]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate ID format (assuming UUID)
      if (!id || id.length < 1) {
        return reply.status(400).send({
          error: 'Valid user ID is required'
        });
      }

      // Get user by ID
      const user = await userDao.getUserById(id);

      if (!user) {
        return reply.status(404).send({
          error: 'User not found'
        });
      }

      // Remove sensitive information
      const sanitizedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountStatus: user.accountStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roleId: user.roleId,
        roleName: user.roleName,
        rolePermissions: user.rolePermissions
      };

      return reply.status(200).send({
        message: 'User retrieved successfully',
        user: sanitizedUser
      });

    } catch (error: any) {
      fastify.log.error('Error retrieving user:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve user'
      });
    }
  });

  /**
   * PUT /users/:id
   * Update user information (admin only)
   */
  fastify.put<{
    Params: {
      id: string;
    };
    Body: {
      email?: string;
      firstName?: string;
      lastName?: string;
      accountStatus?: AccountStatus;
      roleId?: string;
      twoFactorEnabled?: boolean;
    };
  }>('/:id', {
    preHandler: [authenticate, requireActiveAccount, requirePermission(Permission.UPDATE_USER)]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Validate ID
      if (!id || id.length < 1) {
        return reply.status(400).send({
          error: 'Valid user ID is required'
        });
      }

      // Check if user exists
      const existingUser = await userDao.getUserById(id);
      if (!existingUser) {
        return reply.status(404).send({
          error: 'User not found'
        });
      }

      // Check if email is being updated and is already taken
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await userDao.emailExists(updateData.email, id);
        if (emailExists) {
          return reply.status(409).send({
            error: 'Email already in use by another user'
          });
        }
      }

      // Update user
      const updatedUser = await userDao.updateUser(id, updateData);

      if (!updatedUser) {
        return reply.status(500).send({
          error: 'Failed to update user'
        });
      }

      // Get updated user with role information
      const user = await userDao.getUserById(id);

      // Remove sensitive information
      const sanitizedUser = {
        id: user!.id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        accountStatus: user!.accountStatus,
        twoFactorEnabled: user!.twoFactorEnabled,
        lastLogin: user!.lastLogin,
        createdAt: user!.createdAt,
        updatedAt: user!.updatedAt,
        roleId: user!.roleId,
        roleName: user!.roleName,
        rolePermissions: user!.rolePermissions
      };

      return reply.status(200).send({
        message: 'User updated successfully',
        user: sanitizedUser
      });

    } catch (error: any) {
      fastify.log.error('Error updating user:', error);
      return reply.status(500).send({
        error: 'Failed to update user'
      });
    }
  });

  /**
   * DELETE /users/:id
   * Delete user (admin only)
   */
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    preHandler: [authenticate, requireActiveAccount, requirePermission(Permission.DELETE_USER)]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate ID
      if (!id || id.length < 1) {
        return reply.status(400).send({
          error: 'Valid user ID is required'
        });
      }

      // Check if user exists
      const existingUser = await userDao.getUserById(id);
      if (!existingUser) {
        return reply.status(404).send({
          error: 'User not found'
        });
      }

      // Prevent deleting super admin
      if (existingUser.roleName === 'Super Admin') {
        return reply.status(403).send({
          error: 'Cannot delete super admin user'
        });
      }

      // Delete user
      const deleted = await userDao.deleteUser(id);

      if (!deleted) {
        return reply.status(500).send({
          error: 'Failed to delete user'
        });
      }

      return reply.status(200).send({
        message: 'User deleted successfully'
      });

    } catch (error: any) {
      fastify.log.error('Error deleting user:', error);
      return reply.status(500).send({
        error: 'Failed to delete user'
      });
    }
  });
}
