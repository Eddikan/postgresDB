import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function updateDMPRoles() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('render.com') 
      ? { rejectUnauthorized: false } 
      : false,
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Updating DMP Role & Access Structure...');

    // Clear existing role permissions
    await client.query('DELETE FROM role_permissions');
    console.log('✅ Cleared existing role permissions');

    // Update permissions to match DMP requirements
    const permissions = [
      // System Management (Super Admin only)
      { name: 'system.manage_users', description: 'Full user management and role assignment' },
      { name: 'system.schema_changes', description: 'Database schema modifications' },
      { name: 'system.integrations', description: 'Manage system integrations' },
      { name: 'system.audit_logs', description: 'Access all logs and audit trails' },
      { name: 'system.override_changes', description: 'Override or roll back any changes' },
      
      // Project Management
      { name: 'project.create', description: 'Create new drilling projects' },
      { name: 'project.archive', description: 'Archive drilling projects' },
      { name: 'project.read', description: 'View drilling projects' },
      { name: 'project.assign_permissions', description: 'Assign project-level permissions' },
      
      // Drilling Operations & Logs
      { name: 'drilling.approve_logs', description: 'Approve and publish final drillhole logs' },
      { name: 'drilling.approve_models', description: 'Approve and publish resource models' },
      { name: 'drilling.review_progress', description: 'Review daily drilling progress reports' },
      { name: 'drilling.approve_adjustments', description: 'Approve/disapprove drilling adjustments' },
      { name: 'drilling.validate_data', description: 'Validate or flag drill data' },
      { name: 'drilling.input_logs', description: 'Input drill logs and core data' },
      { name: 'drilling.upload_photos', description: 'Upload core photos and images' },
      { name: 'drilling.enter_assays', description: 'Enter assay results' },
      { name: 'drilling.update_geology', description: 'Update lithology, alteration, structural data' },
      { name: 'drilling.input_progress', description: 'Input daily drilling progress' },
      { name: 'drilling.track_samples', description: 'Tag and track samples' },
      { name: 'drilling.upload_notes', description: 'Upload shift notes and photos' },
      { name: 'drilling.read', description: 'View drilling data' },
      
      // Reporting & Analytics
      { name: 'reports.run_export', description: 'Run and export reports (production, ESG, cost)' },
      { name: 'reports.configure_dashboards', description: 'Configure dashboards and KPIs' },
      { name: 'reports.run_visualizations', description: 'Run local visualizations and models' },
      { name: 'reports.view_dashboards', description: 'View dashboards and progress reports' },
      { name: 'reports.view_esg_metrics', description: 'View ESG compliance metrics' },
      
      // Data Integrity
      { name: 'data.delete_historical', description: 'Delete historical records' },
      { name: 'data.lock_validated', description: 'Lock validated data as read-only' },
      { name: 'data.require_approval', description: 'Require two-layer approvals for critical actions' },
      
      // Site Access
      { name: 'access.all_projects', description: 'Access to all projects and sites' },
      { name: 'access.assigned_projects', description: 'Access limited to assigned projects/sites' }
    ];

    // Clear existing permissions and insert new ones
    await client.query('DELETE FROM permissions');
    for (const permission of permissions) {
      await client.query(`
        INSERT INTO permissions (name, description) 
        VALUES ($1, $2)
      `, [permission.name, permission.description]);
    }
    console.log('✅ Updated permissions for DMP structure');

    // Update roles with new DMP structure
    const roles = [
      {
        name: 'super_admin',
        description: 'System Owner / CTO / Director of Mining Ops - Full platform control (1-4 people max)',
        permissions: [
          'system.manage_users', 'system.schema_changes', 'system.integrations', 
          'system.audit_logs', 'system.override_changes',
          'project.create', 'project.archive', 'project.read', 'project.assign_permissions',
          'drilling.approve_logs', 'drilling.approve_models', 'drilling.review_progress',
          'drilling.approve_adjustments', 'drilling.validate_data', 'drilling.input_logs',
          'drilling.upload_photos', 'drilling.enter_assays', 'drilling.update_geology',
          'drilling.input_progress', 'drilling.track_samples', 'drilling.upload_notes', 'drilling.read',
          'reports.run_export', 'reports.configure_dashboards', 'reports.run_visualizations',
          'reports.view_dashboards', 'reports.view_esg_metrics',
          'data.delete_historical', 'data.lock_validated', 'data.require_approval',
          'access.all_projects'
        ]
      },
      {
        name: 'admin',
        description: 'Operations / Tech Services Manager / IT Lead - Trusted power users controlling workflows',
        permissions: [
          'project.create', 'project.archive', 'project.read', 'project.assign_permissions',
          'drilling.approve_logs', 'drilling.approve_models', 'drilling.review_progress',
          'drilling.validate_data', 'drilling.read',
          'reports.run_export', 'reports.configure_dashboards', 'reports.run_visualizations',
          'reports.view_dashboards', 'reports.view_esg_metrics',
          'data.lock_validated', 'data.require_approval',
          'access.all_projects'
        ]
      },
      {
        name: 'manager',
        description: 'Mine Manager / Project Geologist / HSE Manager - Mid-level leadership and decision-makers',
        permissions: [
          'project.read',
          'drilling.review_progress', 'drilling.approve_adjustments', 'drilling.validate_data', 'drilling.read',
          'reports.run_export', 'reports.view_dashboards', 'reports.view_esg_metrics',
          'access.all_projects'
        ]
      },
      {
        name: 'editor',
        description: 'Geologists, Data Scientists, Engineers - Data input specialists with strong QA/QC protocols',
        permissions: [
          'project.read',
          'drilling.input_logs', 'drilling.upload_photos', 'drilling.enter_assays',
          'drilling.update_geology', 'drilling.read',
          'reports.run_visualizations', 'reports.view_dashboards',
          'access.assigned_projects'
        ]
      },
      {
        name: 'contributor',
        description: 'Drill Supervisors, Field Technicians - Simple mobile-friendly access for field operations',
        permissions: [
          'project.read',
          'drilling.input_progress', 'drilling.track_samples', 'drilling.upload_notes', 'drilling.read',
          'reports.view_dashboards',
          'access.assigned_projects'
        ]
      },
      {
        name: 'viewer',
        description: 'Executives, Investors, Community Relations - Dashboard access only with tailored views',
        permissions: [
          'reports.view_dashboards', 'reports.view_esg_metrics',
          'access.assigned_projects'
        ]
      }
    ];

    // Clear existing roles and recreate with new structure
    await client.query('DELETE FROM role_permissions');
    await client.query('DELETE FROM roles');

    for (const role of roles) {
      // Insert role
      const roleResult = await client.query(`
        INSERT INTO roles (name, description) 
        VALUES ($1, $2)
        RETURNING id
      `, [role.name, role.description]);
      
      const roleId = roleResult.rows[0].id;
      console.log(`✅ Role '${role.name}' created`);

      // Insert role permissions
      for (const permissionName of role.permissions) {
        const permissionResult = await client.query('SELECT id FROM permissions WHERE name = $1', [permissionName]);
        if (permissionResult.rows.length > 0) {
          const permissionId = permissionResult.rows[0].id;
          await client.query(`
            INSERT INTO role_permissions ("roleId", "permissionId") 
            VALUES ($1, $2)
          `, [roleId, permissionId]);
        }
      }
      console.log(`✅ ${role.permissions.length} permissions assigned to '${role.name}'`);
    }

    // Update existing users to use new role structure
    console.log('\n🔄 Updating existing user roles...');
    
    // Keep super_admin users as super_admin
    const superAdminRole = await client.query('SELECT id FROM roles WHERE name = $1', ['super_admin']);
    if (superAdminRole.rows.length > 0) {
      await client.query(`
        UPDATE users SET "roleId" = $1 
        WHERE email = 'imeekwere15@gmail.com'
      `, [superAdminRole.rows[0].id]);
      console.log('✅ Updated super admin user');
    }

    // Update admin users to new admin role
    const adminRole = await client.query('SELECT id FROM roles WHERE name = $1', ['admin']);
    if (adminRole.rows.length > 0) {
      await client.query(`
        UPDATE users SET "roleId" = $1 
        WHERE email = 'admin@primefrontier.com'
      `, [adminRole.rows[0].id]);
      console.log('✅ Updated admin user');
    }

    // Update manager users to new manager role  
    const managerRole = await client.query('SELECT id FROM roles WHERE name = $1', ['manager']);
    if (managerRole.rows.length > 0) {
      await client.query(`
        UPDATE users SET "roleId" = $1 
        WHERE email = 'manager@primefrontier.com'
      `, [managerRole.rows[0].id]);
      console.log('✅ Updated manager user');
    }

    // Display final role summary
    console.log('\n📊 DMP Role & Access Structure Summary:');
    const finalRoles = await client.query(`
      SELECT r.name, r.description, COUNT(rp."permissionId") as permission_count
      FROM roles r 
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      GROUP BY r.id, r.name, r.description
      ORDER BY r.name
    `);
    
    finalRoles.rows.forEach(role => {
      console.log(`   • ${role.name}: ${role.permission_count} permissions`);
      console.log(`     ${role.description}`);
    });

    console.log('\n🎉 DMP Role & Access Structure updated successfully!');
    console.log('\n📋 Role Hierarchy:');
    console.log('   1. Super Admin (System Owner) - 1-4 people max');
    console.log('   2. Admin (Operations/IT Manager) - Trusted power users');
    console.log('   3. Manager (Mine Manager/Geologist) - Decision makers');
    console.log('   4. Editor (Geologists/Engineers) - Data input specialists');  
    console.log('   5. Contributor (Field Technicians) - Mobile-friendly field access');
    console.log('   6. Viewer (Executives/Investors) - Dashboard access only');

  } catch (error) {
    console.error('❌ DMP role update failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the role update
updateDMPRoles().catch(console.error);