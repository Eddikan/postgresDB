import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserDao } from '../dataaccess';
import { databaseConnection } from '../datasource';
import { Permission, authenticate, requireJWT } from '../middleware/auth-sql';
import { config } from '../config/config';
import { CreateUserData, AccountStatus } from '../entities';
import { TwoFactorService } from '../services/twoFactor.service';

// Request body interfaces
interface LoginBody {
  email: string;
  password: string;
  twoFactorCode?: string; // Optional 2FA code
}

interface RegisterBody {
  email: string;
  password: string;
}

interface PasswordResetBody {
  email: string;
}

interface ChangePasswordBody {
  newPassword: string;
  confirmPassword: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Initialize UserDao and TwoFactorService
  const userDao = new UserDao(databaseConnection);
  const twoFactorService = new TwoFactorService();

  // Login endpoint
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    try {
      const { email, password, twoFactorCode } = request.body;
      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      // Get user with role and permissions using UserDao
      const user = await userDao.getUserByEmail(email);
      if (!user) {
        return reply.code(401).send({ error: 'Email not found' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return reply.code(401).send({ error: 'Incorrect password' });
      }

      // Check if password has been changed and account is inactive
      if (!user.has_changed_default_password && user.accountStatus === AccountStatus.INACTIVE) {
        // Generate JWT token for password change flow
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.roleName,
            // Add special claim to indicate this is for password change only
            passwordChangeRequired: true
          },
          config.JWT_SECRET,
          { expiresIn: '1h' } // Shorter expiry for this flow
        );

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
          has_changed_default_password: user.has_changed_default_password,
          role: user.roleId ? {
            id: user.roleId,
            name: user.roleName,
            permissions: user.rolePermissions?.filter((p: any) => p !== null) || []
          } : null
        };
        return reply.code(403).send({
          error: 'Default password has not been changed so account is inactive.',
          message: 'Please change your default password to activate your account.',
          user: userResponse,
          token // Include token for password change
        });
      }

      // Check if user is active
      if (user.accountStatus !== AccountStatus.ACTIVE) {
        return reply.code(403).send({ error: 'Account is inactive' });
      }

      // Handle 2FA verification if enabled
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          // For Email/SMS, automatically send login OTP
          if (user.twoFactorType === 'email' || user.twoFactorType === 'sms') {
            const otpResult = await twoFactorService.sendLoginOTP(user.id);
            return reply.code(200).send({
              requiresTwoFactor: true,
              twoFactorType: user.twoFactorType,
              userId: user.id,
              message: otpResult.success 
                ? `2FA code sent to your ${user.twoFactorType}. Please enter the code to complete login.`
                : 'Please provide your 2FA code to complete login',
              otpSent: otpResult.success
            });
          } else {
            // For TOTP
            return reply.code(200).send({
              requiresTwoFactor: true,
              twoFactorType: user.twoFactorType,
              userId: user.id,
              message: 'Please enter your authenticator code to complete login'
            });
          }
        }

        // Verify 2FA code
        const twoFactorResult = await twoFactorService.verifyForLogin(user.id, twoFactorCode);
        if (!twoFactorResult.success) {
          return reply.code(401).send({ 
            error: twoFactorResult.error || 'Invalid 2FA code' 
          });
        }
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
        password: passwordHash,
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

  // Change password endpoint
  fastify.post<{ Body: ChangePasswordBody }>('/change-password', {
    preHandler: requireJWT
  }, async (request, reply) => {
    try {
      const { newPassword, confirmPassword } = request.body;
      const userId = request.userProfile!.id;

      // Validation
      if (!newPassword || !confirmPassword) {
        return reply.code(400).send({ 
          error: 'New password and confirm password are required' 
        });
      }

      if (newPassword !== confirmPassword) {
        return reply.code(400).send({ 
          error: 'New password and confirm password do not match' 
        });
      }

      // Password strength validation
      if (newPassword.length < 8) {
        return reply.code(400).send({ 
          error: 'Password must be at least 8 characters long' 
        });
      }

      // Additional password requirements (optional)
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        return reply.code(400).send({
          error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        });
      }

      // Get user to verify they exist
      const user = await userDao.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and set has_changed_default_password to true
      const updatedUser = await userDao.updateUser(userId, {
        password: hashedPassword,
        has_changed_default_password: true,
        passwordChangedAt: new Date(),
        // If account was inactive due to default password, activate it
        accountStatus: user.accountStatus === AccountStatus.INACTIVE ? AccountStatus.ACTIVE : user.accountStatus
      });

      if (!updatedUser) {
        return reply.code(500).send({ error: 'Failed to update password' });
      }

      reply.send({
        message: 'Password changed successfully',
        hasChangedDefaultPassword: true,
        accountStatus: updatedUser.accountStatus
      });

    } catch (error) {
      console.error('Change password error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user details endpoint
  fastify.get('/me', {
    preHandler: requireJWT
  }, async (request, reply) => {
    try {
      const userId = request.userProfile!.id;

      // Get complete user details from database
      const user = await userDao.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Return user data (without password)
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountStatus: user.accountStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorType: user.twoFactorType,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        has_changed_default_password: user.has_changed_default_password,
        passwordChangedAt: user.passwordChangedAt,
        role: user.roleId ? {
          id: user.roleId,
          name: user.roleName,
          permissions: user.rolePermissions?.filter((p: any) => p !== null) || []
        } : null
      };

      reply.send({
        user: userResponse
      });

    } catch (error) {
      console.error('Get current user error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Logout endpoint (simple response as JWT is stateless)
  fastify.post('/logout', async (request, reply) => {
    reply.send({ message: 'Logged out successfully' });
  });
}