# Production Dockerfile for Render
# Builds TypeScript source and runs the application

FROM node:20-alpine

# Clear any existing cache layers
RUN rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    rm -rf /var/tmp/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN NODE_OPTIONS="--max-old-space-size=1536" npm ci --prefer-offline --no-audit && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Copy source files
COPY . .

# Build TypeScript to JavaScript
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production && \
    npm cache clean --force

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

