# Production Dockerfile for POS Backend
# This Dockerfile builds the backend from the root directory

FROM node:20-alpine

# Clear any existing cache layers
RUN rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    rm -rf /var/tmp/*

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install only production dependencies with clean cache
RUN NODE_OPTIONS="--max-old-space-size=1536" npm ci --only=production --prefer-offline --no-audit --no-optional && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Copy pre-built dist/ folder (must be built and committed to Git)
# If dist/ doesn't exist, the build will fail - ensure backend/dist/ is in Git
COPY backend/dist ./dist

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]

