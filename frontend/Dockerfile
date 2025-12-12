# Production image using pre-built artifacts
# This Dockerfile expects the dist/ folder to be built locally before deployment
# Build locally: npm install && npm run build

FROM nginx:alpine

# Copy pre-built dist/ folder (must be built locally before deployment)
COPY dist /usr/share/nginx/html

# Copy nginx configuration (optional - create if needed)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

