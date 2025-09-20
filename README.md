# Primefrontier Backend

A Node.js backend written in TypeScript using Fastify, PostgreSQL with raw SQL, Passport.js, and comprehensive authentication/authorization features.

## Features
- Fastify server with Express compatibility
- PostgreSQL database with raw SQL queries
- Role-based access control and permissions
- Multi-factor authentication (2FA: TOTP, SMS, Email)
- Password reset and user invitation flows
- Default super admin seeding
- Secure routes with JWT and Passport.js
- CORS, helmet, rate limiting, bcrypt

## Project Structure
```
src/
  server.ts           # Main Fastify server
  config/             # Configuration files
  entities/           # TypeScript interfaces for data models
  routes/             # API routes and controllers
  middleware/         # Passport and security middleware
  services/           # Auth, 2FA, mailer, permissions services
scripts/
  create-auth-schema.ts # Database schema creation script
```

## Setup
1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in your secrets
   ```bash
   cp .env.example .env
   ```
4. **Create database schema and seed data**
   ```bash
   npm run create-schema
   ```
5. **Start the development server**
   ```bash
   npm run dev
   ```

## Authentication & Authorization
- Email/password login, Google OAuth2, JWT sessions
- 2FA via TOTP (Google Authenticator), SMS (Twilio), Email (nodemailer)
- Role-based permissions checked on every protected route

## Security
- Passwords hashed with bcrypt
- All secrets/configs via environment variables
- CORS, helmet, rate limiting enabled

## Scripts
- `npm run dev` — Start server in development mode
- `npm run build` — Compile TypeScript
- `npm run create-schema` — Create database schema and seed admin user

## Comments
- Twilio and nodemailer integration points are commented in the code for easy setup.

## License
MIT
