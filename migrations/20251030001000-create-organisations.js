'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create organisations table
    await queryInterface.createTable('organisations', {
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
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      size: {
        type: Sequelize.INTEGER,
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

    // 2. Add organisationId to users table
    await queryInterface.addColumn('users', 'organisationId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'organisations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3. Add phoneNumber to users table
    await queryInterface.addColumn('users', 'phoneNumber', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // 4. Add indexes
    await queryInterface.addIndex('users', ['organisationId']);
    await queryInterface.addIndex('organisations', ['name']);
  },

  async down(queryInterface, Sequelize) {
    // Remove columns and table in reverse order
    await queryInterface.removeColumn('users', 'phoneNumber');
    await queryInterface.removeColumn('users', 'organisationId');
    await queryInterface.dropTable('organisations');
  }
};