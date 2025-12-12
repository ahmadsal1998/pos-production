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

# Install dependencies with clean cache and memory optimization
# Using --no-optional to skip optional dependencies and reduce memory usage
RUN NODE_OPTIONS="--max-old-space-size=2048" npm ci --prefer-offline --no-audit --no-optional && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Copy source code
COPY . .

# Build TypeScript to JavaScript with optimized memory
# Set NODE_OPTIONS to increase heap size for TypeScript compilation
# Using 2048MB (2GB) for free plan compatibility - Render free tier has limited memory
ENV NODE_OPTIONS="--max-old-space-size=2048"
# Build with incremental compilation to reduce memory usage
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
RUN NODE_OPTIONS="--max-old-space-size=2048" npm ci --only=production --prefer-offline --no-audit --no-optional && \
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

