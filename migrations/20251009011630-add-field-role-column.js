'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create fieldRole enum if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_fieldRole" AS ENUM('driller', 'geologist', 'miner');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add fieldRole column to users table
    await queryInterface.addColumn('users', 'fieldRole', {
      type: Sequelize.ENUM('driller', 'geologist', 'miner'),
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove fieldRole column
    await queryInterface.removeColumn('users', 'fieldRole');
    
    // Drop enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_users_fieldRole";
    `);
  }
};
