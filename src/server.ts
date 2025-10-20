import Fastify from 'fastify';
import fastifyExpress from '@fastify/express';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { authRoutes, userRoutes, projectRoutes, drillingRoutes, profileRoutes, roleRoutes, invitationRoutes, testEmailRoute, miningSamplesRoutes, twoFactorRoutes } from './routes';
import pool, { connectDatabase } from './config/database';
import { initializeSequelize, sequelize } from './config/sequelize';
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import pg from 'pg';
import fastifyMultipart from '@fastify/multipart';
import { registerAuthCheckHook } from './hooks/authCheck';
import { Logger } from './utils/Logger';

dotenv.config();

// Extend Fastify instance to include both raw pool and Sequelize
declare module 'fastify' {
  interface FastifyInstance {
    db: pg.Pool;        // For raw SQL queries
    sequelize: Sequelize; // For ORM queries
  }
}

const server = Fastify({ logger: true });

async function main() {
  // Initialize both raw database pool and Sequelize
  try {
    // Raw connection pool for existing queries
    await connectDatabase();
    Logger.info('✅ Database pool initialized successfully');
    
    // Sequelize for ORM and auto-sync in development  
    await initializeSequelize();
    Logger.info('✅ Sequelize initialized successfully');
  } catch (err) {
    Logger.error('❌ Database connection failed', err);
    process.exit(1);
  }

  // Make both accessible in routes
  server.decorate('db', pool);           // Raw SQL queries
  server.decorate('sequelize', sequelize); // ORM queries

  // Register Express compatibility
  await server.register(fastifyExpress);

  // Register CORS
  await server.register(fastifyCors, {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // Register Helmet for security
  await server.register(fastifyHelmet);

  // Register Rate Limiting
  await server.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Register JWT
  await server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret',
  });
  await server.register(fastifyMultipart);

  // Register auth check hook for 2FA enforcement
  await registerAuthCheckHook(server, {
    excludePaths: ['/auth/logout', '/docs', '/documentation'],
    excludePatterns: [/^\/static\//, /^\/public\//]
  });

  // Register routes
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(profileRoutes, { prefix: '/' });
  await server.register(roleRoutes, { prefix: '/' });
  await server.register(invitationRoutes, { prefix: '/invitations' });
  await server.register(userRoutes, { prefix: '/users' });
  await server.register(projectRoutes, { prefix: '/projects' });
  await server.register(drillingRoutes, { prefix: '/drillings' });
  await server.register(miningSamplesRoutes, { prefix: '/' });
  await server.register(twoFactorRoutes, { prefix: '/2fa' });
  await testEmailRoute(server);


  // Health check
  server.get('/health', async () => ({ status: 'ok' }));

  // Start server
  try {
    await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
    Logger.info(`🚀 Server running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    Logger.error('❌ Failed to start server', err);
    process.exit(1);
  }
}

main();
