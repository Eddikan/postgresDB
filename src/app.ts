import Fastify, { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { authRoutes, userRoutes, projectRoutes, drillingRoutes, drillHoleRoutes, mediaRoutes, profileRoutes, roleRoutes, invitationRoutes, testEmailRoute, miningSamplesRoutes, twoFactorRoutes, organisationRoutes, fieldRoleRoutes, publicRoutes } from './routes';
import pool, { connectDatabase } from './config/database';
import { initializeSequelize, sequelize } from './config/sequelize';
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import pg from 'pg';
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

/**
 * Build and configure the Fastify application
 * This function can be used both for standalone server and AWS Lambda
 */
export async function buildApp(): Promise<FastifyInstance> {
  const server = Fastify({ 
    logger: true,
    // For Lambda, we need to handle binary data properly
    requestIdLogLabel: 'reqId',
    // Reasonable timeouts for file uploads
    connectionTimeout: 120000, // 2 minutes for connection
    requestTimeout: 120000,    // 2 minutes for request processing
    bodyLimit: 50 * 1024 * 1024, // 50MB body limit
  });

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
    throw err; // Throw instead of exit for Lambda
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
  await server.register(fastifyHelmet, {
    // Disable CSP for API
    contentSecurityPolicy: false,
  });

  // Register Rate Limiting
  await server.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Register JWT
  await server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret',
  });

  // Override multipart/form-data parser for Formidable
  server.removeContentTypeParser('multipart/form-data');
  server.addContentTypeParser('multipart/form-data', function (request, payload, done) {
    done(null, payload);
  });

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
  await server.register(fieldRoleRoutes, { prefix: '/field-roles' });
  await server.register(userRoutes, { prefix: '/users' });
  await server.register(projectRoutes, { prefix: '/projects' });
  await server.register(drillingRoutes, { prefix: '/drillings' });
  await server.register(drillHoleRoutes, { prefix: '/api/drillholes' });
  await server.register(mediaRoutes, { prefix: '/media' });
  await server.register(miningSamplesRoutes, { prefix: '/' });
  await server.register(twoFactorRoutes, { prefix: '/2fa' });
  await server.register(organisationRoutes, { prefix: '/organisation' });
  
  // Public routes (no authentication required)
  await server.register(publicRoutes, { prefix: '/public' });
  await testEmailRoute(server);

  // Health check
  server.get('/health', async () => ({ 
    status: 'development server with real-time updates!', 
    timestamp: new Date().toISOString() 
  }));

  return server;
}

export default buildApp;
