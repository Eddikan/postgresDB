import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { UserDao, RoleDao } from '../dataaccess';
import { OrganisationDao } from '../dataaccess/OrganisationDao';
import { DatabaseConnection } from '../datasource';
import { EmailService } from '../services';
import { CreateUserData, AccountStatus } from '../entities';

// Request payload interfaces
interface OrganisationSetupPayload {
  organisation: {
    name: string;
    address?: string;
    size?: number;
  };
  primaryContact: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
}

// Fastify schema validation
const organisationSetupSchema = {
  body: {
    type: 'object',
    required: ['organisation', 'primaryContact'],
    properties: {
      organisation: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          address: { type: 'string', maxLength: 1000 },
          size: { type: 'number', minimum: 1, maximum: 100000 }
        },
        additionalProperties: false
      },
      primaryContact: {
        type: 'object',
        required: ['firstName', 'lastName', 'email'],
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 255 },
          lastName: { type: 'string', minLength: 1, maxLength: 255 },
          email: { 
            type: 'string', 
            format: 'email',
            maxLength: 255 
          },
          phoneNumber: { 
            type: 'string', 
            pattern: '^[+]?[0-9\\s\\-()]+$',
            maxLength: 20 
          }
        },
        additionalProperties: false
      }
    },
    additionalProperties: false
  }
};

export async function organisationRoutes(fastify: FastifyInstance) {
  // Initialize DAOs
  const database = new DatabaseConnection();
  const organisationDao = new OrganisationDao();
  const userDao = new UserDao();
  const roleDao = new RoleDao();

  // POST /organisation/setup
  fastify.post<{ Body: OrganisationSetupPayload }>(
    '/setup',
    {
      schema: organisationSetupSchema,
      preHandler: async (request, reply) => {
        // Optional: Add rate limiting for organisation setup
        // This is a sensitive endpoint that should be protected
      }
    },
    async (request: FastifyRequest<{ Body: OrganisationSetupPayload }>, reply: FastifyReply) => {
      try {
        const { organisation, primaryContact } = request.body;

        // 1. Check if organisation name already exists
        const existingOrganisation = await organisationDao.getOrganisationByName(organisation.name);
        if (existingOrganisation) {
          return reply.status(409).send({
            error: 'Organisation already exists',
            message: `An organisation with the name "${organisation.name}" already exists.`,
            code: 'ORG_NAME_CONFLICT'
          });
        }

        // 2. Check if user email already exists
        const existingUser = await userDao.getUserByEmail(primaryContact.email);
        if (existingUser) {
          return reply.status(409).send({
            error: 'User already exists',
            message: `A user with the email "${primaryContact.email}" already exists.`,
            code: 'USER_EMAIL_CONFLICT'
          });
        }

        // 3. Get super_admin role
        const superAdminRole = await roleDao.getRoleByName('super_admin');
        if (!superAdminRole) {
          return reply.status(500).send({
            error: 'System configuration error',
            message: 'Super admin role not found in system.',
            code: 'ROLE_NOT_FOUND'
          });
        }

        // 4. Create organisation
        const newOrganisation = await organisationDao.createOrganisation({
          name: organisation.name,
          address: organisation.address,
          size: organisation.size
        });

        // 5. Generate temporary password (user will be required to change it)
        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // 6. Create user as superadmin of the organisation
        const newUser = await userDao.createOrganisationUser({
          email: primaryContact.email,
          firstName: primaryContact.firstName,
          lastName: primaryContact.lastName,
          phoneNumber: primaryContact.phoneNumber || '',
          password: hashedPassword,
          organisationId: newOrganisation.id!,
          roleId: superAdminRole.id
        });

        if (!newUser) {
          // Rollback: delete the organisation if user creation fails
          await organisationDao.deleteOrganisation(newOrganisation.id!);
          
          return reply.status(500).send({
            error: 'User creation failed',
            message: 'Failed to create user account. Please try again.',
            code: 'USER_CREATION_FAILED'
          });
        }

        // 7. Prepare response (exclude sensitive data)
        const responseData = {
          organisation: {
            id: newOrganisation.id,
            name: newOrganisation.name,
            address: newOrganisation.address,
            size: newOrganisation.size,
            createdAt: newOrganisation.createdAt
          },
          user: {
            id: newUser.id,
            firstName: primaryContact.firstName,
            lastName: primaryContact.lastName,
            email: newUser.email,
            phoneNumber: primaryContact.phoneNumber,
            role: 'superadmin',
            accountStatus: newUser.accountStatus,
            createdAt: newUser.createdAt
          },
          // Include temporary password in response (in real-world, send via secure channel)
          temporaryCredentials: {
            email: newUser.email,
            password: tempPassword,
            message: 'Please change this password after first login'
          }
        };

        // Send welcome email (implement this based on your email service)
        try {
          const fullName = `${primaryContact.firstName} ${primaryContact.lastName}`;
          await sendWelcomeEmail(newUser.email, fullName, tempPassword, newOrganisation.name!);
        } catch (emailError) {
          // Log email error but don't fail the registration
          console.warn('Failed to send welcome email:', emailError);
        }

        return reply.status(201).send({
          message: 'Organisation setup completed successfully',
          data: responseData
        });

      } catch (error: any) {
        fastify.log.error('Organisation setup failed:', error);
        
        return reply.status(500).send({
          error: 'Organisation setup failed',
          message: 'An unexpected error occurred during organisation setup.'
        });
      }
    }
  );
}

// Helper function to generate temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  
  // Ensure at least one of each type
  password += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]; // Upper
  password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)]; // Lower
  password += '23456789'[Math.floor(Math.random() * 8)]; // Number
  password += '!@#$%&*'[Math.floor(Math.random() * 7)]; // Special
  
  // Fill remaining 8 characters
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Welcome email function using EmailService
async function sendWelcomeEmail(email: string, fullName: string, tempPassword: string, orgName: string): Promise<void> {
  try {
    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Create a welcome email subject and content
    const subject = `Welcome to ${orgName} - Your Organisation Setup is Complete!`;
    
    const text = `
Hello ${fullName},

Congratulations! Your organisation "${orgName}" has been successfully set up on Primefrontier.

Your account has been created with the following credentials:
Email: ${email}
Temporary Password: ${tempPassword}

IMPORTANT: Please log in and change your password as soon as possible for security.

As the Super Administrator, you have full access to manage your organisation, invite team members, and configure system settings.

Welcome to Primefrontier!

Best regards,
The Primefrontier Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to ${orgName}!</h2>
        
        <p>Hello <strong>${fullName}</strong>,</p>
        
        <p>🎉 <strong>Congratulations!</strong> Your organisation "<strong>${orgName}</strong>" has been successfully set up on Primefrontier.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Your Login Credentials</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 5px; border-radius: 3px; font-family: monospace;">${tempPassword}</code></p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>🔒 IMPORTANT:</strong> Please log in and <strong>change your password</strong> as soon as possible for security.</p>
        </div>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #155724; margin-top: 0;">As Super Administrator, you can:</h4>
          <ul style="color: #155724; margin-bottom: 0;">
            <li>Manage your organisation settings</li>
            <li>Invite and manage team members</li>
            <li>Configure system permissions</li>
            <li>Access all organisation data and reports</li>
          </ul>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
          <strong>Welcome to Primefrontier!</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #95a5a6;">
          If you have any questions or need support, please contact our team.
        </p>
      </div>
    `;

    // Use EmailService to send the email
    const emailSent = await EmailService.sendEmail(email, subject, text, html);
    
    if (emailSent) {
      console.log(`✅ Welcome email sent successfully to ${email} for organisation: ${orgName}`);
    } else {
      console.warn(`⚠️ Failed to send welcome email to ${email} for organisation: ${orgName}`);
    }
    
  } catch (error) {
    console.error(`❌ Error sending welcome email to ${email}:`, error);
    // Don't throw the error - we don't want to fail organisation creation if email fails
  }
}

