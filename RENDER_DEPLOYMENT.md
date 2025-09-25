# Render Deployment Configuration

## Build Command
```
npm install && npm run build
```

## Start Command  
```
npm start
```

# Render Deployment Guide

This guide covers deploying the Primefrontier backend to Render.

## 🚨 Quick Fix for Current Error

**Error**: `Cannot find module '/opt/render/project/src/dist/server.js'`

**Solution**: Update your Render service settings:

1. **Build Command**: `npm ci && npm run build`
2. **Start Command**: `node dist/server.js` (NOT `npm start`)
3. **Root Directory**: Leave empty (use repository root)

## Prerequisites

1. Render account
2. GitHub repository connected to Render  
3. Environment variables configured

## Deployment Steps

### 1. Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `primefrontier-backend`
   - **Environment**: `Node`
   - **Root Directory**: (leave empty)
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `node dist/server.js`
   - **Health Check Path**: `/health`

### 2. Environment Variables

Add these environment variables in Render:

```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=[your-render-postgres-url]
JWT_SECRET=[generate-a-strong-secret-64-chars]
JWT_EXPIRES_IN=7d
DEFAULT_ADMIN_EMAIL=admin@yourcompany.com
DEFAULT_ADMIN_PASSWORD=[secure-password]
FRONTEND_URL=https://your-frontend-domain.com
```

### 3. Database Setup

1. Create a PostgreSQL database on Render
2. Copy the database URL to your environment variables
3. The app will automatically create tables on first run

## 🔧 Render Configuration Files

We've included these files to help with deployment:

- `render.yaml` - Infrastructure as code
- `scripts/render-diagnostics.sh` - Troubleshooting script

## Production Checklist

- [ ] Build Command: `npm ci && npm run build`
- [ ] Start Command: `node dist/server.js`  
- [ ] Environment variables configured
- [ ] Database connected and accessible
- [ ] JWT_SECRET is strong and unique (64+ characters)
- [ ] Default admin credentials are secure
- [ ] CORS settings configured for your frontend domain
- [ ] Health check endpoint responding at `/health`

## Monitoring

- Check logs in Render dashboard
- Monitor `/health` endpoint: `https://your-app.onrender.com/health`
- Set up uptime monitoring (recommended)

## Troubleshooting

### Current Build Error Fix

If you see: `Cannot find module '/opt/render/project/src/dist/server.js'`

✅ **Fix**: Change start command to: `node dist/server.js`

### Other Common Issues

**Build Failures:**
- Check Node.js version compatibility (18+ recommended)
- Verify all dependencies in package.json
- Review build logs for TypeScript errors

**Runtime Errors:**
- Check environment variables are set
- Verify database connection string
- Review application logs in Render dashboard

**Database Issues:**
- Ensure DATABASE_URL format is correct
- Check database permissions
- Test connection with: `psql $DATABASE_URL`

### Debug Commands

Run diagnostics locally:
```bash
./scripts/render-diagnostics.sh
```

Manual build test:
```bash
npm ci
npm run build
node dist/server.js
```

## Performance Tips

1. **Enable auto-deploy** from main branch
2. **Set up proper logging** for production monitoring
3. **Configure health checks** for automatic restart
4. **Use environment-specific configs** for database pooling

## Security Checklist

- [ ] JWT_SECRET is environment-specific and secure
- [ ] Database credentials are not hardcoded
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Helmet security headers are active
- FRONTEND_URL=[Your frontend URL or Render service URL]

## Optional Environment Variables
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET  
- GOOGLE_CALLBACK_URL
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER
- SMTP_PASS
- FROM_EMAIL=noreply@primefrontier.com
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

## PostgreSQL Database
If you don't have a Render PostgreSQL database yet:
1. Go to Render Dashboard
2. Create a new PostgreSQL database
3. Copy the External Database URL
4. Use it as your DATABASE_URL environment variable

## Deployment Steps
1. Push your code to GitHub
2. Connect Render to your GitHub repository
3. Configure build and start commands
4. Add environment variables
5. Deploy!

## Post-Deployment
After successful deployment, run the database setup:
- The app will automatically create tables on first run
- Or manually run the setup via Render shell