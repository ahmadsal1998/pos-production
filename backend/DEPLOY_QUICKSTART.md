# Quick Deploy to Render

This is a condensed guide for deploying the backend to Render. For detailed instructions, see `RENDER_DEPLOYMENT_GUIDE.md`.

## Prerequisites
- Render account at [render.com](https://render.com)
- MongoDB Atlas cluster (free tier is fine)
- GitHub repository pushed to GitHub

## Deployment Steps

### 1. MongoDB Atlas Setup (5 minutes)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free M0 cluster
3. Database Access → Add user with password (save credentials!)
4. Network Access → Allow from anywhere (0.0.0.0/0)
5. Connect → Choose "Connect your app" → Copy connection string
6. Replace `<password>` and `<dbname>` in connection string

### 2. Generate JWT Secrets

Run this command twice to get two different secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save both secrets for later.

### 3. Deploy to Render (10 minutes)

1. **Create Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

2. **Configure Service**
   - **Name**: `pos-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest region
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `backend` ⚠️ **IMPORTANT!**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or upgrade for better performance)

3. **Add Environment Variables**

Click "Advanced" → "Add Environment Variable" and add:

```
NODE_ENV = production
PORT = 10000
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/pos-system?retryWrites=true&w=majority
JWT_SECRET = <paste first generated secret>
JWT_REFRESH_SECRET = <paste second generated secret>
CLIENT_URL = https://your-frontend-url.vercel.app
```

Optional (for email OTP):
```
RESEND_API_KEY = re_your_resend_api_key_here
RESEND_FROM_EMAIL = no-reply@yourdomain.com
RESEND_FROM_NAME = POS System
```

4. **Deploy**
   - Click "Create Web Service"
   - Wait 3-5 minutes for deployment

### 4. Verify Deployment

Visit: `https://your-service-name.onrender.com/health`

Should see:
```json
{
  "success": true,
  "message": "POS System API is running"
}
```

### 5. Test Login

Use curl, Postman, or any API client:

```bash
curl -X POST https://your-service-name.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"adminn@pos.com","password":"password123"}'
```

**Note**: You may need to seed the database first. See step 6.

### 6. Seed Database (Create Admin User)

You have three options:

**Option A**: Temporarily set MongoDB to your production URI and run locally:
```bash
cd backend
MONGODB_URI="your-production-mongodb-uri" npm run seed
```

**Option B**: SSH into Render (paid plans only):
```bash
render ssh pos-backend
cd /app
npm run seed
exit
```

**Option C**: Create user manually via MongoDB Atlas web interface

## Troubleshooting

### Build fails
- ✅ Root Directory is set to `backend`
- ✅ Branch is correct
- ✅ Build command is correct

### MongoDB connection error
- ✅ Check IP whitelist in MongoDB Atlas (should be 0.0.0.0/0)
- ✅ Verify password in connection string
- ✅ Check cluster is running

### CORS errors from frontend
- ✅ CLIENT_URL matches your frontend URL exactly
- ✅ No trailing slashes
- ✅ Using HTTPS if frontend is HTTPS

### Service sleeps
- Free tier sleeps after 15 minutes of inactivity
- Upgrade to Starter plan ($7/mo) to prevent sleeping
- Or use free tier for development only

## Next Steps

- [ ] Set up database backups in MongoDB Atlas
- [ ] Configure monitoring alerts
- [ ] Update frontend API URL
- [ ] Test all API endpoints
- [ ] Set up custom domain
- [ ] Configure SSL (automatic with Render)

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | Yes | - | Must be `production` |
| PORT | Yes | 10000 | Server port |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| JWT_REFRESH_SECRET | Yes | - | JWT refresh secret |
| CLIENT_URL | Yes | - | Frontend URL for CORS |
| JWT_EXPIRE | No | 7d | Token expiration |
| JWT_REFRESH_EXPIRE | No | 30d | Refresh token expiration |
| RESEND_API_KEY | No | - | Resend API key for sending emails |
| RESEND_FROM_EMAIL | No | no-reply@possystem.com | Sender email address |
| RESEND_FROM_NAME | No | POS System | Sender name |

## Cost Estimate

- **Free Tier**: $0/month (sleeps after inactivity)
- **Starter**: $7/month (always on)
- **Professional**: $25/month (better performance)

For production, we recommend Starter plan or higher.

## Support

- Full deployment guide: `RENDER_DEPLOYMENT_GUIDE.md`
- Environment setup: `ENV_SETUP.md`
- Render docs: https://render.com/docs
- MongoDB docs: https://docs.atlas.mongodb.com

