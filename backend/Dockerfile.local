# Production image using pre-built artifacts
# This Dockerfile expects the dist/ folder to be pre-built
# dist/ is built automatically by GitHub Actions on every push to main
# For local Docker builds: npm install && npm run build

FROM node:20-alpine

# Clear any existing cache layers
RUN rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    rm -rf /var/tmp/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies with clean cache
RUN NODE_OPTIONS="--max-old-space-size=1536" npm ci --only=production --prefer-offline --no-audit --no-optional && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Copy pre-built dist/ folder (must be built locally before deployment)
COPY dist ./dist

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

