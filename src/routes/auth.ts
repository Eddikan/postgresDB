import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserDao } from '../dataaccess';
import { databaseConnection } from '../datasource';
import { Permission, authenticate } from '../middleware/auth-sql';
import { config } from '../config/config';
import { CreateUserData, AccountStatus } from '../entities';

// Request body interfaces
interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
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
      if (user.accountStatus !== AccountStatus.ACTIVE) {
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
      const { email, password } = request.body;

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
        accountStatus: AccountStatus.PENDING,
        twoFactorEnabled: false
      };

      // Create user
      const newUser = await userDao.createUser(userData);

      reply.code(201).send({
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          accountStatus: newUser.accountStatus
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

      // Generate reset token (simplified version - in production, store in Redis or external service)
      const resetToken = jwt.sign({ userId: user.id, type: 'password_reset' }, config.JWT_SECRET, { expiresIn: '1h' });

      // TODO: Send email with reset token
      // For now, just return success (in production, would store token in Redis/cache and send email)
      console.log('Password reset token generated for user:', user.email, 'Token:', resetToken);
      reply.send({ 
        message: 'If the email exists, a reset link has been sent',
        // Remove this in production - only for development
        resetToken 
      });

    } catch (error) {
      console.error('Password reset error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Logout endpoint (simple response as JWT is stateless)
  fastify.post('/logout', async (request, reply) => {
    reply.send({ message: 'Logged out successfully' });
  });
}