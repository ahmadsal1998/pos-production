#!/bin/sh
# Health check script for Render deployment

set -e

# Check if the server is responding
if curl -f http://localhost:${PORT:-10000}/health > /dev/null 2>&1; then
  echo "✅ Health check passed"
  exit 0
else
  echo "❌ Health check failed"
  exit 1
fi

