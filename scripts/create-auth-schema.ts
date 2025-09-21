import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function createAuthTables() {
  const client = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT!),
  });

  try {
    await client.connect();
    console.log('Connected to database for auth schema creation');

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
        "roleId" UUID REFERENCES roles(id) ON DELETE CASCADE,
        "permissionId" UUID REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY ("roleId", "permissionId")
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
        "phoneNumber" VARCHAR(50),
        status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
        "roleId" UUID REFERENCES roles(id) ON DELETE SET NULL,
        "twoFactorEnabled" BOOLEAN DEFAULT false,
        "twoFactorSecret" VARCHAR(255),
        "lastLogin" TIMESTAMP,
        "resetPasswordToken" VARCHAR(255),
        "resetPasswordExpires" TIMESTAMP,
        "invitationToken" VARCHAR(255),
        "invitationExpires" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created');

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_role_id ON users("roleId");
      CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
      CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions("roleId");
      CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions("permissionId");
    `);
    console.log('✅ Database indexes created');

    // Insert default permissions
    const defaultPermissions = [
      'CREATE_USER', 'READ_USER', 'UPDATE_USER', 'DELETE_USER', 'INVITE_USER',
      'CREATE_PROJECT', 'READ_PROJECT', 'UPDATE_PROJECT', 'DELETE_PROJECT',
      'CREATE_DRILLING', 'READ_DRILLING', 'UPDATE_DRILLING', 'DELETE_DRILLING',
      'ADD_DATASET', 'ADD_ENTRY', 'EDIT_DATASET', 'DELETE_DATASET',
      'MANAGE_ROLES', 'SYSTEM_SETTINGS'
    ];

    for (const permission of defaultPermissions) {
      await client.query(`
        INSERT INTO permissions (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [permission, `Permission to ${permission.toLowerCase().replace('_', ' ')}`]);
    }
    console.log('✅ Default permissions created');

    // Insert default roles
    const defaultRoles = [
      {
        name: 'super_admin',
        description: 'Super Administrator with all permissions',
        permissions: [
          'CREATE_USER', 'READ_USER', 'UPDATE_USER', 'DELETE_USER', 'INVITE_USER',
          'CREATE_PROJECT', 'READ_PROJECT', 'UPDATE_PROJECT', 'DELETE_PROJECT',
          'CREATE_DRILLING', 'READ_DRILLING', 'UPDATE_DRILLING', 'DELETE_DRILLING',
          'ADD_DATASET', 'ADD_ENTRY', 'EDIT_DATASET', 'DELETE_DATASET',
          'MANAGE_ROLES', 'SYSTEM_SETTINGS'
        ]
      },
      {
        name: 'admin',
        description: 'Administrator with management permissions',
        permissions: [
          'CREATE_USER', 'READ_USER', 'UPDATE_USER', 'INVITE_USER',
          'CREATE_PROJECT', 'READ_PROJECT', 'UPDATE_PROJECT', 'DELETE_PROJECT',
          'CREATE_DRILLING', 'READ_DRILLING', 'UPDATE_DRILLING', 'DELETE_DRILLING',
          'ADD_DATASET', 'ADD_ENTRY', 'EDIT_DATASET', 'DELETE_DATASET'
        ]
      },
      {
        name: 'geologist',
        description: 'Geologist with project and drilling management',
        permissions: [
          'READ_USER', 'READ_PROJECT', 'UPDATE_PROJECT',
          'CREATE_DRILLING', 'READ_DRILLING', 'UPDATE_DRILLING',
          'ADD_DATASET', 'ADD_ENTRY', 'EDIT_DATASET'
        ]
      },
      {
        name: 'driller',
        description: 'Driller with drilling operations access',
        permissions: [
          'READ_USER', 'READ_PROJECT', 'READ_DRILLING', 'UPDATE_DRILLING',
          'ADD_DATASET', 'ADD_ENTRY'
        ]
      },
      {
        name: 'junior_driller',
        description: 'Junior Driller with basic access',
        permissions: [
          'READ_USER', 'READ_PROJECT', 'READ_DRILLING', 'ADD_ENTRY'
        ]
      }
    ];

    for (const role of defaultRoles) {
      // Insert role
      const roleResult = await client.query(`
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          "updatedAt" = NOW()
        RETURNING id
      `, [role.name, role.description]);
      
      const roleId = roleResult.rows[0].id;

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
            ON CONFLICT DO NOTHING
          `, [roleId, permissionId]);
        }
      }
    }
    console.log('✅ Default roles and permissions assigned');

    // Create default super admin user (password: passworD12345#)
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('passworD12345#', 12);
    
    // Get super_admin role ID
    const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['super_admin']);
    const superAdminRoleId = roleResult.rows[0].id;

    await client.query(`
      INSERT INTO users (email, password, "firstName", "lastName", "roleId", status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        "roleId" = EXCLUDED."roleId",
        "updatedAt" = NOW()
    `, ['imeekwere15@gmail.com', hashedPassword, 'Ime', 'Ekwere', superAdminRoleId, 'active']);
    
    console.log('✅ Default super admin user created (imeekwere15@gmail.com / passworD12345#)');
    console.log('🎉 Authentication schema setup completed successfully');

  } catch (error) {
    console.error('❌ Auth schema setup failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createAuthTables();