import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { UserStatus, Permission, authenticate } from '../middleware/auth-sql';
import { config } from '../config/config';

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
  // Login endpoint
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    try {
      console.log('here')

      const { email, password } = request.body;
      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      // Get user with password hash and role information
      const userQuery = `
        SELECT 
          u.id,
          u.email,
          u.password as password_hash,
          u."phoneNumber",
          u.status,
          u."twoFactorEnabled",
          u."lastLogin",
          u."createdAt",
          u."updatedAt",
          r.id as role_id,
          r.name as role_name,
          r.description as role_description,
          array_agg(p.name) as permissions
        FROM users u
        LEFT JOIN roles r ON u."roleId" = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE u.email = $1
        GROUP BY u.id, r.id, r.name, r.description
      `;

      const result = await db.query(userQuery, [email]);

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        return reply.code(403).send({ error: 'Account is inactive' });
      }

      // Update last login
      await db.query(
        'UPDATE users SET "lastLogin" = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role_name
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
        role: user.role_id ? {
          id: user.role_id,
          name: user.role_name,
          description: user.role_description,
          permissions: user.permissions?.filter((p: any) => p !== null) || []
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
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return reply.code(409).send({ error: 'User already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Get default role (user role)
      const roleQuery = await db.query(
        'SELECT id FROM roles WHERE name = $1',
        ['user']
      );

      if (roleQuery.rows.length === 0) {
        return reply.code(500).send({ error: 'Default role not found' });
      }

      const defaultRoleId = roleQuery.rows[0].id;

      // Create user
      const insertQuery = `
        INSERT INTO users (
          id, email, password, "phoneNumber", status, 
          "twoFactorEnabled", "roleId", "createdAt", "updatedAt"
        ) VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING id, email, "phoneNumber", status, 
                   "twoFactorEnabled", "createdAt", 
                   "updatedAt"
      `;

      const newUser = await db.query(insertQuery, [
        email,
        passwordHash,
        phoneNumber,
        UserStatus.ACTIVE,
        false,
        defaultRoleId
      ]);

      const user = newUser.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: 'user'
        },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      reply.code(201).send({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          status: user.status,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          role: {
            name: 'user'
          }
        },
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Password reset request endpoint
  fastify.post<{ Body: PasswordResetBody }>('/password-reset-request', async (request, reply) => {
    try {
      const { email } = request.body;

      if (!email) {
        return reply.code(400).send({ error: 'Email is required' });
      }

      // Check if user exists
      const userQuery = await db.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      );

      if (userQuery.rows.length === 0) {
        // Don't reveal if email exists or not for security
        return reply.send({
          message: 'If the email exists, a password reset link will be sent'
        });
      }

      const user = userQuery.rows[0];

      // Generate reset token (expires in 1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password-reset' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store reset token in database (create table if needed)
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            user_id UUID PRIMARY KEY REFERENCES users(id),
            token TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);

        await db.query(`
          INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
          VALUES ($1, $2, NOW() + INTERVAL '1 hour', NOW())
          ON CONFLICT (user_id) 
          DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '1 hour', created_at = NOW()
        `, [user.id, resetToken]);
      } catch (tableError) {
        console.error('Password reset token storage error:', tableError);
      }

      // TODO: Send email with reset link
      // For now, just return success (in production, integrate with email service)

      reply.send({
        message: 'If the email exists, a password reset link will be sent',
        // For development only - remove in production
        resetToken: resetToken
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user profile
  fastify.get('/profile', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      // User is available from JWT middleware
      const userProfile = (request as any).userProfile;

      if (!userProfile) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      reply.send({
        user: userProfile
      });

    } catch (error) {
      console.error('Profile error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
