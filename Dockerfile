# Use Node.js 18 LTS as base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install only production dependencies for the final stage
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from base stage
COPY --from=base --chown=nextjs:nodejs /app/dist ./dist
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nextjs:nodejs /app/package*.json ./
COPY --from=base --chown=nextjs:nodejs /app/config ./config

# Copy migration and seeder files for database setup
COPY --from=base --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=base --chown=nextjs:nodejs /app/seeders ./seeders
COPY --from=base --chown=nextjs:nodejs /app/.sequelizerc ./.sequelizerc

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    http.get('http://localhost:3000/health', (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1) \
    }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "run", "render:start"]