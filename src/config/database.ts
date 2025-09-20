import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USERNAME || 'ime',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'drilling_backend',
  password: process.env.DB_PASSWORD || 'passworD12345#',
  port: parseInt(process.env.DB_PORT || '5432'),
};

// Create and export the database client
const db = new pg.Client(dbConfig);

// Database connection function
export async function connectDatabase() {
  try {
    await db.connect();
    console.log('✅ Database connected successfully');
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Export the database client
export default db;