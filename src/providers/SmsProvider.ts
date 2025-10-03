import { TwoFactorProvider, TwoFactorSetupResult } from './TwoFactorProvider';
import { config } from '../config/config';

// Note: Install twilio package: npm install twilio @types/twilio

export class SmsProvider implements TwoFactorProvider {
  private twilioClient: any;

  constructor() {
    // Initialize Twilio client if credentials are available
    if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio');
      this.twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    }
  }

  /**
   * Send OTP code via SMS
   */
  async send(phoneNumber: string, code: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        // For development/testing - just log the code
        console.log(`SMS 2FA code for ${phoneNumber}: ${code}`);
        return true;
      }

      const message = `Your Primefrontier verification code is: ${code}. This code will expire in 5 minutes.`;
      
      await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      return true;
    } catch (error) {
      console.error('Failed to send SMS 2FA code:', error);
      return false;
    }
  }

  /**
   * Verify SMS OTP code
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
   * Setup SMS 2FA by sending a test code
   */
  async setup(phoneNumber: string): Promise<TwoFactorSetupResult> {
    try {
      // Validate phone number format (basic validation)
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      // Generate a test code
      const testCode = this.generateCode();
      
      // Send test SMS
      const sent = await this.send(phoneNumber, testCode);
      
      if (sent) {
        return {
          success: true,
          secret: testCode, // This will be stored temporarily for verification
          message: `Test code sent to ${phoneNumber}. Please verify to complete setup.`
        };
      } else {
        return {
          success: false,
          error: 'Failed to send test SMS'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'SMS setup failed'
      };
    }
  }

  /**
   * Generate a 6-digit OTP code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Basic phone number validation
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation - should start with + and contain only digits and spaces/hyphens
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s-]/g, ''));
  }
}