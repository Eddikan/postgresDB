'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // First, get existing enum values to avoid duplicates
    const [results] = await queryInterface.sequelize.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_fieldRole')"
    );
    
    const existingValues = results.map(row => row.enumlabel);
    
    // All the new enum values from your TypeScript enum
    const newValues = [
      'System Owner',
      'CTO',
      'Director of Mining Ops',
      'Platform Owner',
      'Internal Tech Lead',
      'COO',
      'Operations',
      'Tech Services Manager',
      'IT Lead',
      'Technical Services Manager',
      'IT/Data Manager',
      'Mine Manager',
      'Project Geologist',
      'HSE Manager',
      'Environmental & Safety Manager',
      'Geologists',
      'Data Scientists',
      'Engineers',
      'Exploration Geologist',
      'Drill Geologist',
      'Drill Supervisors',
      'Field Technicians',
      'Field Assistants',
      'CEO',
      'BD Teams',
      'Community Relations Manager',
      'Executives',
      'Investors'
    ];
    
    // Add each new value if it doesn't already exist
    for (const value of newValues) {
      if (!existingValues.includes(value)) {
        await queryInterface.sequelize.query(
          `ALTER TYPE "public"."enum_users_fieldRole" ADD VALUE '${value}'`
        );
      }
    }
  },

  async down (queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require dropping and recreating the enum type
    console.log('Down migration not implemented - PostgreSQL does not support removing enum values');
  }
};
