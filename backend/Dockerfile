# Multi-stage build for optimized production image
# Cache bust: v2 - Reduced memory to 1536MB for free tier compatibility

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Clear any existing cache layers
RUN rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    rm -rf /var/tmp/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with clean cache and memory optimization
# Using --no-optional to skip optional dependencies and reduce memory usage
# Using 1536MB to be more conservative for free tier
RUN NODE_OPTIONS="--max-old-space-size=1536" npm ci --prefer-offline --no-audit --no-optional && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Copy source code
COPY . .

# Build TypeScript to JavaScript with optimized memory
# Set NODE_OPTIONS to increase heap size for TypeScript compilation
# Using 1536MB (1.5GB) for free plan compatibility - Render free tier has very limited memory
# Reduced from 2GB to avoid OOM errors on free tier
ENV NODE_OPTIONS="--max-old-space-size=1536"
# Build with incremental compilation to reduce memory usage
# Clear any build cache before building
RUN rm -rf dist .tsbuildinfo && npm run build

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
RUN NODE_OPTIONS="--max-old-space-size=1536" npm ci --only=production --prefer-offline --no-audit --no-optional && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

