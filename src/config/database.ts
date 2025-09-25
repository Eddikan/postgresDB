import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // return an error after 10 seconds if connection could not be established
  statement_timeout: 30000, // cancel any statement that takes more than 30 seconds
});

// Database connection function
export async function connectDatabase() {
  try {
    // Test the connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully to Render PostgreSQL');
    client.release(); // return the client to the pool
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Export the database pool
export default pool;