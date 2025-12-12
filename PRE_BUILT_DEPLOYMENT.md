# Pre-Built Deployment Guide

This guide explains how to deploy the project to Render using pre-built artifacts instead of building on Render. This approach avoids memory issues (OOM errors) by building locally and uploading only the built files.

## Why Pre-Built Deployment?

- **Avoids OOM Errors**: Render's free tier has an 8GB memory limit during builds. Building locally uses your machine's resources instead.
- **Faster Deployments**: No build time on Render means faster deployments.
- **More Control**: You can test builds locally before deploying.

## Prerequisites

- Node.js 20+ installed locally
- npm 10+ installed locally
- All environment variables configured in Render dashboard

## Deployment Steps

### 1. Build Backend Locally

```bash
cd backend
npm install
npm run build
```

This creates the `backend/dist/` folder with compiled JavaScript files.

**Verify**: Check that `backend/dist/server.js` exists.

### 2. Build Frontend Locally

```bash
cd ../frontend
npm install
npm run build
```

This creates the `frontend/dist/` folder with production-ready static files.

**Verify**: Check that `frontend/dist/index.html` exists.

### 3. Upload to Render

#### Option A: Using Git (Recommended)

1. **Commit the built artifacts** (if using Git):
   ```bash
   git add backend/dist frontend/dist
   git commit -m "Add pre-built artifacts for deployment"
   git push
   ```

2. **Deploy on Render**: Render will automatically deploy when you push to your repository.

#### Option B: Manual Upload via Render Dashboard

1. **Backend**:
   - Go to your backend service in Render dashboard
   - Use "Manual Deploy" option
   - Upload the entire `backend/` folder (including `dist/`)
   - Ensure `dist/` folder is included in the upload

2. **Frontend**:
   - Go to your frontend service in Render dashboard
   - Use "Manual Deploy" option
   - Upload the entire `frontend/` folder (including `dist/`)
   - Ensure `dist/` folder is included in the upload

### 4. Verify Deployment

- **Backend**: Check that the service starts without build errors
- **Frontend**: Check that the static files are served correctly

## Important Notes

### Dockerfile Changes

Both Dockerfiles have been updated to:
- **Skip the build stage** - they expect `dist/` to already exist
- **Copy pre-built artifacts** directly
- **Install only production dependencies**

### .dockerignore Changes

- `dist/` is **NOT** ignored anymore (it was previously ignored)
- Source files (`src/`) are now ignored to reduce upload size
- Development files are ignored

### render.yaml Changes

- `buildCommand` is set to a no-op echo command
- Render will not attempt to build the project
- Only `npm start` runs on Render

## Troubleshooting

### Error: "dist folder not found"

**Cause**: The `dist/` folder wasn't included in the upload.

**Solution**:
1. Rebuild locally: `npm run build`
2. Verify `dist/` exists
3. Re-upload the entire folder including `dist/`

### Error: "Cannot find module"

**Cause**: Production dependencies might be missing.

**Solution**:
1. Ensure `package.json` has all required dependencies (not just devDependencies)
2. The Dockerfile installs production dependencies automatically

### Error: "Port already in use"

**Cause**: Port configuration issue.

**Solution**:
1. Check `render.yaml` has `PORT: 10000` for backend
2. Frontend uses nginx on port 80 (configured in Dockerfile)

### Error: "JavaScript heap out of memory" during local build

**Cause**: TypeScript compilation requires more memory than allocated.

**Solution**:
1. The build script now uses 4GB (4096MB) by default
2. If still failing, try a clean build:
   ```bash
   cd backend
   npm run build:clean
   ```
3. If your machine has limited RAM, you can temporarily increase swap space
4. Close other memory-intensive applications during build
5. On macOS, you can check available memory:
   ```bash
   sysctl hw.memsize
   ```

## Build Scripts Reference

### Backend Build
```bash
cd backend
npm install
npm run build  # Compiles TypeScript to JavaScript in dist/ (uses 4GB memory)
```

**If build fails with OOM error:**
```bash
# Try a clean build (removes cache)
npm run build:clean
```

### Frontend Build
```bash
cd frontend
npm install
npm run build  # Creates production bundle in dist/
```

## Environment Variables

Make sure all required environment variables are set in Render dashboard:

**Backend**:
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`
- `NODE_ENV=production`
- `PORT=10000`

**Frontend**:
- Usually no environment variables needed (static files)
- API endpoints should point to backend URL

## Automated Build Script

You can create a script to automate the build process:

```bash
#!/bin/bash
# build-for-deployment.sh

echo "Building backend..."
cd backend
npm install
npm run build
cd ..

echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete! Ready for deployment."
echo "Backend dist: backend/dist/"
echo "Frontend dist: frontend/dist/"
```

Make it executable:
```bash
chmod +x build-for-deployment.sh
./build-for-deployment.sh
```

## Reverting to Build-on-Render

If you need to revert to building on Render:

1. Restore the original multi-stage Dockerfiles
2. Update `render.yaml` to include build commands
3. Update `.dockerignore` to exclude `dist/` again

## Best Practices

1. **Always test builds locally** before deploying
2. **Version control**: Consider adding `dist/` to `.gitignore` if you don't want to commit built files
3. **CI/CD**: For automated deployments, use a CI service to build and then deploy to Render
4. **Clean builds**: Delete old `dist/` folders before rebuilding to avoid stale files

