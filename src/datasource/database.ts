import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

// Database configuration
const dbConfig: DatabaseConfig = {
  user: process.env.DB_USERNAME || 'ime',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'drilling_backend',
  password: process.env.DB_PASSWORD || 'passworD12345#',
  port: parseInt(process.env.DB_PORT || '5432'),
};

/**
 * Database connection manager with SQL injection protection
 * All queries should use parameterized queries through this class
 */
export class DatabaseConnection {
  private client: pg.Client;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig = dbConfig) {
    this.client = new pg.Client(config);
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
        console.log('✅ Database connected successfully');
      } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
      }
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.end();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    }
  }

  /**
   * Execute a parameterized query to prevent SQL injection
   * @param query SQL query with $1, $2, etc. placeholders
   * @param params Array of parameters to replace placeholders
   * @returns Query result
   */
  async query<T extends pg.QueryResultRow = any>(query: string, params: any[] = []): Promise<pg.QueryResult<T>> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const result = await this.client.query<T>(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute a transaction with multiple queries
   * @param callback Function containing the transaction logic
   * @returns Result of the transaction
   */
  async transaction<T>(callback: (query: (sql: string, params?: any[]) => Promise<pg.QueryResult<any>>) => Promise<T>): Promise<T> {
    if (!this.isConnected) {
      await this.connect();
    }

    await this.client.query('BEGIN');
    
    try {
      const transactionQuery = async (sql: string, params: any[] = []) => {
        return await this.client.query(sql, params);
      };
      
      const result = await callback(transactionQuery);
      await this.client.query('COMMIT');
      return result;
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get the underlying pg.Client for advanced operations
   * Use with caution - prefer the query() method for safety
   */
  getClient(): pg.Client {
    return this.client;
  }

  /**
   * Check if the database is connected
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

// Create and export a singleton instance
export const databaseConnection = new DatabaseConnection();

// Export function to initialize database connection
export async function connectDatabase(): Promise<DatabaseConnection> {
  await databaseConnection.connect();
  return databaseConnection;
}

// Export the default connection for backward compatibility
export default databaseConnection.getClient();