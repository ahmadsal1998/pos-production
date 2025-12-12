# Render Out of Memory (OOM) Resolution Guide

This document provides comprehensive instructions for resolving the "Ran out of memory (used over 8GB)" error during deployment on Render.

## Overview

The OOM error occurs when the build process exceeds the available memory on Render's infrastructure. This guide implements multiple optimization strategies to resolve this issue.

## Implementation Summary

### 1. Codebase Optimizations ✅

#### Backend Optimizations
- **Memory Limit Adjustment**: Reduced Node.js heap size to 2GB (2048MB) for free plan compatibility
- **Build Script Updates**: Updated `package.json` to include `NODE_OPTIONS` in build commands with incremental compilation
- **Dockerfile Optimization**: Updated multi-stage Dockerfile with optimized memory settings and --no-optional flag
- **TypeScript Optimization**: Added `isolatedModules` and optimized `tsconfig.json` for better memory efficiency

#### Frontend Optimizations
- **Vite Build Configuration**: 
  - Added manual chunk splitting to reduce memory pressure
  - Switched to `esbuild` minifier (faster and more memory-efficient)
  - Configured chunk size warnings
- **Build Script Updates**: Added `NODE_OPTIONS` to build and type-check commands

### 2. Render Configuration Changes Required

#### Step 1: Add Environment Variable in Render Dashboard

1. Navigate to your Render Dashboard: https://dashboard.render.com
2. Select your **pos-backend** service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add the following:
   - **Key**: `NODE_OPTIONS`
   - **Value**: `--max-old-space-size=2048`
6. Click **Save Changes**

**Important**: This environment variable must be set for the build process to use the increased memory allocation.

#### Step 2: Verify Service Plan

1. In your service settings, check the current **Plan** (should be visible in the service overview)
2. The **Free** plan has limited memory (typically 512MB-1GB)
3. If OOM errors persist after optimization, consider upgrading:
   - **Starter Plan**: $7/month - 512MB RAM
   - **Standard Plan**: $25/month - 2GB RAM
   - **Pro Plan**: $85/month - 4GB RAM
   - **Pro Plus Plan**: $170/month - 8GB RAM

#### Step 3: Enable Performance Builds (Team Accounts Only)

If you have a Team plan:
1. Go to **Team Settings**
2. Enable **Performance build pipeline**
3. This provides significantly more resources for the build step

### 3. Updated Configuration Files

#### `render.yaml`
- Updated `buildCommand` to include `NODE_OPTIONS` for both `npm ci` and `npm run build`
- Added `NODE_OPTIONS` as an environment variable in the configuration

#### `backend/package.json`
- Updated build script: `"build": "NODE_OPTIONS='--max-old-space-size=2048' tsc --incremental"`
- Updated dev script: `"dev:ts": "NODE_OPTIONS='--max-old-space-size=2048' ts-node --transpile-only src/server.ts"`

#### `frontend/package.json`
- Updated build script: `"build": "NODE_OPTIONS='--max-old-space-size=2048' vite build"`
- Updated type-check script: `"type-check": "NODE_OPTIONS='--max-old-space-size=2048' tsc --noEmit"`

#### `backend/tsconfig.json`
- Added `isolatedModules: true` for better memory efficiency
- Added `tsBuildInfoFile` for incremental build cache

#### `frontend/vite.config.ts`
- Added manual chunk splitting for vendor libraries
- Configured `esbuild` as minifier
- Optimized build output settings

### 4. Alternative Deployment Strategy: Docker

If optimizations and plan upgrades fail, you can use Docker-based deployment:

#### Option A: Build Locally and Push to Registry

1. **Build Docker image locally**:
   ```bash
   cd backend
   docker build -t your-registry/pos-backend:latest .
   
   cd ../frontend
   docker build -t your-registry/pos-frontend:latest .
   ```

2. **Push to Docker Hub or Container Registry**:
   ```bash
   docker login
   docker push your-registry/pos-backend:latest
   docker push your-registry/pos-frontend:latest
   ```

3. **Configure Render to use pre-built image**:
   - In Render Dashboard, go to service settings
   - Change deployment method from "Git" to "Docker"
   - Enter your image URL: `your-registry/pos-backend:latest`
   - Render will pull the pre-built image instead of building from source

#### Option B: Use Render's Docker Build

1. Ensure `Dockerfile` exists in your repository root or service directory
2. Render will automatically detect and use Docker for builds
3. The multi-stage Dockerfile will build efficiently with optimized memory settings

### 5. Verification Steps

After implementing changes:

1. **Trigger a new deployment** in Render Dashboard
2. **Monitor build logs** for:
   - Memory usage messages
   - Successful build completion
   - Any remaining OOM errors

3. **Check build output**:
   - Backend: Verify `dist/` directory is created
   - Frontend: Verify `dist/` directory with assets

### 6. Troubleshooting

#### Error: "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory"

This error indicates the build process is still exceeding memory limits. Here's how to resolve it:

1. **Verify Environment Variable is Set**:
   - Check Render Dashboard → Environment tab
   - Ensure `NODE_OPTIONS=--max-old-space-size=2048` is set
   - If missing, add it and redeploy

2. **Current Memory Settings (Updated for Free Plan)**:
   - All configurations now use **2GB (2048MB)** instead of 6GB
   - This is more compatible with Render's free tier limitations
   - Updated in: `render.yaml`, `package.json`, `Dockerfile`

3. **If Still Failing, Try Even Lower**:
   - Reduce to `--max-old-space-size=1536` (1.5GB)
   - Update in all locations: `render.yaml`, `package.json` files, `Dockerfile`
   - Update the environment variable in Render Dashboard

4. **Check Build Logs for Specific Step**:
   - Identify which step fails: `npm ci`, `npm run build`, or TypeScript compilation
   - If `npm ci` fails: The issue is dependency installation, not compilation
   - If `npm run build` fails: The issue is TypeScript compilation

5. **Optimize Dependencies**:
   - Review `package.json` for unnecessary dependencies
   - Remove unused packages
   - Consider using lighter alternatives
   - The Dockerfile now uses `--no-optional` to skip optional dependencies

6. **TypeScript Incremental Builds**:
   - The build script now uses `--incremental` flag
   - This reduces memory usage by reusing previous compilation results
   - Ensure `tsconfig.json` has `incremental: true` and `isolatedModules: true`

7. **Split Build Process**:
   - Build backend and frontend separately
   - Deploy as separate services on Render

8. **Upgrade Service Plan**:
   - Free plan has severe memory limitations (typically 512MB-1GB)
   - Consider upgrading to at least **Starter Plan** ($7/month) or **Standard Plan** ($25/month)
   - Standard Plan provides 2GB RAM which should be sufficient

### 7. Best Practices for Future

1. **Monitor Memory Usage**:
   - Keep an eye on build logs
   - Set up alerts for build failures

2. **Regular Dependency Updates**:
   - Keep dependencies up to date
   - Remove unused packages regularly

3. **Build Optimization**:
   - Use code splitting
   - Lazy load components
   - Minimize bundle sizes

4. **CI/CD Considerations**:
   - Consider using GitHub Actions or similar for builds
   - Push pre-built artifacts to Render

## Files Modified

- ✅ `backend/render.yaml` - Added NODE_OPTIONS to build command and env vars
- ✅ `backend/package.json` - Updated build scripts with memory limits
- ✅ `backend/Dockerfile` - Optimized memory settings
- ✅ `frontend/package.json` - Added memory limits to build scripts
- ✅ `frontend/vite.config.ts` - Optimized build configuration
- ✅ `frontend/Dockerfile` - Created multi-stage Dockerfile for frontend

## Next Steps

1. **Immediate Action Required**: Add `NODE_OPTIONS` environment variable in Render Dashboard
2. **Deploy**: Trigger a new deployment to test the changes
3. **Monitor**: Watch build logs for successful completion
4. **Upgrade if Needed**: If errors persist, consider upgrading Render service plan

## Additional Resources

- [Render Environment Variables Documentation](https://render.com/docs/environment-variables)
- [Render Pricing Plans](https://render.com/pricing)
- [Node.js Memory Management](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)

---

**Last Updated**: 2024
**Status**: ✅ Implemented - Ready for deployment

