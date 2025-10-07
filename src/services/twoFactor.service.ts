import { TwoFactorType, User } from '../entities/User';
import { TwoFactorProvider, TwoFactorSetupResult } from '../providers/TwoFactorProvider';
import { EmailProvider } from '../providers/EmailProvider';
import { SmsProvider } from '../providers/SmsProvider';
import { TotpProvider } from '../providers/TotpProvider';
import { UserDao } from '../dataaccess/UserDao';
import { DatabaseConnection } from '../datasource';
import * as bcrypt from 'bcrypt';

export interface TwoFactorSetupRequest {
  type: TwoFactorType;
  target: string; // email or phone number (not needed for TOTP)
}

export interface TwoFactorVerificationRequest {
  code: string;
  userId: string;
}

export class TwoFactorService {
  private emailProvider: EmailProvider;
  private smsProvider: SmsProvider;
  private totpProvider: TotpProvider;
  private userDao: UserDao;

  constructor() {
    this.emailProvider = new EmailProvider();
    this.smsProvider = new SmsProvider();
    this.totpProvider = new TotpProvider();
    this.userDao = new UserDao();
  }

  /**
   * Get the appropriate provider for the given type
   */
  private getProvider(type: TwoFactorType): TwoFactorProvider {
    switch (type) {
      case TwoFactorType.EMAIL:
        return this.emailProvider;
      case TwoFactorType.SMS:
        return this.smsProvider;
      case TwoFactorType.TOTP:
        return this.totpProvider;
      default:
        throw new Error(`Unsupported 2FA type: ${type}`);
    }
  }

  /**
   * Setup 2FA for a user
   */
  async setup(userId: string, setupRequest: TwoFactorSetupRequest): Promise<TwoFactorSetupResult> {
    try {
      const user = await this.userDao.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const provider = this.getProvider(setupRequest.type);
      const target = setupRequest.type === TwoFactorType.TOTP ? user.email : setupRequest.target;

      const result = await provider.setup!(target);

      if (result.success) {
        // Store setup data in user record for verification
        if (setupRequest.type === TwoFactorType.TOTP) {
          // For TOTP: encrypt and store the secret
          await this.userDao.updateUser(userId, {
            twoFactorType: setupRequest.type,
            twoFactorTarget: setupRequest.target,
            twoFactorSecret: await this.encryptSecret(result.secret!),
            twoFactorEnabled: false, // Only enable after verification
          });
        } else {
          // For Email/SMS: hash and store the OTP code
          await this.userDao.updateUser(userId, {
            twoFactorType: setupRequest.type,
            twoFactorTarget: setupRequest.target,
            twoFactorCode: await bcrypt.hash(result.secret!, 10),
            twoFactorCodeExpires: this.getCodeExpiration(),
            twoFactorEnabled: false, // Only enable after verification
          });
        }
      }

      return result;
    } catch (error) {
      console.error('2FA setup failed:', error);
      return { success: false, error: 'Setup failed' };
    }
  }

  /**
   * Send OTP code (for email and SMS)
   */
  async sendOTP(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const user = await this.userDao.getUserById(userId);
      if (!user || !user.twoFactorType || !user.twoFactorTarget) {
        return { success: false, error: 'User not found or 2FA not configured' };
      }

      if (user.twoFactorType === TwoFactorType.TOTP) {
        return { success: false, error: 'TOTP does not require sending codes' };
      }

      // Generate new code
      const code = this.generateRandomCode();
      const hashedCode = await bcrypt.hash(code, 10);
      const expiresAt = this.getCodeExpiration();

      // Update user with new code
      await this.userDao.updateUser(userId, {
        twoFactorCode: hashedCode,
        twoFactorCodeExpires: expiresAt,
      });

      // Send code
      const provider = this.getProvider(user.twoFactorType);
      const sent = await provider.send(user.twoFactorTarget, code);

      if (sent) {
        return { success: true, message: 'Code sent successfully' };
      } else {
        return { success: false, error: 'Failed to send code' };
      }
    } catch (error) {
      console.error('Send OTP failed:', error);
      return { success: false, error: 'Failed to send code' };
    }
  }

  /**
   * Verify 2FA code
   */
  async verify(request: TwoFactorVerificationRequest): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const user = await this.userDao.getUserById(request.userId);
      if (!user || !user.twoFactorType) {
        return { success: false, error: 'User not found or 2FA not configured' };
      }
      console.log('user is', user)

      const provider = this.getProvider(user.twoFactorType);
      let isValid = false;

      if (user.twoFactorType === TwoFactorType.TOTP) {
        // For TOTP, verify against the stored secret
        if (!user.twoFactorSecret) {
          return { success: false, error: 'TOTP secret not found' };
        }
        // Decrypt the secret before verification
        const decryptedSecret = await this.decryptSecret(user.twoFactorSecret);
        isValid = await provider.verify(decryptedSecret, request.code);
      } else {
        // For OTP (email/SMS), verify against stored hashed code
        if (!user.twoFactorCode || !user.twoFactorCodeExpires) {
          return { success: false, error: 'No active verification code found' };
        }

        // Check if code has expired
        if (new Date() > user.twoFactorCodeExpires) {
          return { success: false, error: 'Verification code has expired' };
        }

        // Verify hashed code
        isValid = await bcrypt.compare(request.code, user.twoFactorCode);
      }

      if (isValid) {
        // Enable 2FA and clear temporary codes
        await this.userDao.updateUser(request.userId, {
          twoFactorEnabled: true,
          twoFactorCode: undefined, // Clear temporary code
          twoFactorCodeExpires: undefined,
        });

        return { success: true, message: '2FA verified and enabled successfully' };
      } else {
        return { success: false, error: 'Invalid verification code' };
      }
    } catch (error) {
      console.error('2FA verification failed:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  /**
   * Disable 2FA for a user
   */
  async disable(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      await this.userDao.updateUser(userId, {
        twoFactorEnabled: false,
        twoFactorType: undefined,
        twoFactorSecret: undefined,
        twoFactorTarget: undefined,
        twoFactorCode: undefined,
        twoFactorCodeExpires: undefined,
      });

      return { success: true, message: '2FA disabled successfully' };
    } catch (error) {
      console.error('2FA disable failed:', error);
      return { success: false, error: 'Failed to disable 2FA' };
    }
  }

  /**
   * Check if user needs to enable 2FA within 7 days
   */
  async checkTwoFactorRequirement(user: User): Promise<{
    required: boolean;
    daysRemaining?: number;
    blocked: boolean;
  }> {
    // If 2FA is already enabled, no requirement
    if (user.twoFactorEnabled) {
      return { required: false, blocked: false };
    }

    // If user hasn't changed default password, no 2FA requirement yet
    if (!user.has_changed_default_password || !user.passwordChangedAt) {
      return { required: false, blocked: false };
    }

    const daysSincePasswordChange = Math.floor(
      (new Date().getTime() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePasswordChange >= 7) {
      // Block access
      return { required: true, blocked: true };
    } else {
      // Remind to enable 2FA
      const daysRemaining = 7 - daysSincePasswordChange;
      return { required: true, daysRemaining, blocked: false };
    }
  }

  /**
   * Send OTP for login (Email/SMS 2FA only)
   */
  async sendLoginOTP(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {

      const user = await this.userDao.getUserById(userId);
      console.log('user is', user)
      if (!user || !user.twoFactorEnabled || !user.twoFactorType) {
        return { success: false, error: '2FA not enabled for this user' };
      }
      console.log('sssddddddasdadfdewsdfvjhbhjcewjhfcehjfbhjfe')

      if (user.twoFactorType === TwoFactorType.TOTP) {
        return { success: false, error: 'TOTP does not require sending codes' };
      }

      if (!user.twoFactorTarget) {
        console.log('asdadfdewsdfvjhbhjcewjhfcehjfbhjfe')

        return { success: false, error: '2FA target not configured' };
      }
      console.log('fasfddfasdadfdewsdfvjhbhjcewjhfcehjfbhjfe')


      // Generate new login code
      const code = this.generateRandomCode();
      const hashedCode = await bcrypt.hash(code, 10);
      const expiresAt = this.getCodeExpiration();

      // Update user with new login code
      await this.userDao.updateUser(userId, {
        twoFactorCode: hashedCode,
        twoFactorCodeExpires: expiresAt,
      });

      // Send code
      const provider = this.getProvider(user.twoFactorType);
      const sent = await provider.send(user.twoFactorTarget, code);

      if (sent) {
        return { success: true, message: 'Login code sent successfully' };
      } else {
        return { success: false, error: 'Failed to send login code' };
      }
    } catch (error) {
      console.error('Send login OTP failed:', error);
      return { success: false, error: 'Failed to send login code' };
    }
  }

  /**
   * Verify 2FA during login (if enabled)
   */
  async verifyForLogin(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.userDao.getUserById(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorType) {
        return { success: false, error: '2FA not enabled for this user' };
      }

      const provider = this.getProvider(user.twoFactorType);
      let isValid = false;
      if (user.twoFactorType === TwoFactorType.TOTP) {
        console.log('twoFactorSecret', user.twoFactorType);

        if (!user.twoFactorSecret) {
          return { success: false, error: 'TOTP secret not found' };
        }
        // Decrypt the secret before verification
        const decryptedSecret = await this.decryptSecret(user.twoFactorSecret);
        isValid = await provider.verify(decryptedSecret, code);
      } else {
        console.log('else', user.twoFactorType);

        // For OTP (email/SMS), verify against stored hashed code
        if (!user.twoFactorCode || !user.twoFactorCodeExpires) {
          return { success: false, error: 'No active login code found. Please request a new code.' };
        }

        // Check if code has expired
        if (new Date() > user.twoFactorCodeExpires) {
          return { success: false, error: 'Login code has expired. Please request a new code.' };
        }
        // Verify hashed code
        isValid = await bcrypt.compare(code, user.twoFactorCode);
        console.log('user.twoFactorCode', isValid);

        // Clear the login code after successful verification
        if (isValid) {
          console.log('hmmm.twoFactorCode', userId, isValid);

          await this.userDao.updateUser(userId, {
            twoFactorCode: undefined,
            twoFactorCodeExpires: undefined,
          });
        }
      }

      return { success: isValid, error: isValid ? undefined : 'Invalid code' };
    } catch (error) {
      console.error('2FA login verification failed:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  /**
   * Generate a random 6-digit code
   */
  private generateRandomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate expiration time for 2FA codes (default: 5 minutes)
   */
  private getCodeExpiration(minutes: number = 5): Date {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + minutes);
    return expiration;
  }

  /**
   * Encrypt TOTP secret for secure storage
   */
  private async encryptSecret(secret: string): Promise<string> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key-change-me').digest();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Store IV with encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt TOTP secret for verification
   */
  private async decryptSecret(encryptedSecret: string): Promise<string> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key-change-me').digest();

    const parts = encryptedSecret.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}