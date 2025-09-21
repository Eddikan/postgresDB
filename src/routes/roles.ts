import { FastifyInstance } from 'fastify';
import { RoleDao, PermissionDao } from '../dataaccess';
import { databaseConnection } from '../datasource';
import { authenticate, requirePermission, Permission } from '../middleware/auth-sql';
import { requireActiveAccount } from '../middleware/account-status';

export async function roleRoutes(fastify: FastifyInstance) {
  // Initialize DAOs
  const roleDao = new RoleDao(databaseConnection);
  const permissionDao = new PermissionDao(databaseConnection);

  // Get all roles with their permissions
  fastify.get('/roles', { preHandler: [authenticate, requireActiveAccount] }, async (request: any, reply) => {
    try {
      // Get all roles with their permissions
      const roles = await roleDao.getAllRoles();

      reply.send({
        message: 'Roles retrieved successfully',
        roles: roles
      });

    } catch (error) {
      console.error('Get roles error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific role by ID with permissions
  fastify.get('/roles/:id', { preHandler: [authenticate, requireActiveAccount] }, async (request: any, reply) => {
    try {
      const { id } = request.params;

      const role = await roleDao.getRoleById(id);

      if (!role) {
        return reply.code(404).send({ error: 'Role not found' });
      }

      reply.send({
        message: 'Role retrieved successfully',
        role: role
      });

    } catch (error) {
      console.error('Get role error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all available permissions
  fastify.get('/permissions', { preHandler: [authenticate, requireActiveAccount] }, async (request: any, reply) => {
    try {
      const permissions = await permissionDao.getAllPermissions();

      reply.send({
        message: 'Permissions retrieved successfully',
        permissions: permissions
      });

    } catch (error) {
      console.error('Get permissions error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new role (super admin only)
  fastify.post('/roles', { 
    preHandler: [authenticate, requireActiveAccount, requirePermission(Permission.MANAGE_ROLES)] 
  }, async (request: any, reply) => {
    try {
      const { name, description, permissions } = request.body;

      if (!name || !description) {
        return reply.code(400).send({ error: 'Name and description are required' });
      }

      // Check if role name already exists
      const existingRole = await roleDao.getRoleByName(name);
      if (existingRole) {
        return reply.code(409).send({ error: 'Role name already exists' });
      }

      // Create the role
      const newRole = await roleDao.createRole({
        name,
        description
      });

      // Add permissions to the role if provided
      if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        // Get permission IDs from permission names
        const permissionIds: string[] = [];
        for (const permissionName of permissions) {
          const permission = await permissionDao.getPermissionByName(permissionName);
          if (permission) {
            permissionIds.push(permission.id);
          }
        }
        
        if (permissionIds.length > 0) {
          await roleDao.setRolePermissions(newRole.id, permissionIds);
        }
      }

      // Get the created role with permissions
      const roleWithPermissions = await roleDao.getRoleById(newRole.id);

      reply.code(201).send({
        message: 'Role created successfully',
        role: roleWithPermissions
      });

    } catch (error) {
      console.error('Create role error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update role (super admin only)
  fastify.put('/roles/:id', { 
    preHandler: [authenticate, requireActiveAccount, requirePermission(Permission.MANAGE_ROLES)] 
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const { name, description, permissions } = request.body;

      // Check if role exists
      const existingRole = await roleDao.getRoleById(id);
      if (!existingRole) {
        return reply.code(404).send({ error: 'Role not found' });
      }

      // Check if new name conflicts with existing role (if name is being changed)
      if (name && name !== existingRole.name) {
        const roleWithName = await roleDao.getRoleByName(name);
        if (roleWithName) {
          return reply.code(409).send({ error: 'Role name already exists' });
        }
      }

      // Update role basic info
      const updateData: any = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;

      if (Object.keys(updateData).length > 0) {
        await roleDao.updateRole(id, updateData);
      }

      // Update permissions if provided
      if (permissions && Array.isArray(permissions)) {
        // Get permission IDs from permission names
        const permissionIds: string[] = [];
        for (const permissionName of permissions) {
          const permission = await permissionDao.getPermissionByName(permissionName);
          if (permission) {
            permissionIds.push(permission.id);
          }
        }
        
        await roleDao.setRolePermissions(id, permissionIds);
      }

      // Get updated role with permissions
      const updatedRole = await roleDao.getRoleById(id);

      reply.send({
        message: 'Role updated successfully',
        role: updatedRole
      });

    } catch (error) {
      console.error('Update role error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete role (super admin only)
  fastify.delete('/roles/:id', { 
    preHandler: [authenticate, requireActiveAccount, requirePermission(Permission.MANAGE_ROLES)] 
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;

      // Check if role exists
      const existingRole = await roleDao.getRoleById(id);
      if (!existingRole) {
        return reply.code(404).send({ error: 'Role not found' });
      }

      // Prevent deletion of system roles
      const systemRoles = ['super_admin', 'admin', 'geologist', 'driller', 'junior_driller'];
      if (systemRoles.includes(existingRole.name)) {
        return reply.code(400).send({ error: 'Cannot delete system roles' });
      }

      // Delete the role
      const deleted = await roleDao.deleteRole(id);

      if (!deleted) {
        return reply.code(404).send({ error: 'Role not found' });
      }

      reply.send({
        message: 'Role deleted successfully'
      });

    } catch (error) {
      console.error('Delete role error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}