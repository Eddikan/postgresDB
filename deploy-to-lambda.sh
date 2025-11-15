#!/bin/bash
# Deploy script for AWS Lambda

set -e  # Exit on error

echo "🚀 Starting AWS Lambda Deployment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if serverless is installed
if ! command -v serverless &> /dev/null; then
    echo "❌ Serverless Framework not found. Installing..."
    npm install -g serverless
fi

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build:lambda

# Navigate to fastify-lambda directory
cd fastify-lambda

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in fastify-lambda/"
    echo "Please create .env file with your RDS credentials"
    exit 1
fi

# Deploy
echo ""
echo "🚀 Deploying to AWS Lambda..."
serverless deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your RDS security group to allow Lambda access"
echo "2. Run database migrations: npm run db:migrate"
echo "3. Test your endpoints using the API Gateway URL above"
echo ""
echo "📊 View logs:"
echo "   serverless logs -f api -t"
echo ""
