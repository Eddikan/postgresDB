'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('projects', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      projectName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      projectCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      country: {
        type: Sequelize.STRING(2), // ISO2 country code
        allowNull: false
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'completed', 'archived'),
        allowNull: false,
        defaultValue: 'pending'
      },
      organisationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'organisations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      drillHoles: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      // Legacy fields for backward compatibility
      name: {
        type: Sequelize.STRING(255),
        allowNull: true
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

    // Add indexes
    await queryInterface.addIndex('projects', ['projectCode'], { unique: true });
    await queryInterface.addIndex('projects', ['country']);
    await queryInterface.addIndex('projects', ['status']);
    await queryInterface.addIndex('projects', ['organisationId']);
    await queryInterface.addIndex('projects', ['createdBy']);
    await queryInterface.addIndex('projects', ['organisationId', 'status']);
    await queryInterface.addIndex('projects', ['startDate', 'endDate']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('projects');
    // Drop the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_projects_status";');
  }
};