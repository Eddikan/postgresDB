'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create all tables that exist in your current schema
    
    // 1. Create permissions table
    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 2. Create roles table
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.ENUM('super_admin', 'admin', 'manager', 'editor', 'contributor', 'viewer'),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 3. Create role_permissions table
    await queryInterface.createTable('role_permissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      roleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      permissionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'permissions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 4. Create users table with fieldRole
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      accountStatus: {
        type: Sequelize.ENUM('pending', 'active', 'inactive', 'suspended'),
        defaultValue: 'pending'
      },
      roleId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      fieldRole: {
        type: Sequelize.ENUM('driller', 'geologist', 'miner'),
        allowNull: true
      },
      twoFactorEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      twoFactorSecret: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      twoFactorType: {
        type: Sequelize.ENUM('email', 'sms', 'totp'),
        allowNull: true
      },
      twoFactorTarget: {
        type: Sequelize.STRING,
        allowNull: true
      },
      twoFactorCode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      twoFactorCodeExpires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      invitationToken: {
        type: Sequelize.STRING,
        allowNull: true
      },
      invitationExpires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      invitedBy: {
        type: Sequelize.UUID,
        allowNull: true
      },
      invitedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      activatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true
      },
      has_changed_default_password: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      passwordChangedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add any other tables (projects, drillings, etc.) if they exist
    
    // Add indexes
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['roleId']);
    await queryInterface.addIndex('role_permissions', ['roleId', 'permissionId'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (due to foreign key constraints)
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('permissions');
  }
};
