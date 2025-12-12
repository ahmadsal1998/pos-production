#!/bin/bash

# Build script for pre-built deployment to Render
# This script builds both backend and frontend locally before deployment

set -e  # Exit on error

echo "========================================="
echo "Building for Pre-Built Deployment"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build Backend
echo -e "${YELLOW}Building backend...${NC}"
cd backend

if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in backend directory"
    exit 1
fi

echo "Installing backend dependencies..."
npm install

echo "Building backend (TypeScript -> JavaScript)..."
# Try incremental build first, fall back to clean build if it fails
if ! npm run build; then
    echo "Incremental build failed, trying clean build..."
    npm run build:clean
fi

if [ ! -d "dist" ] || [ ! -f "dist/server.js" ]; then
    echo "Error: Backend build failed - dist/server.js not found"
    exit 1
fi

echo -e "${GREEN}✓ Backend built successfully${NC}"
echo ""

# Build Frontend
cd ../frontend

if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in frontend directory"
    exit 1
fi

echo -e "${YELLOW}Building frontend...${NC}"
echo "Installing frontend dependencies..."
npm install

echo "Building frontend (Vite production build)..."
npm run build

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "Error: Frontend build failed - dist/index.html not found"
    exit 1
fi

echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Return to root
cd ..

echo "========================================="
echo -e "${GREEN}Build Complete!${NC}"
echo "========================================="
echo ""
echo "Built artifacts:"
echo "  - Backend:  backend/dist/"
echo "  - Frontend: frontend/dist/"
echo ""
echo "Next steps:"
echo "  1. Upload both backend/ and frontend/ folders to Render"
echo "  2. Ensure dist/ folders are included in the upload"
echo "  3. Render will use the pre-built artifacts (no build needed)"
echo ""
echo "See PRE_BUILT_DEPLOYMENT.md for detailed instructions."

