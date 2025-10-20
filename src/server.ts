/**
 * Standalone server entry point
 * Uses the buildApp function from app.ts
 * For AWS Lambda deployment, see fastify-lambda/handler.ts
 */
import { buildApp } from './app';
import { Logger } from './utils/Logger';

async function main() {
  try {
    // Build and configure the Fastify app
    const server = await buildApp();

    // Start server
    await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
    Logger.info(`🚀 Server running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    Logger.error('❌ Failed to start server', err);
    process.exit(1);
  }
}

main();
