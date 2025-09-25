#!/usr/bin/env node

// Post-deployment script to initialize database schema
// This runs after the build process on Render

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function initializeDatabase() {
  console.log('🔧 Initializing database schema...');
  
  try {
    // Run database schema creation
    console.log('Creating database schema...');
    await execAsync('npm run db:create');
    
    console.log('Seeding database with initial data...');
    await execAsync('npm run db:seed');
    
    console.log('✅ Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Don't exit with error code as the app might still start
    // The schema creation might fail if tables already exist
    console.log('ℹ️  This might be normal if database already exists');
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;