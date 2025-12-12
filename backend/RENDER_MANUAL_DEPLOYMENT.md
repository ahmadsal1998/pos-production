# Render Manual Deployment Guide - Pre-Built Backend

This guide walks you through deploying the backend to Render using **Manual Deploy > Upload a folder** with the pre-built `dist/` folder.

## Prerequisites

- ✅ Backend `dist/` folder is built locally
- ✅ Node.js 20+ and npm 10+ installed locally
- ✅ MongoDB Atlas database set up
- ✅ Render account created

## Step 1: Prepare the Backend Folder

### 1.1 Build the Backend Locally

```bash
cd backend
npm install
npm run build
```

**Verify the build:**
- Check that `backend/dist/index.js` exists
- Check that `backend/dist/server.js` exists
- Check that all subdirectories in `dist/` are populated (controllers, models, routes, etc.)

### 1.2 Verify Required Files

Ensure your `backend/` folder contains:

```
backend/
├── dist/                    # ✅ Compiled JavaScript files (REQUIRED)
│   ├── index.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── utils/
├── package.json             # ✅ Required
├── package-lock.json        # ✅ Required (for dependency resolution)
└── render.yaml              # Optional (for reference)
```

**Important:** Do NOT include:
- `node_modules/` (will be installed on Render)
- `src/` (source TypeScript files - not needed for deployment)
- `.env` (use Render's environment variables instead)

## Step 2: Create Web Service on Render

### 2.1 Navigate to Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** button
3. Select **"Web Service"**

### 2.2 Choose Manual Deploy

1. In the deployment method, select **"Manual Deploy"**
2. Choose **"Upload a folder"** option
3. Select your entire `backend/` folder (including `dist/`)

**Note:** Make sure the folder structure is preserved when uploading.

## Step 3: Configure Service Settings

### 3.1 Basic Settings

- **Name:** `pos-backend` (or your preferred name)
- **Environment:** `Node`
- **Region:** Choose closest to your users
- **Branch:** Not applicable for manual deploy
- **Root Directory:** Leave empty (or set to `/` if required)

### 3.2 Build & Start Commands

**Build Command:**
```
npm install --production
```

**Start Command:**
```
node dist/index.js
```

**Important:** 
- Do NOT use `npm run build` - we're using pre-built files
- The build command only installs production dependencies
- The start command runs the compiled JavaScript directly

### 3.3 Plan Selection

- **Free Plan:** Suitable for development/testing
- **Starter Plan:** Recommended for production (better performance)

## Step 4: Configure Environment Variables

Navigate to **Environment** > **Environment Variables** and add:

### Required Variables

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `${PORT}` | Use Render's PORT variable (auto-provided) |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | `[generate random hex]` | JWT signing secret (64+ characters) |
| `JWT_REFRESH_SECRET` | `[generate random hex]` | JWT refresh secret (64+ characters) |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | Frontend URL for CORS |

### Optional Variables

| Key | Value | Description |
|-----|-------|-------------|
| `JWT_EXPIRE` | `7d` | Token expiration (default: 7d) |
| `JWT_REFRESH_EXPIRE` | `30d` | Refresh token expiration (default: 30d) |
| `RESEND_API_KEY` | `re_...` | Resend API key for emails |
| `RESEND_FROM_EMAIL` | `no-reply@yourdomain.com` | Sender email |
| `RESEND_FROM_NAME` | `POS System` | Sender name |
| `NODE_OPTIONS` | `--max-old-space-size=1536` | Memory limit (for free tier) |
| `ADMIN_USERNAME` | `admin` | Admin username (optional) |
| `ADMIN_PASSWORD` | `[secure password]` | Admin password (optional) |

### Generate Secure Secrets

For `JWT_SECRET` and `JWT_REFRESH_SECRET`, generate secure random strings:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64
```

Run this command **twice** to generate two different values.

### MongoDB Atlas Connection String

Format: `mongodb+srv://username:password@cluster.mongodb.net/admin_db?retryWrites=true&w=majority`

**Important:** The database name should be `admin_db` (as per the multi-database architecture).

Example:
```
mongodb+srv://admin:MyPassword123@cluster0.abc123.mongodb.net/admin_db?retryWrites=true&w=majority
```

## Step 5: Deploy the Service

1. Click **"Create Web Service"** or **"Save Changes"**
2. Render will:
   - Upload your folder
   - Install production dependencies (`npm install --production`)
   - Start the service using `node dist/index.js`

## Step 6: Monitor Deployment

### 6.1 Check Logs

1. Navigate to **Logs** tab in Render dashboard
2. Look for:
   - ✅ `npm install` completing successfully
   - ✅ `Server running on port 10000` (or your PORT)
   - ✅ `MongoDB Connected successfully`
   - ✅ `📝 Environment: production`

### 6.2 Common Success Messages

```
✓ npm install completed
✓ Starting service with: node dist/index.js
✓ Server running on port 10000
✓ MongoDB Connected successfully
✓ 📝 Environment: production
```

### 6.3 Common Errors & Solutions

#### Error: "Cannot find module './dist/index.js'"

**Cause:** The `dist/` folder wasn't included in the upload.

**Solution:**
1. Rebuild locally: `cd backend && npm run build`
2. Verify `dist/index.js` exists
3. Re-upload the entire `backend/` folder including `dist/`

#### Error: "MongoDB connection failed"

**Cause:** Incorrect `MONGODB_URI` or network issues.

**Solution:**
1. Verify `MONGODB_URI` in Environment Variables
2. Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Render)
3. Ensure database name is `admin_db` in connection string

#### Error: "Port already in use"

**Cause:** Port configuration issue.

**Solution:**
1. Use `${PORT}` in environment variables (Render provides this)
2. Don't hardcode port numbers

#### Error: "JavaScript heap out of memory"

**Cause:** Node.js memory limit exceeded.

**Solution:**
1. Add `NODE_OPTIONS=--max-old-space-size=1536` to environment variables
2. Consider upgrading to Starter plan for more memory

#### Error: "Cannot find module 'express'"

**Cause:** Dependencies not installed.

**Solution:**
1. Verify `package.json` includes all required dependencies
2. Check that `npm install --production` ran successfully in logs
3. Ensure `package-lock.json` is included in upload

## Step 7: Test the API

### 7.1 Health Check

Once deployed, test the API:

```bash
# Get your service URL from Render dashboard
curl https://your-service.onrender.com/api/health

# Or test in browser
https://your-service.onrender.com/api/health
```

### 7.2 Test Authentication Endpoint

```bash
curl -X POST https://your-service.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### 7.3 Verify CORS

Test from your frontend to ensure CORS is configured correctly.

## Step 8: Update Frontend Configuration

Update your frontend API base URL to point to your Render backend:

```typescript
// In your frontend API configuration
const API_BASE_URL = 'https://your-backend-service.onrender.com';
```

## Troubleshooting Checklist

- [ ] `dist/` folder exists and contains compiled files
- [ ] `package.json` has correct `"start"` script
- [ ] All environment variables are set in Render dashboard
- [ ] MongoDB Atlas IP whitelist includes Render IPs
- [ ] Start command is `node dist/index.js`
- [ ] Build command is `npm install --production` (not `npm run build`)
- [ ] Service logs show successful MongoDB connection
- [ ] Service logs show server running on correct port

## Updating the Deployment

When you need to update the backend:

1. **Build locally:**
   ```bash
   cd backend
   npm run build
   ```

2. **Re-upload folder:**
   - Go to Render dashboard
   - Use "Manual Deploy" > "Upload a folder" again
   - Upload the updated `backend/` folder

3. **Monitor logs** to ensure successful deployment

## Best Practices

1. **Always test builds locally** before uploading
2. **Keep environment variables secure** - never commit them
3. **Use Render's environment variable sync** for sensitive values
4. **Monitor logs regularly** for errors
5. **Set up health checks** for automatic restarts
6. **Use Starter plan** for production workloads
7. **Enable auto-deploy** from Git (if you prefer) after initial manual setup

## Next Steps

After successful backend deployment:

1. Deploy frontend to Vercel or Render
2. Update frontend API base URL
3. Test end-to-end functionality
4. Set up monitoring and alerts
5. Configure custom domain (optional)

## Support

If you encounter issues:

1. Check Render logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB Atlas is accessible from Render
4. Review the troubleshooting section above
5. Check Render status page for service issues

