# Render Deployment - Quick Start Guide

This is a condensed guide for deploying the backend to Render using manual folder upload.

## 🚀 Quick Steps

### 1. Prepare Locally (5 minutes)

```bash
cd backend
npm install
npm run build
./prepare-for-render-deploy.sh  # Verify everything is ready
```

### 2. Create Service on Render (10 minutes)

1. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**
2. Choose **Manual Deploy** → **Upload a folder**
3. Upload your entire `backend/` folder
4. Configure:
   - **Build Command:** `npm install --production`
   - **Start Command:** `node dist/index.js`
   - **Plan:** Free (or Starter for production)

### 3. Set Environment Variables (5 minutes)

In Render Dashboard → **Environment** → **Environment Variables**, add:

**Required:**
```
NODE_ENV=production
PORT=${PORT}
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/admin_db?retryWrites=true&w=majority
JWT_SECRET=[generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
JWT_REFRESH_SECRET=[generate again with same command]
CLIENT_URL=https://your-frontend-url.com
```

**Recommended:**
```
NODE_OPTIONS=--max-old-space-size=1536
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
```

### 4. Deploy & Verify (5 minutes)

1. Click **Create Web Service** or **Save Changes**
2. Monitor **Logs** tab for:
   - ✅ `npm install` completed
   - ✅ `Server running on port 10000`
   - ✅ `MongoDB Connected successfully`
3. Test API: `curl https://your-service.onrender.com/api/health`

## 📋 Complete Documentation

- **Detailed Guide:** `RENDER_MANUAL_DEPLOYMENT.md`
- **Checklist:** `RENDER_DEPLOYMENT_CHECKLIST.md`
- **Preparation Script:** `./prepare-for-render-deploy.sh`

## ⚠️ Important Notes

1. **DO NOT upload:**
   - `.env` file (use Render's environment variables)
   - `node_modules/` (will be installed on Render)
   - `src/` folder (not needed, using pre-built `dist/`)

2. **DO upload:**
   - `dist/` folder (compiled JavaScript)
   - `package.json`
   - `package-lock.json`

3. **MongoDB Atlas:**
   - Whitelist IP: `0.0.0.0/0` (or Render's IP ranges)
   - Database name must be `admin_db` in connection string

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "dist folder not found" | Run `npm run build` locally first |
| "MongoDB connection failed" | Check MONGODB_URI and IP whitelist |
| "Out of memory" | Add `NODE_OPTIONS=--max-old-space-size=1536` |

## ✅ Success Indicators

When deployment is successful, you'll see in logs:
```
✓ npm install completed
✓ Server running on port 10000
✓ MongoDB Connected successfully
✓ 📝 Environment: production
```

Your service will be available at: `https://your-service-name.onrender.com`

---

**Need more details?** See `RENDER_MANUAL_DEPLOYMENT.md` for comprehensive instructions.

