import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { config } from '../config';

// Note: Install qrcode package: npm install qrcode @types/qrcode

export class TwoFactorService {
  /**
   * Generate a secret for TOTP (Time-based One-Time Password)
   */
  static generateSecret(userEmail: string): { secret: string; otpauthUrl: string } {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: 'Primefrontier',
      length: 32,
    });

    return {
      secret: secret.base32!,
      otpauthUrl: secret.otpauth_url!,
    };
  }

  /**
   * Generate a QR code for the TOTP secret
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      const qrCodeDataURL = await qrcode.toDataURL(otpauthUrl);
      return qrCodeDataURL;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token
   */
  static verifyTOTPToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step before/after for clock drift
    });
  }

  /**
   * Generate a random 6-digit code for SMS/Email 2FA
   */
  static generateRandomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send SMS 2FA code using Twilio
   * Note: Configure Twilio credentials in your environment variables
   */
  static async sendSMS2FA(phoneNumber: string, code: string): Promise<boolean> {
    try {
      // Twilio integration - uncomment and configure when ready
      /*
      const twilio = require('twilio');
      const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
      
      await client.messages.create({
        body: `Your Primefrontier verification code is: ${code}`,
        from: config.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
      */

      // For development/testing - log the code
      console.log(`SMS 2FA code for ${phoneNumber}: ${code}`);
      
      return true;
    } catch (error) {
      console.error('Failed to send SMS 2FA:', error);
      return false;
    }
  }

  /**
   * Send Email 2FA code using nodemailer
   */
  static async sendEmail2FA(email: string, code: string): Promise<boolean> {
    try {
      // Email integration - will be implemented in email.service.ts
      // For now, just log the code for development
      console.log(`Email 2FA code for ${email}: ${code}`);
      
      return true;
    } catch (error) {
      console.error('Failed to send email 2FA:', error);
      return false;
    }
  }

  /**
   * Verify 2FA code (works for both SMS and Email)
   */
  static verify2FACode(storedCode: string, providedCode: string, expiresAt: Date): boolean {
    // Check if code has expired (usually 5-10 minutes)
    if (new Date() > expiresAt) {
      return false;
    }

    // Simple string comparison
    return storedCode === providedCode;
  }

  /**
   * Generate expiration time for 2FA codes (default: 5 minutes)
   */
  static getCodeExpiration(minutes: number = 5): Date {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + minutes);
    return expiration;
  }
}