# Primefrontier Backend Project

This is a Node.js TypeScript project using Fastify with Express compatibility, PostgreSQL with raw SQL queries, and comprehensive authentication/authorization features.

## Technology Stack
- Framework: Fastify with Express compatibility (@fastify/express)
- Database: PostgreSQL with pg client (raw SQL queries)
- Authentication: Passport.js with JWT, Google OAuth2
- Security: bcrypt, CORS, helmet, rate limiting
- 2FA: TOTP (speakeasy), SMS (Twilio), Email (nodemailer)

## Project Structure
- `src/server.ts` - Main Fastify server
- `src/config/` - Configuration files
- `src/entities/` - TypeScript interfaces for data models
- `src/routes/` - API routes and controllers
- `src/middleware/` - Security and authentication middleware
- `src/services/` - Business logic services

## Key Features
- Role-based access control with permissions
- Multi-factor authentication (2FA)
- Password reset flow
- User invitation system
- Default super admin seeding

## Development Guidelines
- Use TypeScript with async/await
- Follow REST API conventions
- Implement proper error handling
- Use environment variables for configuration
- Include comprehensive logging