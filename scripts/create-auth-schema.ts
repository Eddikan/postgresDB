import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pg;

async function createAuthTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('render.com') 
      ? { rejectUnauthorized: false } 
      : false,
  });

  const client = await pool.connect();

  try {
    console.log('Connected to Render database for auth schema creation');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Drop existing tables if they exist (to start fresh)
    await client.query('DROP TABLE IF EXISTS role_permissions CASCADE');
    await client.query('DROP TABLE IF EXISTS permissions CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    await client.query('DROP TABLE IF EXISTS roles CASCADE');
    console.log('🗑️  Cleaned up existing auth tables');

    // Create permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Permissions table created');

    // Create roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Roles table created');

    // Create role_permissions junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "roleId" UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        "permissionId" UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("roleId", "permissionId")
      )
    `);
    console.log('✅ Role permissions junction table created');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(100),
        "lastName" VARCHAR(100),
        "roleId" UUID REFERENCES roles(id) ON DELETE SET NULL,
        "accountStatus" VARCHAR(20) DEFAULT 'pending' CHECK ("accountStatus" IN ('active', 'inactive', 'pending', 'suspended')),
        "lastLogin" TIMESTAMP,
        "twoFactorEnabled" BOOLEAN DEFAULT FALSE,
        "twoFactorSecret" VARCHAR(255),
        "invitationToken" VARCHAR(255),
        "invitationExpires" TIMESTAMP,
        "invitedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
        "invitedAt" TIMESTAMP,
        "activatedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created');

    // Insert permissions
    const permissions = [
      { name: 'user.create', description: 'Create new users' },
      { name: 'user.read', description: 'View user information' },
      { name: 'user.update', description: 'Update user information' },
      { name: 'user.delete', description: 'Delete users' },
      { name: 'user.invite', description: 'Invite new users' },
      { name: 'user.manage_roles', description: 'Manage user roles' },
      { name: 'project.create', description: 'Create new projects' },
      { name: 'project.read', description: 'View project information' },
      { name: 'project.update', description: 'Update project information' },
      { name: 'project.delete', description: 'Delete projects' },
      { name: 'drilling.create', description: 'Create drilling records' },
      { name: 'drilling.read', description: 'View drilling records' },
      { name: 'drilling.update', description: 'Update drilling records' },
      { name: 'drilling.delete', description: 'Delete drilling records' },
      { name: 'role.create', description: 'Create new roles' },
      { name: 'role.read', description: 'View role information' },
      { name: 'role.update', description: 'Update role information' },
      { name: 'role.delete', description: 'Delete roles' },
    ];

    for (const permission of permissions) {
      await client.query(`
        INSERT INTO permissions (name, description) 
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [permission.name, permission.description]);
    }
    console.log('✅ Permissions inserted');

    // Insert roles with their permission assignments
    const roles = [
      {
        name: 'super_admin',
        description: 'Super administrator with all permissions',
        permissions: [
          'user.create', 'user.read', 'user.update', 'user.delete', 'user.invite', 'user.manage_roles',
          'project.create', 'project.read', 'project.update', 'project.delete',
          'drilling.create', 'drilling.read', 'drilling.update', 'drilling.delete',
          'role.create', 'role.read', 'role.update', 'role.delete'
        ]
      },
      {
        name: 'admin',
        description: 'Administrator with most permissions',
        permissions: [
          'user.create', 'user.read', 'user.update', 'user.invite',
          'project.create', 'project.read', 'project.update', 'project.delete',
          'drilling.create', 'drilling.read', 'drilling.update', 'drilling.delete',
          'role.read'
        ]
      },
      {
        name: 'manager',
        description: 'Project manager with project and drilling permissions',
        permissions: [
          'user.read', 'project.create', 'project.read', 'project.update',
          'drilling.create', 'drilling.read', 'drilling.update', 'drilling.delete'
        ]
      },
      {
        name: 'driller',
        description: 'Driller with drilling permissions',
        permissions: [
          'project.read', 'drilling.create', 'drilling.read', 'drilling.update'
        ]
      },
      {
        name: 'junior_driller',
        description: 'Junior driller with read permissions',
        permissions: [
          'project.read', 'drilling.read'
        ]
      }
    ];

    for (const role of roles) {
      // Insert role
      const roleResult = await client.query(`
        INSERT INTO roles (name, description) 
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
        RETURNING id
      `, [role.name, role.description]);
      
      const roleId = roleResult.rows[0].id;
      console.log(`✅ Role '${role.name}' created/updated`);

      // Clear existing permissions for this role
      await client.query('DELETE FROM role_permissions WHERE "roleId" = $1', [roleId]);

      // Insert role permissions
      for (const permissionName of role.permissions) {
        const permissionResult = await client.query('SELECT id FROM permissions WHERE name = $1', [permissionName]);
        if (permissionResult.rows.length > 0) {
          const permissionId = permissionResult.rows[0].id;
          await client.query(`
            INSERT INTO role_permissions ("roleId", "permissionId") 
            VALUES ($1, $2)
            ON CONFLICT ("roleId", "permissionId") DO NOTHING
          `, [roleId, permissionId]);
        }
      }
      console.log(`✅ Permissions assigned to role '${role.name}'`);
    }

    // Create default super admin user
    const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'passworD12345#', 12);
    
    // Get super_admin role ID
    const superAdminResult = await client.query('SELECT id FROM roles WHERE name = $1', ['super_admin']);
    const superAdminRoleId = superAdminResult.rows[0].id;
    
    // Insert or update super admin user
    await client.query(`
      INSERT INTO users (email, password, "firstName", "lastName", "roleId", "accountStatus")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password,
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "roleId" = EXCLUDED."roleId",
        "accountStatus" = EXCLUDED."accountStatus"
    `, ['imeekwere15@gmail.com', hashedPassword, 'Ime', 'Ekwere', superAdminRoleId, 'active']);
    
    console.log('✅ Default super admin user created (imeekwere15@gmail.com / passworD12345#)');
    console.log('🎉 Authentication schema setup completed successfully on Render database');

  } catch (error) {
    console.error('❌ Auth schema setup failed:', error);
    throw error;
  } finally {
    client.release(); // Return the client to the pool
    await pool.end(); // Close the pool
  }
}

createAuthTables();