import 'reflect-metadata';
import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Sequelize configuration for TypeScript models
export const sequelize = new Sequelize({
  database: process.env.DB_NAME!,
  dialect: 'postgres',
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('render.com')
      ? { rejectUnauthorized: false }
      : false,
  },
  models: [path.join(__dirname, '../models/**/*.model.{ts,js}')],
  modelMatch: (filename, member) => {
    return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase();
  },
  define: {
    timestamps: true,
    underscored: false, // Use camelCase
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Database connection function
export async function initializeSequelize(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connection established successfully.');
    
    // Sync database (only for development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
}

export default sequelize;