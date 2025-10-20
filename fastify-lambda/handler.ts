/**
 * AWS Lambda Handler for Fastify Backend
 * 
 * This handler wraps the Fastify application for AWS Lambda execution.
 * It uses aws-lambda-fastify to proxy API Gateway events to Fastify.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * ========================
 * 
 * 1. Build the TypeScript code:
 *    npm run build
 * 
 * 2. Deploy to AWS Lambda:
 *    cd fastify-lambda
 *    serverless deploy
 * 
 * 3. Deploy to specific stage:
 *    serverless deploy --stage production
 * 
 * 4. View logs:
 *    serverless logs -f api -t
 * 
 * LOCAL TESTING:
 * ==============
 * 
 * 1. Install serverless-offline:
 *    npm install --save-dev serverless-offline
 * 
 * 2. Start local server:
 *    serverless offline
 * 
 * 3. Test endpoints:
 *    curl http://localhost:3000/health
 *    curl http://localhost:3000/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password"}'
 * 
 * ENVIRONMENT VARIABLES:
 * =====================
 * Set these in serverless.yml under provider.environment or use AWS Systems Manager Parameter Store
 * - DB_HOST
 * - DB_NAME
 * - DB_USERNAME
 * - DB_PASSWORD
 * - DB_PORT
 * - JWT_SECRET
 * - FRONTEND_URL
 * - All other environment variables from your .env file
 * 
 * NOTES:
 * ======
 * - Lambda has a cold start time. First request may be slow.
 * - Database connections are reused across warm Lambda invocations.
 * - Consider using RDS Proxy for better connection management at scale.
 * - File uploads should use S3 instead of local filesystem.
 */

import { Handler, Context, APIGatewayProxyEvent } from 'aws-lambda';
import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './src/app';

// Initialize the Fastify app (this happens once per Lambda container)
let proxy: Handler;

/**
 * Get or create the Lambda proxy handler
 * This caches the Fastify app instance for warm starts
 */
async function getHandler(): Promise<Handler> {
  if (!proxy) {
    const app = await buildApp();
    
    // Wrap Fastify app with aws-lambda-fastify
    proxy = awsLambdaFastify(app, {
      // Enable binary support for file uploads/downloads
      binaryMimeTypes: [
        'application/octet-stream',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-zip-compressed',
        'multipart/form-data',
      ],
    });
  }
  return proxy;
}

/**
 * Lambda handler function
 * This is the entry point for all AWS Lambda invocations
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  // Get the cached or new handler
  const proxyHandler = await getHandler();
  
  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Execute the request and return the result
  return await proxyHandler(event, context);
};
