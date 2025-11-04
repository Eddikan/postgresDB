import * as nodemailer from 'nodemailer';
import { config } from '../config';
import Nodemailer from "nodemailer";
import { MailtrapTransport, MailtrapClient } from "mailtrap";
import { MailtrapResponse } from 'mailtrap/dist/types/transport';

/**
 * User invitation routes
 */
const TOKEN = config.MAILTRAP_TOKEN;

const client = new MailtrapClient({ token: TOKEN });

async function sendWelcomeTemplateEmail({ to, firstName, lastName, temporaryPassword, loginUrl, organisationName }: { to: string, firstName: string, lastName: string, temporaryPassword: string, loginUrl: string, organisationName?: string }) {
  try {
    const response = await client.send({
      from: { email: "hello@ime.com.ng", name: "Primefrontier Test" },
      to: [{ email: to }],
      template_uuid: "bd3a5ff8-e72c-4557-9862-1328c4f6d3f1",
      template_variables: {
        email: to,
        firstName, 
        lastName, 
        temporaryPassword,
        loginUrl: "Test_Loginurl",
        organisationName: organisationName || "Primefrontier"
      },
    });
    console.log("Email sent successfully:", response);
    return response
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

async function sendOrganisationWelcomeTemplateEmail({ to, firstName, lastName, temporaryPassword, loginUrl, organisationName, organisationSize }: { to: string, firstName: string, lastName: string, temporaryPassword: string, loginUrl: string, organisationName: string, organisationSize: number }) {
  try {
    const response = await client.send({
      from: { email: "hello@ime.com.ng", name: "Primefrontier Test" },
      to: [{ email: to }],
      template_uuid: "beffbe99-9264-4281-9d86-be28d525b891",
      template_variables: {
        email: to,
        firstName, 
        lastName, 
        temporaryPassword,
        loginUrl,
        organisationName,
        organisationSize
        
      },
    });
    console.log("Organisation welcome email sent successfully:", response);
    return response
  } catch (error) {
    console.error("Error sending organisation welcome email:", error);
  }
}

export async function SendEmail({ to, subject, text, html }: { to: string, subject: string, text: string, html?: string }) {
  // Use MailtrapClient for template-based sending if template_uuid and template_variables are provided
  const { MailtrapClient } = require("mailtrap");
  const client = new MailtrapClient({ token: TOKEN });
  const sender = {
    email: "hello@ime.com.ng",
    name: "Primefrontier Test"
  };
  // If template_uuid and template_variables are present, use MailtrapClient
  if (arguments[0].template_uuid && arguments[0].template_variables) {
    try {
      const response = await client.send({
        from: sender,
        to: [{ email: to }],
        template_uuid: arguments[0].template_uuid,
        template_variables: arguments[0].template_variables
      });
      console.log("Email sent successfully here:", response);
      return response;
    } catch (error) {
      console.error("Error sending template email:", error);
    }
  } else {
    // Fallback to nodemailer for regular emails
    const transport = Nodemailer.createTransport(
      MailtrapTransport({
        token: TOKEN,
      })
    );
    try {
      const result = await transport.sendMail({
        from: { address: sender.email, name: sender.name },
        to,
        subject,
        text,
        html: html || text,
        category: "Integration Test",
      });
      console.log("Email sent successfully:", result);
      return result;
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }
}
export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize the email transporter
   * Note: Configure your SMTP settings in environment variables
   */
  static initializeTransporter(): void {
    // Use Mailtrap for development/testing
    if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
      this.transporter = nodemailer.createTransport(
        MailtrapTransport({
          token: config.MAILTRAP_TOKEN,
        })
      );
    } else {
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
  }
  /**
   * Send a sample email to the Super Admin using Mailtrap
   */
  static async sendSampleEmailToSuperAdmin(): Promise<boolean> {
    const to = config.DEFAULT_ADMIN_EMAIL;
    const subject = 'Mailtrap Integration Test';
    const text = 'Congrats! This is a test email sent via Mailtrap integration.';
    const html = '<h2>Mailtrap Integration Test</h2><p>Congrats! This is a test email sent via <strong>Mailtrap</strong> integration.</p>';
    return SendEmail({ to, subject, text, html });

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
      // Create fresh transport each time (like working SendEmail function)
      const transport = Nodemailer.createTransport(
        MailtrapTransport({
          token: TOKEN,
        })
      );

      const sender = {
        email: config.FROM_EMAIL || "hello@ime.com.ng",
        name: "Primefrontier Test"
      };

      const mailOptions = {
        from: { address: sender.email, name: sender.name },
        to,
        subject,
        text,
        html: html || text,
        category: "Integration Test",
      };

      // For development - log email content instead of sending
      if (config.NODE_ENV === 'development') {
        console.log('📧 Email would be sent:');
        console.log(mailOptions);
        return true;
      }

      const result = await transport.sendMail(mailOptions);
      console.log('Email sent successfully:', result);
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
    firstName: string,
    lastName: string,
    temporaryPassword: string,
    invitationToken: string,
    loginUrl: string,
    organisationName?: string
  ): Promise<MailtrapResponse | undefined> {
    const res = await sendWelcomeTemplateEmail({ to: email, firstName, lastName, temporaryPassword, loginUrl, organisationName })
    return res
  }

  /**
   * Send organization welcome email using Mailtrap template
   */
  static async sendOrganisationWelcomeEmail(
    email: string,
    firstName: string,
    lastName: string,
    temporaryPassword: string,
    loginUrl: string,
    organisationName: string,
    organisationSize: number
  ): Promise<MailtrapResponse | undefined> {
    try {
      const res = await sendOrganisationWelcomeTemplateEmail({ 
        to: email, 
        firstName, 
        lastName, 
        temporaryPassword, 
        loginUrl, 
        organisationName ,
        organisationSize
      });
      return res;
    } catch (error) {
      console.error('Error sending organisation welcome email:', error);
      throw error;
    }
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

    return SendEmail({ to: email, subject, text, html });
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
      
      <h1 style="color: #181a1cff; font-family: monospace; font-size: 36px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 5px;">${code}</h1>
      
      <p><strong>Note:</strong> This code will expire in 5 minutes.</p>
      
      <p>Best regards,<br>The Primefrontier Team</p>
    `;

    return SendEmail({ to:email, subject, text, html });
  }
}

// Call the method to send a sample email to the Super Admin