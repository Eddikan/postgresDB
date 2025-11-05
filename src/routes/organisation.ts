import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { UserDao, RoleDao } from '../dataaccess';
import { OrganisationDao } from '../dataaccess/OrganisationDao';
import { DatabaseConnection } from '../datasource';
import { EmailService } from '../services';
import { CreateUserData, AccountStatus, User, Organisation } from '../entities';
import { authenticate, requirePermission, Permission, requireAdmin } from '../middleware';
import { config } from '../config';

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

interface UpdateOrganisationPayload {
  name?: string;
  address?: string;
  size?: number;
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

        // 4. Create organisation without createdBy initially
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
          accountStatus: AccountStatus.INACTIVE,
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

        // 7. Update organisation with createdBy field now that user exists
        await organisationDao.updateOrganisation(newOrganisation.id!, {
          createdBy: newUser.id
        });

        // 8. Prepare response (exclude sensitive data)
        const responseData = {
          organisation: {
            id: newOrganisation.id,
            name: newOrganisation.name,
            address: newOrganisation.address,
            size: newOrganisation.size,
            createdBy: newUser.id,
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

        // Send organization welcome email using Mailtrap template
        try {
          const loginUrl = `${config.FRONTEND_URL}/login` || 'https://your-app.com/login';
          await EmailService.sendOrganisationWelcomeEmail(
            newUser.email,
            primaryContact.firstName,
            primaryContact.lastName,
            tempPassword,
            loginUrl,
            newOrganisation.name!,
            newOrganisation.size!
          );
        } catch (emailError) {
          // Log email error but don't fail the registration
          console.warn('Failed to send organization welcome email:', emailError);
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

  /**
   * GET /organisation - List all organisations (Admin only)
   * Auth required: Yes
   * Permissions: Admin access required
   */
  fastify.get('/', {
    preHandler: [authenticate, requireAdmin]
  }, async (request, reply) => {
    try {
      const organisations = await organisationDao.getAllOrganisations();

      return reply.send({
        organisations
      });

    } catch (error: any) {
      fastify.log.error('List organisations error:', error);
      return reply.code(500).send({
        error: 'Failed to retrieve organisations'
      });
    }
  });

  /**
   * GET /organisation/:id - Get organisation details
   * Auth required: Yes
   */
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      const organisation = await organisationDao.getOrganisationById(id);
      if (!organisation) {
        return reply.code(404).send({
          error: 'Organisation not found'
        });
      }

      return reply.send({
        organisation
      });

    } catch (error: any) {
      fastify.log.error('Get organisation error:', error);
      return reply.code(500).send({
        error: 'Failed to retrieve organisation'
      });
    }
  });

  /**
   * PUT /organisation/:id - Update organisation
   * Auth required: Yes
   * Permissions: Admin access required
   */
  fastify.put<{
    Params: {
      id: string;
    };
    Body: UpdateOrganisationPayload;
  }>('/:id', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          address: { type: 'string', maxLength: 1000 },
          size: { type: 'number', minimum: 1, maximum: 100000 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, address, size } = request.body;

      // Check if organisation exists
      const existingOrganisation = await organisationDao.getOrganisationById(id);
      if (!existingOrganisation) {
        return reply.code(404).send({
          error: 'Organisation not found'
        });
      }

      // Check if name already exists (if being updated)
      if (name && name !== existingOrganisation.name) {
        const nameExists = await organisationDao.getOrganisationByName(name);
        if (nameExists) {
          return reply.code(409).send({
            error: 'Organisation name already exists',
            message: `An organisation with the name "${name}" already exists.`
          });
        }
      }

      // Build update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (size !== undefined) updateData.size = size;

      if (Object.keys(updateData).length === 0) {
        return reply.code(400).send({
          error: 'No update data provided'
        });
      }

      // Update organisation
      const updatedOrganisation = await organisationDao.updateOrganisation(id, updateData);
      
      return reply.send({
        message: 'Organisation updated successfully',
        organisation: updatedOrganisation
      });

    } catch (error: any) {
      fastify.log.error('Update organisation error:', error);
      return reply.code(500).send({
        error: 'Failed to update organisation'
      });
    }
  });

  /**
   * DELETE /organisation/:id - Delete organisation
   * Auth required: Yes
   * Permissions: Super Admin access required
   */
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    preHandler: [authenticate, requirePermission(Permission.SYSTEM_MANAGE_USERS)]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Check if organisation exists
      const existingOrganisation = await organisationDao.getOrganisationById(id);
      if (!existingOrganisation) {
        return reply.code(404).send({
          error: 'Organisation not found'
        });
      }

      // Check if organisation has any users (prevent deletion if users exist)
      const organisationUsers = await userDao.getUsersByOrganisationId(id);
      if (organisationUsers.length > 0) {
        return reply.code(409).send({
          error: 'Cannot delete organisation with existing users',
          message: `This organisation has ${organisationUsers.length} user(s). Please remove all users before deleting the organisation.`
        });
      }

      // Delete organisation
      const deleted = await organisationDao.deleteOrganisation(id);
      if (!deleted) {
        return reply.code(500).send({
          error: 'Failed to delete organisation'
        });
      }

      return reply.send({
        message: 'Organisation deleted successfully'
      });

    } catch (error: any) {
      fastify.log.error('Delete organisation error:', error);
      
      // Handle foreign key constraint errors
      if (error.code === '23503') {
        return reply.code(409).send({
          error: 'Cannot delete organisation',
          message: 'This organisation has associated records that must be removed first.'
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to delete organisation'
      });
    }
  });
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



