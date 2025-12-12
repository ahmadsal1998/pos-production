# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Clear any existing cache layers
RUN rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    rm -rf /var/tmp/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with clean cache
RUN npm ci --prefer-offline --no-audit && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript to JavaScript with optimized memory
# Set NODE_OPTIONS to increase heap size for TypeScript compilation
# Using 6144MB (6GB) instead of 8GB to be more conservative and work better on Render
ENV NODE_OPTIONS="--max-old-space-size=6144"
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

# Clear cache in production stage too
RUN rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    rm -rf /var/tmp/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies with clean cache
RUN npm ci --only=production --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

