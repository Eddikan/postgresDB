import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { Permission } from '../src/middleware/auth-sql';

dotenv.config();

const { Pool } = pg;

const permissionDescriptions: Record<Permission, string> = {
  [Permission.SYSTEM_MANAGE_USERS]: 'System: Manage users',
  [Permission.SYSTEM_SCHEMA_CHANGES]: 'System: Schema changes',
  [Permission.SYSTEM_INTEGRATIONS]: 'System: Integrations',
  [Permission.SYSTEM_AUDIT_LOGS]: 'System: Audit logs',
  [Permission.SYSTEM_OVERRIDE_CHANGES]: 'System: Override changes',
  [Permission.PROJECT_CREATE]: 'Project: Create new projects',
  [Permission.PROJECT_ARCHIVE]: 'Project: Archive projects',
  [Permission.PROJECT_READ]: 'Project: View project information',
  [Permission.PROJECT_ASSIGN_PERMISSIONS]: 'Project: Assign permissions',
  [Permission.DRILLING_APPROVE_LOGS]: 'Drilling: Approve logs',
  [Permission.DRILLING_APPROVE_MODELS]: 'Drilling: Approve models',
  [Permission.DRILLING_REVIEW_PROGRESS]: 'Drilling: Review progress',
  [Permission.DRILLING_APPROVE_ADJUSTMENTS]: 'Drilling: Approve adjustments',
  [Permission.DRILLING_VALIDATE_DATA]: 'Drilling: Validate data',
  [Permission.DRILLING_INPUT_LOGS]: 'Drilling: Input logs',
  [Permission.DRILLING_UPLOAD_PHOTOS]: 'Drilling: Upload photos',
  [Permission.DRILLING_ENTER_ASSAYS]: 'Drilling: Enter assays',
  [Permission.DRILLING_UPDATE_GEOLOGY]: 'Drilling: Update geology',
  [Permission.DRILLING_INPUT_PROGRESS]: 'Drilling: Input progress',
  [Permission.DRILLING_TRACK_SAMPLES]: 'Drilling: Track samples',
  [Permission.DRILLING_UPLOAD_NOTES]: 'Drilling: Upload notes',
  [Permission.DRILLING_READ]: 'Drilling: View drilling records',
  [Permission.REPORTS_RUN_EXPORT]: 'Reports: Run export',
  [Permission.REPORTS_CONFIGURE_DASHBOARDS]: 'Reports: Configure dashboards',
  [Permission.REPORTS_RUN_VISUALIZATIONS]: 'Reports: Run visualizations',
  [Permission.REPORTS_VIEW_DASHBOARDS]: 'Reports: View dashboards',
  [Permission.REPORTS_VIEW_ESG_METRICS]: 'Reports: View ESG metrics',
  [Permission.DATA_DELETE_HISTORICAL]: 'Data: Delete historical records',
  [Permission.DATA_LOCK_VALIDATED]: 'Data: Lock validated records',
  [Permission.DATA_REQUIRE_APPROVAL]: 'Data: Require approval',
  [Permission.ACCESS_ALL_PROJECTS]: 'Access: All projects',
  [Permission.ACCESS_ASSIGNED_PROJECTS]: 'Access: Assigned projects',
};

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
    // Create mining_samples table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mining_samples (
        id SERIAL PRIMARY KEY,
        sample_id TEXT,
        depth_m NUMERIC,
        latitude NUMERIC,
        longitude NUMERIC,
        meta JSONB
      )
    `);
    console.log('✅ Mining samples table created');
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
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "has_changed_default_password" BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✅ Users table created');

    // Insert permissions
    for (const perm of Object.values(Permission)) {
      await client.query(
        `INSERT INTO permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [perm, permissionDescriptions[perm as Permission] || '']
      );
    }
    console.log('✅ Permissions inserted');

    // Insert roles with their permission assignments
    const roles = [
      {
        name: 'super_admin',
        description: 'Super administrator with all permissions',
        permissions: Object.values(Permission),
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
    const hashedPassword = await bcrypt.hash( 'passworD12345#', 12);
    
    // Get super_admin role ID
    const superAdminResult = await client.query('SELECT id FROM roles WHERE name = $1', ['super_admin']);
    const superAdminRoleId = superAdminResult.rows[0].id;
    
    // Insert or update super admin user
    await client.query(`
      INSERT INTO users (email, password, "firstName", "lastName", "roleId", "accountStatus", "has_changed_default_password")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password,
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "roleId" = EXCLUDED."roleId",
        "accountStatus" = EXCLUDED."accountStatus",
        "has_changed_default_password" = EXCLUDED."has_changed_default_password"
    `, ['imeekwere15@gmail.com', hashedPassword, 'Ime', 'Ekwere', superAdminRoleId, 'active', true]);
    
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