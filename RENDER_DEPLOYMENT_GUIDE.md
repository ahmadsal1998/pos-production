# Backend Deployment to Render

This guide will walk you through deploying the POS system backend to Render.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com) if you don't have an account
2. **MongoDB Atlas**: Create a free MongoDB Atlas cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
3. **GitHub Repository**: Your code should be pushed to GitHub/GitLab/Bitbucket

## Step 1: Prepare MongoDB Atlas

### 1.1 Create a MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0 Sandbox)
3. Wait for cluster to finish provisioning (2-3 minutes)

### 1.2 Configure Database Access

1. Go to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Set a strong username and password (save these!)
5. Select **Read and write to any database**
6. Click **Add User**

### 1.3 Configure Network Access

1. Go to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for production, consider restricting)
4. Click **Confirm**

### 1.4 Get Connection String

1. Go to **Database** in the left sidebar
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Select **Node.js** as driver
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`)
6. Replace `<password>` with your actual password
7. Replace `<dbname>` with `pos-system` or your preferred database name

## Step 2: Deploy to Render

### 2.1 Create a New Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub/GitLab/Bitbucket repository
4. Select your repository
5. Click **Connect**

### 2.2 Configure Build and Start Commands

Render will auto-detect settings. Verify/configure:

- **Name**: `pos-backend` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your production branch)
- **Root Directory**: `backend` (important!)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free (or paid for better performance)

### 2.3 Set Environment Variables

In the Render dashboard, add these environment variables:

#### Required Variables

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `10000` | Port (Render sets this automatically, but good to specify) |
| `MONGODB_URI` | Your Atlas connection string | MongoDB connection |
| `JWT_SECRET` | Generate a strong random string | JWT signing secret |
| `JWT_REFRESH_SECRET` | Generate a different random string | JWT refresh secret |
| `CLIENT_URL` | Your frontend URL (e.g., `https://your-frontend.vercel.app`) | CORS origin |

#### Optional Variables

| Key | Value | Description |
|-----|-------|-------------|
| `JWT_EXPIRE` | `7d` | Token expiration (optional, defaults to 7d) |
| `JWT_REFRESH_EXPIRE` | `30d` | Refresh token expiration (optional, defaults to 30d) |
| `EMAIL_USER` | Your Gmail | Email for OTP (optional) |
| `EMAIL_PASS` | Gmail app password | Email password (optional) |

#### Generate Secure Secrets

For `JWT_SECRET` and `JWT_REFRESH_SECRET`, use:

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 64
```

Run this twice to get two different values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

### 2.4 Deploy

1. Scroll down and click **Create Web Service**
2. Wait for build and deployment (3-5 minutes)
3. Your service will be available at `https://pos-backend.onrender.com` (or your custom domain)

## Step 3: Verify Deployment

### 3.1 Health Check

Visit your Render service URL + `/health`:
```
https://your-service-url.onrender.com/health
```

You should see:
```json
{
  "success": true,
  "message": "POS System API is running",
  "timestamp": "2024-..."
}
```

### 3.2 Test Authentication Endpoints

Use Postman, curl, or any API client to test:

```bash
# Test login
curl -X POST https://your-service-url.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin@pos.com","password":"password123"}'
```

## Step 4: Seed the Database (Optional)

If you need to seed the database with an admin user:

### Option 1: SSH into Render (Paid plans only)

```bash
render ssh <your-service-name>
cd /app
npm run seed
```

### Option 2: Create user manually via API

You can create the admin user through your API after adding a registration endpoint, or manually insert into MongoDB Atlas.

### Option 3: Run seed script locally

Connect to your production database temporarily:

```bash
# In your local backend directory
MONGODB_URI="your-production-connection-string" npm run seed
```

⚠️ **Make sure to change the password immediately after creating the admin user!**

## Step 5: Update Frontend Configuration

Update your frontend to use the new backend URL:

1. In `frontend/src/lib/api/client.ts`, update the API base URL:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-backend-url.onrender.com/api';
```

2. Update `frontend/src/lib/api/endpoints.ts` if there are hardcoded URLs

3. Redeploy your frontend

## Step 6: Set Up Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click **Settings** → **Custom Domains**
3. Enter your domain
4. Follow DNS configuration instructions
5. SSL certificates are automatically provisioned

## Troubleshooting

### Build Fails

- **Issue**: Build command fails
- **Solution**: Check build logs in Render dashboard. Ensure:
  - `Root Directory` is set to `backend`
  - Dependencies are in `package.json`
  - TypeScript compilation succeeds

### Connection to MongoDB Fails

- **Issue**: `MongoDB connection error`
- **Solution**: 
  - Check MongoDB Atlas IP whitelist includes Render IPs (should be "Allow from anywhere")
  - Verify connection string has correct password
  - Check MongoDB Atlas cluster is running

### 404 Errors

- **Issue**: Routes return 404
- **Solution**: 
  - Check start command is `npm start` (not `npm run dev`)
  - Verify `dist` folder is built properly
  - Check build logs for errors

### CORS Errors

- **Issue**: Frontend can't connect to backend
- **Solution**: 
  - Set `CLIENT_URL` to your frontend URL
  - Remove trailing slashes from URLs
  - Check browser console for specific CORS error

### Environment Variables Not Working

- **Issue**: `undefined` or default values used
- **Solution**:
  - Double-check variable names in Render dashboard
  - Make sure variables are saved before deploying
  - Redeploy after changing variables

## Monitoring

Render provides monitoring in the dashboard:

1. **Logs**: View real-time application logs
2. **Metrics**: CPU, memory, response time
3. **Events**: Deployments, restarts, crashes

## Automatic Deploys

By default, Render auto-deploys on every push to the connected branch. To disable:

1. Go to **Settings** → **Build & Deploy**
2. Toggle **Auto-Deploy** off

## Security Checklist

- [ ] Use strong, unique secrets for JWT
- [ ] Keep MongoDB Atlas password secure
- [ ] Enable MongoDB Atlas authentication
- [ ] Use HTTPS (automatic with Render)
- [ ] Set up IP whitelisting if possible
- [ ] Enable MongoDB Atlas monitoring alerts
- [ ] Regularly rotate secrets
- [ ] Keep dependencies updated

## Cost

- **Free Tier**: 750 hours/month, sleeps after 15min inactivity
- **Starter Plan**: $7/month - Always on, sleep disabled
- **Professional Plan**: $25/month - Better performance, multiple services

For production, consider upgrading to prevent cold starts from sleep mode.

## Support

- Render Docs: https://render.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Render Community: https://community.render.com

## Next Steps

- Set up database backups in MongoDB Atlas
- Configure monitoring and alerts
- Set up staging environment
- Implement CI/CD pipeline
- Add rate limiting
- Set up error tracking (Sentry, etc.)

