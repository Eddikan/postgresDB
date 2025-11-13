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
        organisationName,
        organisationSize
      });
      return res;
    } catch (error) {
      console.error('Error sending organisation welcome email:', error);
      throw error;
    }
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

    return SendEmail({ to: email, subject, text, html });
  }
}

// Call the method to send a sample email to the Super Admin