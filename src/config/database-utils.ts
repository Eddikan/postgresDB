import pg from 'pg';

/**
 * Database utility functions for common operations
 */

export class DatabaseUtils {
  static async executeQuery(client: pg.Client, query: string, params?: any[]): Promise<pg.QueryResult> {
    try {
      const result = await client.query(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  static async findById(client: pg.Client, table: string, id: string): Promise<any | null> {
    const query = `SELECT * FROM ${table} WHERE id = $1`;
    const result = await this.executeQuery(client, query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async findAll(client: pg.Client, table: string, orderBy = 'created_at DESC'): Promise<any[]> {
    const query = `SELECT * FROM ${table} ORDER BY ${orderBy}`;
    const result = await this.executeQuery(client, query);
    return result.rows;
  }

  static async insert(client: pg.Client, table: string, data: Record<string, any>): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (id, ${columns.join(', ')}, "createdAt", "updatedAt")
      VALUES (uuid_generate_v4(), ${placeholders}, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await this.executeQuery(client, query, values);
    return result.rows[0];
  }

  static async update(client: pg.Client, table: string, id: string, data: Record<string, any>): Promise<any> {
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateFields.push(`"${key}" = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`"updatedAt" = NOW()`);
    values.push(id);

    const query = `
      UPDATE ${table} 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.executeQuery(client, query, values);
    return result.rows[0];
  }

  static async deleteById(client: pg.Client, table: string, id: string): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = $1`;
    const result = await this.executeQuery(client, query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}