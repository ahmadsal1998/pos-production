#!/bin/bash

# Quick fix script for Render Git-based deployment
# This script prepares the repository for Node.js deployment on Render

set -e

echo "🔧 Fixing Render deployment configuration..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the project root
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Step 1: Build backend
echo "📦 Building backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
npm run build
cd ..

# Step 2: Update .gitignore to allow backend/dist/
echo ""
echo "📝 Updating .gitignore..."
if grep -q "^backend/dist/$" .gitignore; then
    echo -e "${YELLOW}⚠️  backend/dist/ is currently ignored${NC}"
    echo "Removing it from .gitignore to allow Git deployment..."
    # Create backup
    cp .gitignore .gitignore.bak
    # Remove the line
    sed -i '' '/^backend\/dist\/$/d' .gitignore
    echo -e "${GREEN}✅ Updated .gitignore${NC}"
else
    echo -e "${GREEN}✅ backend/dist/ is not ignored${NC}"
fi

# Step 3: Verify dist/ exists
if [ ! -d "backend/dist" ]; then
    echo -e "${RED}❌ Error: backend/dist/ folder not found after build${NC}"
    exit 1
fi

# Step 4: Add to Git
echo ""
echo "📤 Adding files to Git..."
git add backend/dist/ .gitignore

# Check if there are changes
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  No changes to commit (dist/ might already be tracked)${NC}"
else
    echo "Committing changes..."
    git commit -m "Add pre-built dist/ for Render deployment" || echo -e "${YELLOW}⚠️  Commit failed or nothing to commit${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Repository prepared for Render deployment!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Push to GitHub:"
echo "   ${YELLOW}git push${NC}"
echo ""
echo "2. In Render Dashboard:"
echo "   - Go to your service → Settings"
echo "   - Under Build & Deploy:"
echo "     • Environment: ${GREEN}Node${NC} (NOT Docker)"
echo "     • Root Directory: ${GREEN}backend${NC}"
echo "     • Build Command: ${GREEN}npm install --production${NC}"
echo "     • Start Command: ${GREEN}node dist/index.js${NC}"
echo ""
echo "3. Save and redeploy"
echo ""
echo "📖 For detailed instructions, see: backend/RENDER_GIT_DEPLOYMENT_FIX.md"
echo ""

