import { TwoFactorProvider, TwoFactorSetupResult } from './TwoFactorProvider';
import { EmailService } from '../services/email.service';

export class EmailProvider implements TwoFactorProvider {

  /**
   * Send OTP code via email
   */
  async send(email: string, code: string): Promise<boolean> {
    try {
      
      return await EmailService.send2FAEmail(email, code);
    } catch (error) {
      console.error('Failed to send email 2FA code:', error);
      return false;
    }
  }

  /**
   * Verify email OTP code
   */
  async verify(storedCode: string, providedCode: string, expiresAt?: Date): Promise<boolean> {
    // Check if code has expired
    if (expiresAt && new Date() > expiresAt) {
      return false;
    }

    // Simple string comparison (codes should be hashed in production)
    return storedCode === providedCode;
  }

  /**
   * Setup email 2FA by sending a test code
   */
  async setup(email: string): Promise<TwoFactorSetupResult> {
    try {
      // Generate a test code
      const testCode = this.generateCode();
      
      // Send test email
      const sent = await this.send(email, testCode);
      
      if (sent) {
        return {
          success: true,
          secret: testCode, // This will be stored temporarily for verification
          message: `Test code sent to ${email}. Please verify to complete setup.`
        };
      } else {
        return {
          success: false,
          error: 'Failed to send test email'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Email setup failed'
      };
    }
  }

  /**
   * Generate a 6-digit OTP code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}