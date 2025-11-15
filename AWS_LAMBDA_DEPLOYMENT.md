# AWS Lambda Deployment Guide

Complete guide to deploy the Primefrontier Backend to AWS Lambda with API Gateway.

## 📋 Prerequisites

### 1. AWS Resources (Already Setup)
- ✅ **RDS PostgreSQL Database** - Make sure you have:
  - Endpoint URL
  - Database name
  - Username and password
  - Security group allows Lambda access
- ✅ **S3 Bucket** - `drilling-management-photos`
- ✅ **AWS Access Keys** - For S3 and deployment

### 2. Required Tools

Install Serverless Framework globally:
```bash
npm install -g serverless
```

Install AWS CLI (if not already installed):
```bash
# macOS
brew install awscli

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

## 🔧 Step 1: Update Environment Variables

Edit `fastify-lambda/.env` with your AWS RDS details:

```bash
cd fastify-lambda
nano .env
```

**Update these values:**
```properties
# Replace with your RDS endpoint
DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@your-rds-endpoint.us-east-1.rds.amazonaws.com:5432/primefrontier
DB_HOST=your-rds-endpoint.us-east-1.rds.amazonaws.com
DB_NAME=primefrontier
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_USERNAME=YOUR_USERNAME

# Update JWT secret for production
JWT_SECRET=generate-a-very-secure-random-string-here
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🚀 Step 2: Build and Deploy

### First Time Deployment

```bash
# From project root directory
cd /Users/eddy/Documents/new\ job/PF/primefrontier

# Build TypeScript code
npm run build:lambda

# Deploy to AWS Lambda
cd fastify-lambda
serverless deploy
```

### Deploy to Production Stage

```bash
serverless deploy --stage production
```

## 📊 Step 3: Run Database Migrations

After deployment, run migrations on your RDS database:

**Option A: From your local machine (if RDS is publicly accessible)**
```bash
# Update root .env with RDS credentials temporarily
DATABASE_URL=postgresql://YOUR_RDS_ENDPOINT:5432/primefrontier
DB_HOST=YOUR_RDS_ENDPOINT
# ... other RDS values

# Run migrations
npm run db:migrate
```

**Option B: Create a Lambda function for migrations**
```bash
# SSH into an EC2 instance in same VPC as RDS
# Or use AWS Systems Manager Session Manager
# Then run migrations from there
```

## 🔍 Step 4: Test Your Deployment

After deployment, Serverless will output your API endpoint:
```
endpoints:
  ANY - https://abc123xyz.execute-api.us-east-1.amazonaws.com/{proxy+}
```

### Test Health Endpoint
```bash
curl https://YOUR_API_GATEWAY_URL/health
```

### Test Login
```bash
curl -X POST https://YOUR_API_GATEWAY_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

### Test Organisation Setup
```bash
curl -X POST https://YOUR_API_GATEWAY_URL/organisation/setup \
  -H "Content-Type: application/json" \
  -d '{
    "organisation": {
      "name": "Test Company",
      "address": "123 Test St",
      "size": 50
    },
    "primaryContact": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@testcompany.com"
    }
  }'
```

## 📝 Step 5: View Logs

```bash
# Real-time logs
serverless logs -f api -t

# Or using AWS CloudWatch
aws logs tail /aws/lambda/primefrontier-api-dev-api --follow
```

## 🔐 Step 6: Security Checklist

### RDS Security Group
Ensure your RDS security group allows inbound traffic from Lambda:
1. Go to AWS RDS Console → Your Database → Connectivity & Security
2. Click on VPC security groups
3. Add inbound rule: PostgreSQL (5432) from Lambda's security group or VPC CIDR

### Lambda VPC Configuration (if needed)
If your RDS is in a private subnet, configure Lambda to use the same VPC:

Update `serverless.yml`:
```yaml
provider:
  vpc:
    securityGroupIds:
      - sg-xxxxxxxxx  # Your RDS security group
    subnetIds:
      - subnet-xxxxxxxx  # Private subnet 1
      - subnet-xxxxxxxx  # Private subnet 2
```

### S3 Bucket CORS
Ensure your S3 bucket has CORS configured for file uploads:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://www.ime.com.ng"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## 🔄 Step 7: Update Frontend URL

Update your frontend to use the new API Gateway endpoint:
```typescript
// In your frontend config
const API_URL = 'https://YOUR_API_GATEWAY_URL';
```

## 📈 Monitoring & Optimization

### Increase Memory/Timeout (if needed)
Edit `fastify-lambda/serverless.yml`:
```yaml
functions:
  api:
    handler: handler.handler
    timeout: 30       # Increase to 30s or 60s
    memorySize: 1024  # Increase to 1024MB or 2048MB
```

Then redeploy:
```bash
serverless deploy
```

### Enable X-Ray Tracing
```yaml
provider:
  tracing:
    lambda: true
    apiGateway: true
```

### Set up CloudWatch Alarms
Monitor:
- Lambda errors
- Lambda duration
- API Gateway 4xx/5xx errors
- RDS connections

## 🛠️ Troubleshooting

### Issue: Timeout connecting to RDS
**Solution:** 
- Check RDS security group allows Lambda
- Ensure Lambda is in same VPC as RDS (if RDS is private)
- Increase Lambda timeout in serverless.yml

### Issue: S3 Upload fails
**Solution:**
- Verify AWS credentials in environment variables
- Check S3 bucket name is correct
- Verify IAM role has S3 permissions

### Issue: Cold start is slow
**Solution:**
- Increase memory allocation (more memory = faster CPU)
- Consider using Provisioned Concurrency
- Use VPC endpoints to reduce latency

### Issue: Database connection pool exhausted
**Solution:**
- Use RDS Proxy for connection pooling
- Set Lambda concurrency limits
- Optimize database queries

## 🔄 Continuous Deployment

### GitHub Actions (Optional)
Create `.github/workflows/deploy-lambda.yml`:
```yaml
name: Deploy to AWS Lambda

on:
  push:
    branches: [main, production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:lambda
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to Lambda
        run: |
          cd fastify-lambda
          serverless deploy --stage production
```

## 📚 Useful Commands

```bash
# Deploy
serverless deploy

# Deploy specific stage
serverless deploy --stage production

# View info
serverless info

# View logs
serverless logs -f api -t

# Invoke function locally
serverless invoke local -f api

# Remove deployment
serverless remove

# Update single function (faster)
serverless deploy function -f api
```

## 💰 Cost Estimation

AWS Lambda pricing (as of 2024):
- **Requests:** $0.20 per 1M requests
- **Duration:** $0.0000166667 per GB-second
- **Free tier:** 1M requests + 400,000 GB-seconds per month

Example (1,000 users, 100 req/user/month):
- Requests: 100,000 per month (FREE under free tier)
- Estimated cost: ~$5-10/month (mostly RDS + S3)

## 📞 Support

If you encounter issues:
1. Check CloudWatch Logs: `serverless logs -f api -t`
2. Verify RDS connectivity from Lambda
3. Check IAM permissions for S3
4. Ensure environment variables are set correctly

---

**Deployment Status:** ⏳ Ready to Deploy
**Last Updated:** November 13, 2025
