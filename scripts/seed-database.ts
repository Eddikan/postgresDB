import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { Permission } from '../src/middleware/auth-sql';

dotenv.config();

const { Pool } = pg;

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('render.com') 
      ? { rejectUnauthorized: false } 
      : false,
  });

  const client = await pool.connect();

  try {
    console.log('🌱 Starting database seeding on Render...');

    // --- Seed permissions ---
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

    for (const perm of Object.values(Permission)) {
      await client.query(
        `INSERT INTO permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [perm, permissionDescriptions[perm as Permission] || '']
      );
    }
    console.log('✅ Permissions seeded');

    // --- Seed roles and role_permissions ---
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
    }
    console.log('✅ Roles and role_permissions seeded');

    // --- Seed users ---
    // Super admin
    const superAdminRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['super_admin']);
    if (superAdminRoleResult.rows.length > 0) {
      const superAdminRoleId = superAdminRoleResult.rows[0].id;
      const hashedPassword = await bcrypt.hash('passworD12345#', 12);
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
      console.log('✅ Super admin user seeded');
    }

    // Admin
    const adminRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['admin']);
    if (adminRoleResult.rows.length > 0) {
      const adminRoleId = adminRoleResult.rows[0].id;
      const hashedPassword = await bcrypt.hash('admin123!@#', 12);
      await client.query(`
        INSERT INTO users (email, password, "firstName", "lastName", "roleId", "accountStatus")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, ['admin@primefrontier.com', hashedPassword, 'Admin', 'User', adminRoleId, 'active']);
      console.log('✅ Admin user seeded');
    }

    // Manager
    const managerRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['manager']);
    if (managerRoleResult.rows.length > 0) {
      const managerRoleId = managerRoleResult.rows[0].id;
      const hashedPassword = await bcrypt.hash('manager123', 12);
      await client.query(`
        INSERT INTO users (email, password, "firstName", "lastName", "roleId", "accountStatus")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, ['manager@primefrontier.com', hashedPassword, 'Project', 'Manager', managerRoleId, 'active']);
      console.log('✅ Manager user seeded');
    }

    // --- Seed mining_samples ---
    try {
      await client.query(`
        INSERT INTO mining_samples (sample_id, depth_m, latitude, longitude, meta)
        VALUES
          ('MS-001', 100.5, 47.123, -101.456, '{"rock_type": "shale", "notes": "Initial sample"}'),
          ('MS-002', 150.2, 47.125, -101.458, '{"rock_type": "sandstone", "notes": "Second sample"}')
        ON CONFLICT (sample_id) DO NOTHING
      `);
      console.log('✅ Mining samples seeded');
    } catch (error) {
      console.log('ℹ️  Mining samples table may not exist, skipping mining_samples seeding');
    }

    // Display final counts
    const finalRoles = await client.query('SELECT COUNT(*) FROM roles');
    const finalUsers = await client.query('SELECT COUNT(*) FROM users');
    const finalPermissions = await client.query('SELECT COUNT(*) FROM permissions');
    const finalSamples = await client.query('SELECT COUNT(*) FROM mining_samples');

    console.log('\n📈 Seeding Summary:');
    console.log(`   • ${finalRoles.rows[0].count} roles`);
    console.log(`   • ${finalUsers.rows[0].count} users`);
    console.log(`   • ${finalPermissions.rows[0].count} permissions`);
    console.log(`   • ${finalSamples.rows[0].count} mining samples`);

    console.log('\n👤 Available Test Accounts:');
    console.log('   • Super Admin: imeekwere15@gmail.com / passworD12345#');
    console.log('   • Admin: admin@primefrontier.com / admin123!@#');
    console.log('   • Manager: manager@primefrontier.com / manager123');

    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeding
seedDatabase().catch(console.error);