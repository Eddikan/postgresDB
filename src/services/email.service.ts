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
   * Send welcome email with default password to invited user
   */
  static async sendInviteEmail(
    email: string,
    defaultPassword: string,
    inviterName?: string
  ): Promise<boolean> {
    const subject = 'Welcome to Primefrontier - Account Created';
    const text = `
Hello,

You have been invited to join Primefrontier${inviterName ? ` by ${inviterName}` : ''}.

Your account has been created with the following credentials:
Email: ${email}
Temporary Password: ${defaultPassword}

Please log in and change your password immediately for security purposes.

Login URL: ${config.FRONTEND_URL}/login

Best regards,
The Primefrontier Team
    `;

    const html = `
      <h2>Welcome to Primefrontier!</h2>
      <p>You have been invited to join Primefrontier${inviterName ? ` by <strong>${inviterName}</strong>` : ''}.</p>
      
      <h3>Your Account Details:</h3>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Temporary Password:</strong> <code>${defaultPassword}</code></li>
      </ul>
      
      <p><strong>Important:</strong> Please log in and change your password immediately for security purposes.</p>
      
      <p><a href="${config.FRONTEND_URL}/login" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Your Account</a></p>
      
      <p>Best regards,<br>The Primefrontier Team</p>
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