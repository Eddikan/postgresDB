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
  create-db-schema.ts # Database schema creation script
```

## Setup

### Quick Start (New Developers)
```bash
# 1. Clone the repository
git clone <repository-url>
cd primefrontier

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# 4. Set up database (runs migrations + seeds data)
npm run db:setup

# 5. Start development server
npm run dev
```

### Manual Setup
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
4. **Set up database**
   ```bash
   npm run db:setup  # Runs migrations + seeds data
   ```
   Or individually:
   ```bash
   npm run migration:run  # Run database migrations
   npm run db:seed:all    # Seed initial data
   ```
5. **Start the development server**
   ```bash
   npm run dev
   ```

## Docker Setup

### Quick Start with Docker
```bash
# 1. Clone and configure
git clone <repository-url>
cd primefrontier
cp .env.docker .env
# Edit .env with your configuration

# 2. Run with Docker (Production)
npm run docker:prod

# 3. Run with Docker (Development with hot reload)
npm run docker:dev
```

### Docker Commands
```bash
# Development with hot reload
npm run docker:dev          # Start dev environment
npm run docker:stop-dev     # Stop dev environment

# Production
npm run docker:prod         # Start production environment
npm run docker:stop         # Stop production environment

# Maintenance
npm run docker:clean        # Clean up containers and volumes
npm run docker:build        # Build image only
```

### What Docker Provides
- ✅ **PostgreSQL database** automatically configured
- ✅ **Automatic database setup** (migrations + seeding)
- ✅ **Hot reload in development** mode
- ✅ **Production-ready** multi-stage build
- ✅ **Health checks** for both services
- ✅ **Volume persistence** for database data
- ✅ **Network isolation** between services

## Authentication & Authorization
- Email/password login, Google OAuth2, JWT sessions
- 2FA via TOTP (Google Authenticator), SMS (Twilio), Email (nodemailer)
- Role-based permissions checked on every protected route

## Security
- Passwords hashed with bcrypt
- All secrets/configs via environment variables
- CORS, helmet, rate limiting enabled

## Scripts

### Development
- `npm run dev` — Start server in development mode with auto-reload
- `npm run build` — Compile TypeScript to dist/
- `npm run start` — Start compiled server (production)

### Database
- `npm run db:setup` — Complete database setup (migrations + seeding)
- `npm run migration:run` — Run database migrations only
- `npm run db:seed:all` — Seed initial data only
- `npm run db:migrate:status` — Check migration status
- `npm run migration:create <name>` — Create new migration file

### Docker
- `npm run docker:dev` — Start development environment with hot reload
- `npm run docker:prod` — Start production environment  
- `npm run docker:stop` — Stop production environment
- `npm run docker:stop-dev` — Stop development environment
- `npm run docker:clean` — Clean up containers and volumes
- `npm run docker:build` — Build Docker image only

### Legacy
- `npm run seed` — Legacy: Create schema + seed data (uses TypeScript scripts)

## Comments
- Twilio and nodemailer integration points are commented in the code for easy setup.

## License
MIT
