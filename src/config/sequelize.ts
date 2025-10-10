import 'reflect-metadata';
import { Sequelize, Model } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// ✅ Initialize Sequelize
export const sequelize = new Sequelize({
  database: process.env.DB_NAME!,
  dialect: 'postgres',
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl:
      process.env.NODE_ENV === 'production' ||
      process.env.DB_HOST?.includes('render.com')
        ? { rejectUnauthorized: false }
        : false,
  },
  models: [path.join(__dirname, '../models/**/*.model.{ts,js}')],
  modelMatch: (filename, member) =>
    filename.substring(0, filename.indexOf('.model')) === member.toLowerCase(),
  define: {
    timestamps: true,
    underscored: false,
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

//
// ✅ Helper function to recursively convert all Date fields to UTC ISO strings
//
function convertDatesToUTC(obj: any) {
  if (!obj || typeof obj !== 'object') return;

  // Handle Sequelize Model instances
  if (obj instanceof Model) {
    const dataValues = (obj as any).dataValues || {};
    for (const key of Object.keys(dataValues)) {
      const val = dataValues[key];

      if (val instanceof Date) {
        // Convert to UTC ISO string
        const utcIso = new Date(
          val.getTime() - val.getTimezoneOffset() * 60000
        ).toISOString();
        (obj as any).setDataValue(key, utcIso);
      } else if (Array.isArray(val)) {
        val.forEach((v) => convertDatesToUTC(v));
      } else if (val && typeof val === 'object') {
        convertDatesToUTC(val);
      }
    }
    return;
  }

  // Handle plain objects
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val instanceof Date) {
      obj[key] = new Date(val.getTime() - val.getTimezoneOffset() * 60000).toISOString();
    } else if (Array.isArray(val)) {
      val.forEach((v) => convertDatesToUTC(v));
    } else if (val && typeof val === 'object') {
      convertDatesToUTC(val);
    }
  }
}

//
// ✅ Global hook to ensure all date fields come out as UTC
//
sequelize.addHook('afterFind', (result: any) => {
  if (!result) return;
  if (Array.isArray(result)) {
    result.forEach((r) => convertDatesToUTC(r));
  } else {
    convertDatesToUTC(result);
  }
});

//
// ✅ Database connection + sync
//
export async function initializeSequelize(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connection established successfully.');

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
