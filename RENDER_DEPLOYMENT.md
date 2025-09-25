# Render Deployment Configuration

## Build Command
```
npm install && npm run build
```

## Start Command  
```
npm start
```

## Environment Variables (Add these in Render Dashboard)
- NODE_ENV=production
- PORT=3000 (Render will override this)
- DATABASE_URL=[Your Render PostgreSQL URL]
- JWT_SECRET=[Generate a secure secret]
- DEFAULT_ADMIN_EMAIL=imeekwere15@gmail.com
- DEFAULT_ADMIN_PASSWORD=[Set a secure password]
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