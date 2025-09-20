import Fastify from 'fastify';
import fastifyExpress from '@fastify/express';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { authRoutes, userRoutes, projectRoutes, drillingRoutes } from './routes';
import database, { connectDatabase } from './config/database';
import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

// Extend Fastify instance to include db
declare module 'fastify' {
  interface FastifyInstance {
    db: pg.Client;
  }
}

const server = Fastify({ logger: true });

async function main() {
  // Connect to database
  try {
    await connectDatabase();
    server.log.info('✅ Database connected successfully');
  } catch (err) {
    server.log.error('❌ Database connection failed:');
    console.error(err);
    process.exit(1);
  }

  // Make db accessible in routes
  server.decorate('db', database);

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

  // Register routes
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(userRoutes, { prefix: '/users' });
  await server.register(projectRoutes, { prefix: '/projects' });
  await server.register(drillingRoutes, { prefix: '/drillings' });

  // Health check
  server.get('/health', async () => ({ status: 'ok' }));

  // Start server
  try {
    await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
    server.log.info(`🚀 Server running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
