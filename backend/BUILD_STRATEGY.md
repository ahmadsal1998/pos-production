# Backend Build Strategy

## Problem
Local TypeScript compilation runs out of memory (OOM errors) due to limited system RAM.

## Solution
**Use GitHub Actions for production builds** - builds happen automatically in the cloud with 4GB memory allocation.

## Local Development

### Option 1: Use Development Mode (Recommended)
For local development, you don't need to build. Use TypeScript directly:

```bash
npm run dev          # Uses nodemon with ts-node (no build needed)
# OR
npm run dev:ts       # Direct ts-node execution
```

These commands run TypeScript directly without compilation, so no memory issues.

### Option 2: Download Pre-built Artifacts from GitHub Actions
If you need the `dist/` folder locally (e.g., for testing production builds):

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Find the latest successful workflow run
4. Download the `backend-dist` artifact
5. Extract it to `backend/dist/`

### Option 3: Use GitHub Actions Artifact API (Advanced)
You can create a script to automatically download the latest build:

```bash
# Install GitHub CLI if not already installed
brew install gh

# Download latest artifact
gh run download -n backend-dist
```

## Production Deployment

**No action needed!** GitHub Actions automatically:
1. Builds on every push to `main` (when backend files change)
2. Commits the `dist/` folder to the repository
3. Render deploys using the pre-built `dist/index.js`

## Build Scripts Reference

- `npm run build` - Full TypeScript compilation (requires 4GB+ RAM, use GitHub Actions instead)
- `npm run build:clean` - Clean build (requires 4GB+ RAM, use GitHub Actions instead)
- `npm run build:low-memory` - Lower memory build (may still fail on limited RAM)
- `npm run dev` - Development mode with hot reload (no build needed)
- `npm run dev:ts` - Direct TypeScript execution (no build needed)
- `npm start` - Run production build from `dist/index.js` (requires pre-built dist/)

## Troubleshooting

### "dist/index.js not found" error
This means the `dist/` folder doesn't exist. Solutions:
1. **For development**: Use `npm run dev` instead of `npm start`
2. **For production testing**: Download artifact from GitHub Actions (see Option 2 above)
3. **Wait for GitHub Actions**: Push your changes and let GitHub Actions build it

### Need to test production build locally
1. Wait for GitHub Actions to build (or trigger manually)
2. Download the artifact
3. Extract to `backend/dist/`
4. Run `npm start`

## Summary

✅ **Local Development**: Use `npm run dev` - no build needed  
✅ **Production Builds**: Handled automatically by GitHub Actions  
✅ **Render Deployment**: Uses pre-built artifacts from GitHub Actions  
❌ **Local Production Builds**: Not recommended due to memory constraints

