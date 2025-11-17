'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Seed permissions
    const permissions = [
      'SYSTEM_MANAGE_USERS',
      'SYSTEM_SCHEMA_CHANGES', 
      'SYSTEM_INTEGRATIONS',
      'SYSTEM_AUDIT_LOGS',
      'SYSTEM_OVERRIDE_CHANGES',
      'PROJECT_CREATE',
      'PROJECT_ARCHIVE',
      'PROJECT_READ',
      'PROJECT_ASSIGN_PERMISSIONS',
      'DRILLING_APPROVE_LOGS',
      'DRILLING_APPROVE_MODELS',
      'DRILLING_REVIEW_PROGRESS',
      'DRILLING_APPROVE_ADJUSTMENTS',
      'DRILLING_VALIDATE_DATA',
      'DRILLING_INPUT_LOGS',
      'DRILLING_UPLOAD_PHOTOS',
      'DRILLING_ENTER_ASSAYS',
      'DRILLING_UPDATE_GEOLOGY',
      'DRILLING_INPUT_PROGRESS',
      'DRILLING_TRACK_SAMPLES',
      'DRILLING_UPLOAD_NOTES',
      'DRILLING_READ',
      'REPORTS_RUN_EXPORT',
      'REPORTS_CONFIGURE_DASHBOARDS',
      'REPORTS_RUN_VISUALIZATIONS',
      'REPORTS_VIEW_DASHBOARDS',
      'REPORTS_VIEW_ESG_METRICS',
      'DATA_DELETE_HISTORICAL',
      'DATA_LOCK_VALIDATED',
      'DATA_REQUIRE_APPROVAL',
      'ACCESS_ALL_PROJECTS',
      'ACCESS_ASSIGNED_PROJECTS'
    ].map(name => ({
      id: require('crypto').randomUUID(),
      name,
      description: `Permission: ${name.replace(/_/g, ' ').toLowerCase()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await queryInterface.bulkInsert('permissions', permissions);

    // 2. Seed roles
    const roles = [
      {
        id: 'super-admin-id-001',
        name: 'super_admin',
        description: 'Super administrator with all permissions',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'admin-id-001',
        name: 'admin',
        description: 'Administrator with most permissions',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'manager-id-001',
        name: 'manager',
        description: 'Project manager with project oversight permissions',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'editor-id-001',
        name: 'editor',
        description: 'Content editor with data modification permissions',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'contributor-id-001',
        name: 'contributor',
        description: 'Data contributor with limited modification permissions',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'viewer-id-001',
        name: 'viewer',
        description: 'Read-only access to assigned projects',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('roles', roles);

    // 3. Seed role permissions (super_admin gets all permissions)
    const allPermissionIds = await queryInterface.sequelize.query(
      'SELECT id FROM permissions',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const superAdminPermissions = allPermissionIds.map(perm => ({
      id: require('crypto').randomUUID(),
      roleId: 'super-admin-id-001',
      permissionId: perm.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await queryInterface.bulkInsert('role_permissions', superAdminPermissions);

    // 4. Seed default super admin user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('passworD12345#', 12);

    await queryInterface.bulkInsert('users', [{
      id: require('crypto').randomUUID(),
      email: 'imeekwere15@gmail.com',
      firstName: 'Ime',
      lastName: 'Ekwere',
      password: hashedPassword,
      accountStatus: 'active',
      roleId: 'super-admin-id-001',
      fieldRole: 'geologist',
      twoFactorEnabled: false,
      has_changed_default_password: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
  }
};