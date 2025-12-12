# Render Deployment Checklist - Quick Reference

Use this checklist when deploying the backend to Render via manual folder upload.

## Pre-Deployment Checklist

- [ ] Backend is built locally: `cd backend && npm run build`
- [ ] `dist/` folder exists and contains compiled files
- [ ] Verified `dist/index.js` and `dist/server.js` exist
- [ ] MongoDB Atlas database is set up and accessible
- [ ] MongoDB connection string is ready
- [ ] JWT secrets are generated (2 different values)

## Render Dashboard Setup

### Service Configuration

- [ ] Created new Web Service in Render Dashboard
- [ ] Selected "Manual Deploy" > "Upload a folder"
- [ ] Uploaded entire `backend/` folder (including `dist/`)
- [ ] Set **Build Command:** `npm install --production`
- [ ] Set **Start Command:** `node dist/index.js`
- [ ] Selected appropriate plan (Free or Starter)

### Environment Variables

Add all of these in Render Dashboard > Environment > Environment Variables:

#### Required Variables

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `${PORT}` (use Render's variable)
- [ ] `MONGODB_URI` = `mongodb+srv://...` (your Atlas connection string)
- [ ] `JWT_SECRET` = `[64+ character hex string]`
- [ ] `JWT_REFRESH_SECRET` = `[different 64+ character hex string]`
- [ ] `CLIENT_URL` = `https://your-frontend-url.com`

#### Optional Variables (Recommended)

- [ ] `JWT_EXPIRE` = `7d`
- [ ] `JWT_REFRESH_EXPIRE` = `30d`
- [ ] `NODE_OPTIONS` = `--max-old-space-size=1536`
- [ ] `RESEND_API_KEY` = `re_...` (if using email)
- [ ] `RESEND_FROM_EMAIL` = `no-reply@yourdomain.com`
- [ ] `RESEND_FROM_NAME` = `POS System`

## Post-Deployment Verification

### Logs Check

- [ ] Service starts without errors
- [ ] Logs show: `npm install` completed successfully
- [ ] Logs show: `Server running on port 10000` (or your PORT)
- [ ] Logs show: `MongoDB Connected successfully`
- [ ] Logs show: `📝 Environment: production`
- [ ] No error messages in logs

### API Testing

- [ ] Health endpoint responds: `GET /api/health`
- [ ] Authentication endpoint accessible: `POST /api/auth/login`
- [ ] CORS configured correctly (test from frontend)
- [ ] All API endpoints respond correctly

### MongoDB Connection

- [ ] MongoDB Atlas IP whitelist includes Render IPs (or `0.0.0.0/0`)
- [ ] Connection string uses `admin_db` as database name
- [ ] Database user has proper permissions

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| "Cannot find module './dist/index.js'" | Rebuild locally and re-upload folder |
| "MongoDB connection failed" | Check MONGODB_URI and IP whitelist |
| "Port already in use" | Use `${PORT}` variable, don't hardcode |
| "JavaScript heap out of memory" | Add `NODE_OPTIONS=--max-old-space-size=1536` |
| "Cannot find module 'express'" | Verify `npm install --production` ran |

## Quick Commands

### Generate JWT Secrets
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET (run again)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Test API After Deployment
```bash
# Replace with your Render service URL
curl https://your-service.onrender.com/api/health
```

### Rebuild Before Re-upload
```bash
cd backend
npm run build
# Then re-upload folder to Render
```

## Service URL

After deployment, your service will be available at:
```
https://your-service-name.onrender.com
```

Save this URL and update your frontend configuration!

---

**Need help?** See `RENDER_MANUAL_DEPLOYMENT.md` for detailed instructions.

