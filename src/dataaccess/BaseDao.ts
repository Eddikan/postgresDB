import { DatabaseConnection } from '../datasource';
import pg from 'pg';

/**
 * Base Data Access Object class with common database operations
 * All DAO classes should extend this for consistent SQL injection protection
 */
export abstract class BaseDao {
  protected db: DatabaseConnection;

  constructor(database: DatabaseConnection) {
    this.db = database;
  }

  /**
   * Execute a parameterized query safely
   * @param query SQL query with placeholders ($1, $2, etc.)
   * @param params Array of parameters
   * @returns Query result
   */
  protected async query<T extends pg.QueryResultRow = any>(
    query: string, 
    params: any[] = []
  ): Promise<pg.QueryResult<T>> {
    return await this.db.query<T>(query, params);
  }

  /**
   * Execute a transaction safely
   * @param callback Transaction callback function
   * @returns Transaction result
   */
  protected async transaction<T>(
    callback: (query: (sql: string, params?: any[]) => Promise<pg.QueryResult<any>>) => Promise<T>
  ): Promise<T> {
    return await this.db.transaction(callback);
  }

  /**
   * Helper method to build WHERE clauses safely
   * @param conditions Object with column names and values
   * @returns Object with WHERE clause and parameters
   */
  protected buildWhereClause(conditions: Record<string, any>): {
    whereClause: string;
    params: any[];
  } {
    const entries = Object.entries(conditions).filter(([_, value]) => value !== undefined);
    
    if (entries.length === 0) {
      return { whereClause: '', params: [] };
    }

    const whereParts = entries.map(([key], index) => `${key} = $${index + 1}`);
    const params = entries.map(([_, value]) => value);

    return {
      whereClause: `WHERE ${whereParts.join(' AND ')}`,
      params
    };
  }

  /**
   * Helper method to build UPDATE SET clauses safely
   * @param updates Object with column names and new values
   * @param startParamIndex Starting parameter index (for when WHERE params exist)
   * @returns Object with SET clause and parameters
   */
  protected buildSetClause(updates: Record<string, any>, startParamIndex: number = 1): {
    setClause: string;
    params: any[];
  } {
    const entries = Object.entries(updates).filter(([_, value]) => value !== undefined);
    
    if (entries.length === 0) {
      return { setClause: '', params: [] };
    }

    const setParts = entries.map(([key], index) => `${key} = $${startParamIndex + index}`);
    const params = entries.map(([_, value]) => value);

    return {
      setClause: `SET ${setParts.join(', ')}`,
      params
    };
  }

  /**
   * Helper method to build INSERT clauses safely
   * @param data Object with column names and values
   * @returns Object with columns, values placeholder, and parameters
   */
  protected buildInsertClause(data: Record<string, any>): {
    columns: string;
    values: string;
    params: any[];
  } {
    const entries = Object.entries(data).filter(([_, value]) => value !== undefined);
    
    const columns = entries.map(([key]) => key).join(', ');
    const values = entries.map((_, index) => `$${index + 1}`).join(', ');
    const params = entries.map(([_, value]) => value);

    return { columns, values, params };
  }
}