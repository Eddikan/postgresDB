import pg from 'pg';
import pool from '../config/database';

export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

/**
 * Database connection manager with SQL injection protection and connection pooling
 * All queries should use parameterized queries through this class
 */
export class DatabaseConnection {
  private pool: pg.Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Execute a parameterized query to prevent SQL injection
   * @param query SQL query with $1, $2, etc. placeholders
   * @param params Array of parameters to replace placeholders
   * @returns Query result
   */
  async query<T extends pg.QueryResultRow = any>(query: string, params: any[] = []): Promise<pg.QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<T>(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    } finally {
      client.release(); // return the client to the pool
    }
  }

  /**
   * Execute a transaction with multiple queries
   * @param callback Function containing the transaction logic
   * @returns Result of the transaction
   */
  async transaction<T>(callback: (query: (sql: string, params?: any[]) => Promise<pg.QueryResult<any>>) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const transactionQuery = async (sql: string, params: any[] = []) => {
        return await client.query(sql, params);
      };
      
      const result = await callback(transactionQuery);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release(); // return the client to the pool
    }
  }

  /**
   * Get the connection pool for advanced operations
   * Use with caution - prefer the query() method for safety
   */
  getPool(): pg.Pool {
    return this.pool;
  }

  /**
   * Check if the pool is available
   */
  isConnectionActive(): boolean {
    return this.pool && !this.pool.ended;
  }
}

// Create and export a singleton instance
export const databaseConnection = new DatabaseConnection();

// Export function to initialize database connection (now connects via pool)
export async function connectDatabase(): Promise<DatabaseConnection> {
  // The pool handles connections automatically, just return the connection manager
  return databaseConnection;
}

// Export the pool for backward compatibility
export default pool;