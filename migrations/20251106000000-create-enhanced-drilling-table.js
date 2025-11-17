'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing drillings table if it exists
    await queryInterface.dropTable('drillings');

    // Create the new drill holes table with enhanced structure
    await queryInterface.createTable('drillings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      drillingPlatform: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      contractor: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      mobilisationDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      shift: {
        type: Sequelize.ENUM('Day Shift (8:00AM - 17:00PM)', 'Night Shift (18:00PM - 7:00AM)'),
        allowNull: false
      },
      holeId: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      expectedDepth: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      metersDrilled: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      machineHours: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false
      },
      standbyHours: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false
      },
      drillingHours: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false
      },
      downtime: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false
      },
      downtimeCategory: {
        type: Sequelize.ENUM(
          'Mechanical',
          'Equipment Failure',
          'Weather',
          'Logistics',
          'Personnel',
          'Operational Delay',
          'Drilling Problems',
          'Standby'
        ),
        allowNull: false
      },
      reason: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      penetrationRate: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false
      },
      utilisation: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      waterUsed: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      additives: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      fuelUsed: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      fieldTopUp: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      operationalComment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      photos: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
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

    // Add indexes for better performance
    await queryInterface.addIndex('drillings', ['projectId'], {
      name: 'idx_drillings_project_id'
    });

    await queryInterface.addIndex('drillings', ['holeId'], {
      name: 'idx_drillings_hole_id'
    });

    await queryInterface.addIndex('drillings', ['projectId', 'holeId'], {
      name: 'idx_drillings_project_hole_unique',
      unique: true
    });

    await queryInterface.addIndex('drillings', ['createdAt'], {
      name: 'idx_drillings_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('drillings', 'idx_drillings_project_id');
    await queryInterface.removeIndex('drillings', 'idx_drillings_hole_id');
    await queryInterface.removeIndex('drillings', 'idx_drillings_project_hole_unique');
    await queryInterface.removeIndex('drillings', 'idx_drillings_created_at');

    // Drop the table
    await queryInterface.dropTable('drillings');

    // Recreate the old simple drillings table
    await queryInterface.createTable('drillings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      dataSet: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
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
  }
};