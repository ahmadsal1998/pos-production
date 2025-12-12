#!/bin/bash

# Script to prepare backend folder for Render manual deployment
# This script verifies that all required files are present before uploading

set -e

echo "🚀 Preparing backend for Render deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the backend directory.${NC}"
    exit 1
fi

echo "✅ Found package.json"
echo ""

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}⚠️  dist/ folder not found. Building now...${NC}"
    npm run build
    echo ""
fi

# Verify dist folder structure
echo "📁 Verifying dist/ folder structure..."

REQUIRED_FILES=(
    "dist/index.js"
    "dist/server.js"
    "dist/config/database.js"
    "dist/controllers/auth.controller.js"
    "dist/models/User.js"
    "dist/routes/auth.routes.js"
    "dist/middleware/auth.middleware.js"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required files:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "${RED}   - $file${NC}"
    done
    echo ""
    echo -e "${YELLOW}💡 Try running: npm run build${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required files present${NC}"
echo ""

# Check package.json start script
echo "📝 Checking package.json configuration..."

if grep -q '"start": "node dist/index.js"' package.json; then
    echo -e "${GREEN}✅ Start script is correct${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Start script might not be 'node dist/index.js'${NC}"
    echo "   Current start script:"
    grep '"start"' package.json || echo "   (not found)"
fi

echo ""

# Check for node_modules (should not be uploaded)
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}ℹ️  node_modules/ found (will be installed on Render, safe to exclude)${NC}"
fi

# Check for .env file (should not be uploaded)
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file found - DO NOT upload this to Render!${NC}"
    echo "   Use Render's Environment Variables instead"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Backend folder is ready for Render deployment!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo "   1. Go to Render Dashboard > New Web Service"
echo "   2. Choose 'Manual Deploy' > 'Upload a folder'"
echo "   3. Upload the entire backend/ folder"
echo "   4. Set Start Command: node dist/index.js"
echo "   5. Set Build Command: npm install --production"
echo "   6. Add all environment variables (see RENDER_MANUAL_DEPLOYMENT.md)"
echo "   7. Deploy and monitor logs"
echo ""
echo "📖 For detailed instructions, see: RENDER_MANUAL_DEPLOYMENT.md"
echo ""

