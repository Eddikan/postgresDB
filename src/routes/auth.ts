import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserDao } from '../dataaccess';
import { databaseConnection } from '../datasource';
import { UserStatus, Permission, authenticate } from '../middleware/auth-sql';
import { config } from '../config/config';
import { CreateUserData } from '../entities';

// Request body interfaces
interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  phoneNumber?: string;
}

interface PasswordResetBody {
  email: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Initialize UserDao
  const userDao = new UserDao(databaseConnection);

  // Login endpoint
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    try {
      const { email, password } = request.body;
      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      // Get user with role and permissions using UserDao
      const user = await userDao.getUserByEmail(email);

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Check password (user.passwordHash contains the hash from database)
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        return reply.code(403).send({ error: 'Account is inactive' });
      }

      // Update last login
      await userDao.updateLastLogin(user.id);

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.roleName
        },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return user data (without password) and token
      const userResponse = {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: user.status,
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

      reply.send({
        message: 'Login successful',
        user: userResponse,
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Register endpoint
  fastify.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    try {
      const { email, password, phoneNumber } = request.body;

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUser = await userDao.getUserByEmail(email);
      if (existingUser) {
        return reply.code(409).send({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user data
      const userData: CreateUserData = {
        email,
        passwordHash,
        phoneNumber,
        status: UserStatus.ACTIVE,
        twoFactorEnabled: false
      };

      // Create user
      const newUser = await userDao.createUser(userData);

      reply.code(201).send({
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          status: newUser.status
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Password reset request endpoint
  fastify.post<{ Body: PasswordResetBody }>('/password-reset', async (request, reply) => {
    try {
      const { email } = request.body;

      if (!email) {
        return reply.code(400).send({ error: 'Email is required' });
      }

      // Check if user exists
      const user = await userDao.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        return reply.send({ message: 'If the email exists, a reset link has been sent' });
      }

      // Generate reset token
      const resetToken = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '1h' });
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Update user with reset token
      await userDao.updateUser(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });

      // TODO: Send email with reset token
      // For now, just return success
      reply.send({ message: 'If the email exists, a reset link has been sent' });

    } catch (error) {
      console.error('Password reset error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user endpoint (protected)
  fastify.get('/me', { preHandler: authenticate }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const user = await userDao.getUserById(userId);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const userResponse = {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: user.status,
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
      console.error('Get user error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Logout endpoint (simple response as JWT is stateless)
  fastify.post('/logout', async (request, reply) => {
    reply.send({ message: 'Logged out successfully' });
  });
}