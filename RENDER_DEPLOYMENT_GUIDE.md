# Render Deployment Guide - Complete Step-by-Step

This guide will help you deploy your POS backend to Render.com.

## Prerequisites

✅ Your code is pushed to GitHub: `https://github.com/ahmadsal1998/pos-production`
✅ You have a Render account (sign up at https://render.com if needed)
✅ You have a MongoDB Atlas database (or will create one)

---

## Step 1: Generate JWT Secrets

Before deploying, you need to generate two JWT secrets. Run these commands:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET (run the command again to get a different value)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Save both secrets** - you'll need them in Step 4.

---

## Step 2: Set Up MongoDB Atlas (if not already done)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign in or create an account
3. Create a new cluster (Free M0 tier is fine)
4. Wait for cluster to finish creating (2-3 minutes)

### Configure Database Access:
1. Click **"Database Access"** in the left menu
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Create a username and password (save these!)
5. Set privileges to **"Atlas admin"** or **"Read and write to any database"**
6. Click **"Add User"**

### Configure Network Access:
1. Click **"Network Access"** in the left menu
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (adds 0.0.0.0/0)
4. Click **"Confirm"**

### Get Connection String:
1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
4. Replace `<password>` with your actual password
5. Replace `<dbname>` with `admin_db` (or your preferred database name)
6. **Save this connection string** - you'll need it in Step 4

---

## Step 3: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** button (top right)
3. Select **"Web Service"**
4. Connect your GitHub account if prompted
5. Select your repository: **`ahmadsal1998/pos-production`**
6. Click **"Connect"**

---

## Step 4: Configure the Service

Fill in the following settings:

### Basic Settings:
- **Name**: `pos-backend` (or your preferred name)
- **Region**: Choose the closest region to your users
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **IMPORTANT!**
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Choose **Free** (for testing) or **Starter** ($7/mo for always-on)

### Environment Variables:

Click **"Advanced"** → **"Add Environment Variable"** and add each of these:

#### Required Variables:

```
NODE_ENV = production
```

```
PORT = 10000
```

```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/admin_db?retryWrites=true&w=majority
```
*(Replace with your actual MongoDB connection string from Step 2)*

```
JWT_SECRET = [paste first secret from Step 1]
```

```
JWT_REFRESH_SECRET = [paste second secret from Step 1]
```

```
CLIENT_URL = https://your-frontend-url.com
```
*(Replace with your frontend URL - if not deployed yet, use a placeholder and update later)*

#### Optional Variables (Recommended):

```
JWT_EXPIRE = 7d
```

```
JWT_REFRESH_EXPIRE = 30d
```

```
NODE_OPTIONS = --max-old-space-size=1536
```

#### Optional Variables (For Email OTP - if using):

```
RESEND_API_KEY = re_your_resend_api_key_here
```

```
RESEND_FROM_EMAIL = no-reply@yourdomain.com
```

```
RESEND_FROM_NAME = POS System
```

---

## Step 5: Deploy

1. Review all settings
2. Click **"Create Web Service"**
3. Wait for deployment (3-5 minutes)
4. Watch the logs for any errors

---

## Step 6: Verify Deployment

### Check Logs:
1. In Render Dashboard, click on your service
2. Go to **"Logs"** tab
3. Look for:
   - ✅ `npm install` completed
   - ✅ `npm run build` completed
   - ✅ `Server running on port 10000`
   - ✅ `MongoDB Connected successfully`
   - ✅ `📝 Environment: production`

### Test Health Endpoint:

Open in browser or use curl:
```
https://your-service-name.onrender.com/api/health
```

Should return:
```json
{
  "success": true,
  "message": "POS System API is running"
}
```

### Test API Endpoint:

```bash
curl https://your-service-name.onrender.com/api/health
```

---

## Step 7: Seed Database (Create Admin User)

You need to create an admin user. Choose one method:

### Method A: Run Seed Script Locally (Easiest)

1. Temporarily set your local MongoDB URI:
```bash
cd backend
MONGODB_URI="your-production-mongodb-uri" npm run seed
```

### Method B: Use MongoDB Atlas Web Interface

1. Go to MongoDB Atlas
2. Click **"Browse Collections"**
3. Create database: `admin_db`
4. Create collection: `users`
5. Insert document:
```json
{
  "email": "admin@pos.com",
  "username": "admin",
  "password": "$2b$10$...", // You'll need to hash a password
  "role": "Admin",
  "storeId": null
}
```

### Method C: Use Render SSH (Paid Plans Only)

```bash
render ssh pos-backend
cd /app
npm run seed
exit
```

---

## Step 8: Update Frontend API URL

Update your frontend to point to the new backend URL:

1. Find where `VITE_API_URL` is set in your frontend
2. Update it to: `https://your-service-name.onrender.com/api`
3. Rebuild and redeploy frontend

---

## Troubleshooting

### Build Fails
- ✅ Check Root Directory is set to `backend`
- ✅ Verify Build Command: `npm install && npm run build`
- ✅ Check logs for specific error messages

### MongoDB Connection Error
- ✅ Verify `MONGODB_URI` is correct (no extra spaces)
- ✅ Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- ✅ Verify database user has correct permissions
- ✅ Check cluster is running (not paused)

### Service Crashes on Start
- ✅ Check logs for error messages
- ✅ Verify all required environment variables are set
- ✅ Check `PORT` variable matches your start command
- ✅ Verify `NODE_OPTIONS` is set if you see memory errors

### CORS Errors
- ✅ Verify `CLIENT_URL` matches your frontend URL exactly
- ✅ No trailing slashes in `CLIENT_URL`
- ✅ Use HTTPS if frontend uses HTTPS

### Service Sleeps (Free Tier)
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Upgrade to Starter plan ($7/mo) to prevent sleeping

---

## Service URL

After deployment, your backend will be available at:
```
https://your-service-name.onrender.com
```

API endpoints will be at:
```
https://your-service-name.onrender.com/api/...
```

---

## Next Steps

- [ ] Test all API endpoints
- [ ] Set up database backups in MongoDB Atlas
- [ ] Configure monitoring alerts in Render
- [ ] Update frontend API URL
- [ ] Set up custom domain (optional)
- [ ] Configure SSL (automatic with Render)

---

## Cost Estimate

- **Free Tier**: $0/month (sleeps after inactivity, slower cold starts)
- **Starter**: $7/month (always on, faster response)
- **Professional**: $25/month (better performance, more resources)

For production, we recommend **Starter plan** or higher.

---

## Support Resources

- Render Docs: https://render.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Backend Deployment Guide: `backend/DEPLOY_QUICKSTART.md`
- Troubleshooting: `backend/TROUBLESHOOTING.md`

---

## Quick Reference

### Your Service Details:
- **Repository**: https://github.com/ahmadsal1998/pos-production
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Port**: `10000`

### Required Environment Variables:
1. `NODE_ENV=production`
2. `PORT=10000`
3. `MONGODB_URI=your-connection-string`
4. `JWT_SECRET=your-secret`
5. `JWT_REFRESH_SECRET=your-refresh-secret`
6. `CLIENT_URL=your-frontend-url`

---

**Good luck with your deployment! 🚀**

