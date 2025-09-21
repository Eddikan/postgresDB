import * as nodemailer from 'nodemailer';
import { config } from '../config';

export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize the email transporter
   * Note: Configure your SMTP settings in environment variables
   */
  static initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
  }

  /**
   * Send a generic email
   */
  static async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initializeTransporter();
      }

      const mailOptions = {
        from: config.FROM_EMAIL,
        to,
        subject,
        text,
        html: html || text,
      };

      // For development - log email content instead of sending
      if (config.NODE_ENV === 'development') {
        console.log('📧 Email would be sent:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Text: ${text}`);
        return true;
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: %s', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 14): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Generate secure invitation token
   */
  static generateInvitationToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send invitation email with temporary password and activation link
   */
  static async sendUserInvitationEmail(
    email: string,
    firstName: string | null,
    lastName: string | null,
    temporaryPassword: string,
    invitationToken: string
  ): Promise<boolean> {
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
    const activationUrl = `${config.FRONTEND_URL}/activate-account?token=${invitationToken}`;
    
    const subject = 'Welcome to Primefrontier - Activate Your Account';
    const text = `
Hello ${fullName},

You have been invited to join Primefrontier. Your account has been created with the following credentials:

Email: ${email}
Temporary Password: ${temporaryPassword}

IMPORTANT: Your account is currently inactive. You must change your password to activate your account and access the system.

Please click the link below to activate your account and set a new password:
${activationUrl}

This activation link will expire in 24 hours.

If you didn't expect this invitation, please ignore this email.

Best regards,
The Primefrontier Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to Primefrontier!</h2>
        
        <p>Hello <strong>${fullName}</strong>,</p>
        
        <p>You have been invited to join Primefrontier. Your account has been created with the following credentials:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 5px; border-radius: 3px; font-family: monospace;">${temporaryPassword}</code></p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>⚠️ IMPORTANT:</strong> Your account is currently <strong>inactive</strong>. You must change your password to activate your account and access the system.</p>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${activationUrl}" 
             style="background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Activate Your Account
          </a>
        </p>
        
        <p style="font-size: 14px; color: #7f8c8d;">
          This activation link will expire in <strong>24 hours</strong>. If you don't activate your account within this time, please contact your administrator.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #95a5a6;">
          If you didn't expect this invitation, please ignore this email or contact support.
        </p>
      </div>
    `;

    return this.sendEmail(email, subject, text, html);
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request - Primefrontier';
    const text = `
Hello,

You have requested to reset your password for your Primefrontier account.

Please click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security purposes.

If you did not request a password reset, please ignore this email.

Best regards,
The Primefrontier Team
    `;

    const html = `
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password for your Primefrontier account.</p>
      
      <p><a href="${resetUrl}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Your Password</a></p>
      
      <p><strong>Note:</strong> This link will expire in 1 hour for security purposes.</p>
      
      <p>If you did not request a password reset, please ignore this email.</p>
      
      <p>Best regards,<br>The Primefrontier Team</p>
    `;

    return this.sendEmail(email, subject, text, html);
  }

  /**
   * Send 2FA code via email
   */
  static async send2FAEmail(email: string, code: string): Promise<boolean> {
    const subject = 'Your Primefrontier Verification Code';
    const text = `
Hello,

Your verification code for Primefrontier is: ${code}

This code will expire in 5 minutes.

Best regards,
The Primefrontier Team
    `;

    const html = `
      <h2>Verification Code</h2>
      <p>Your verification code for Primefrontier is:</p>
      
      <h1 style="color: #007bff; font-family: monospace; font-size: 36px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 5px;">${code}</h1>
      
      <p><strong>Note:</strong> This code will expire in 5 minutes.</p>
      
      <p>Best regards,<br>The Primefrontier Team</p>
    `;

    return this.sendEmail(email, subject, text, html);
  }
}