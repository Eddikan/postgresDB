#!/bin/bash
# Lambda Deployment Script
# Usage: ./deploy-lambda.sh [stage]
# Example: ./deploy-lambda.sh dev

set -e  # Exit on error

STAGE=${1:-dev}

echo "🚀 Starting Lambda deployment to stage: $STAGE"
echo ""

# Step 1: Compile all TypeScript (optional - only if you want fresh compile)
# echo "📦 Compiling TypeScript..."
# npm run build

# Step 2: Prepare Lambda package
echo "📦 Preparing Lambda package..."
cd fastify-lambda
./predeploy.sh

# Step 3: Deploy to AWS
echo "🚢 Deploying to AWS Lambda..."
if [ "$STAGE" = "production" ] || [ "$STAGE" = "prod" ]; then
  serverless deploy --stage production
else
  serverless deploy --stage dev
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 View your deployment:"
echo "   AWS Console: https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions"
echo "   API Endpoint: https://087p2tcznb.execute-api.us-east-1.amazonaws.com"
echo ""
echo "📝 View logs:"
echo "   npm run lambda:logs"
echo ""
