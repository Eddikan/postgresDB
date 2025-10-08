import { Sequelize, QueryTypes, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';

/**
 * Enhanced Base Data Access Object class with Sequelize integration
 * Maintains the same DAO interface while using Sequelize internally for better ORM features
 */
export abstract class SequelizeBaseDao {
  protected sequelize: Sequelize;
  protected Op: typeof Op;

  constructor() {
    this.sequelize = sequelize;
    this.Op = Op;
  }

  /**
   * Execute a SELECT query using Sequelize
   * @param query SQL query with placeholders ($1, $2, etc.)
   * @param params Array of parameters
   * @returns Query result
   */
  protected async query<T = any>(
    query: string, 
    params: any[] = []
  ): Promise<{ rows: T[]; rowCount?: number }> {
    // Handle special PostgreSQL array operations like ANY()
    let sequelizeQuery = query;
    let processedParams = [...params];
    
    // Handle ANY() with array parameters
    if (query.includes('ANY($') && params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        if (Array.isArray(params[i])) {
          // Convert ANY($n) to ANY(ARRAY[:param]) for proper array handling
          const paramName = `arrayParam${i}`;
          sequelizeQuery = sequelizeQuery.replace(`ANY($${i + 1})`, `ANY(:${paramName})`);
          
          // Use named parameters object for arrays
          const namedParams: { [key: string]: any } = {};
          namedParams[paramName] = params[i];
          
          try {
            const results = await this.sequelize.query(sequelizeQuery, {
              replacements: namedParams,
              type: QueryTypes.SELECT,
              raw: true,
            });

            return {
              rows: results as T[],
              rowCount: (results as T[]).length
            };
          } catch (error) {
            console.error('Database query error:', error);
            console.error('Original Query:', query);
            console.error('Converted Query:', sequelizeQuery);
            console.error('Params:', params);
            throw error;
          }
        }
      }
    }
    
    // Convert PostgreSQL-style parameters ($1, $2) to Sequelize-style (?, ?)
    if (params.length > 0) {
      for (let i = params.length; i >= 1; i--) {
        sequelizeQuery = sequelizeQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
      }
    }

    try {
      const results = await this.sequelize.query(sequelizeQuery, {
        replacements: processedParams,
        type: QueryTypes.SELECT,
        raw: true,
      });

      return {
        rows: results as T[],
        rowCount: (results as T[]).length
      };
    } catch (error) {
      console.error('Database query error:', error);
      console.error('Original Query:', query);
      console.error('Converted Query:', sequelizeQuery);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute non-SELECT queries (INSERT, UPDATE, DELETE) using Sequelize
   * @param query SQL query with placeholders ($1, $2, etc.)
   * @param params Array of parameters
   * @returns Query result with rowCount
   */
  protected async execute(
    query: string,
    params: any[] = []
  ): Promise<{ rowCount?: number }> {
    // Convert PostgreSQL-style parameters ($1, $2) to Sequelize-style (?, ?)
    let sequelizeQuery = query;
    if (params.length > 0) {
      for (let i = params.length; i >= 1; i--) {
        sequelizeQuery = sequelizeQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
      }
    }

    try {
      const [results, metadata] = await this.sequelize.query(sequelizeQuery, {
        replacements: params,
        raw: true,
      });

      return {
        rowCount: (metadata as any)?.rowCount || 0
      };
    } catch (error) {
      console.error('Database execute error:', error);
      console.error('Original Query:', query);
      console.error('Sequelize Query:', sequelizeQuery);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute a transaction using Sequelize
   * @param callback Transaction callback function
   * @returns Transaction result
   */
  protected async transaction<T>(
    callback: (query: (sql: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number }>) => Promise<T>
  ): Promise<T> {
    const t = await this.sequelize.transaction();
    
    try {
      const transactionQuery = async (sql: string, params: any[] = []) => {
        // Convert PostgreSQL-style parameters ($1, $2) to Sequelize-style (?, ?)
        let sequelizeQuery = sql;
        if (params.length > 0) {
          for (let i = params.length; i >= 1; i--) {
            sequelizeQuery = sequelizeQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
          }
        }

        const results = await this.sequelize.query(sequelizeQuery, {
          replacements: params,
          transaction: t,
          type: QueryTypes.SELECT,
          raw: true,
        });

        return {
          rows: results as any[],
          rowCount: (results as any[]).length
        };
      };
      
      const result = await callback(transactionQuery);
      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      throw error;
    }
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
    
    const whereParts = entries.map(([key], index) => `"${key}" = $${index + 1}`);
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
    const entries = Object.entries(updates);
    if (entries.length === 0) {
      return { setClause: '', params: [] };
    }
    
    const setParts = entries.map(([key], index) => `"${key}" = $${startParamIndex + index}`);
    const params = entries.map(([_, value]) => value === undefined ? null : value);
    
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
    const columns = entries.map(([key]) => `"${key}"`).join(', ');
    const values = entries.map((_, index) => `$${index + 1}`).join(', ');
    const params = entries.map(([_, value]) => value);

    return { columns, values, params };
  }
}