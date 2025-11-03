# Troubleshooting Guide

## Common Deployment Issues

### Docker Build Errors

#### Error: `npm ci` command can only install with an existing package-lock.json

**Cause**: The `package-lock.json` file is missing from the repository or gitignored.

**Solution**:
1. Make sure `backend/package-lock.json` is tracked in git:
   ```bash
   git ls-files backend/package-lock.json
   ```
2. If missing, add it:
   ```bash
   git add backend/package-lock.json
   git commit -m "fix: Add package-lock.json"
   git push origin main
   ```
3. Check that `.gitignore` doesn't exclude `package-lock.json`

#### Error: MongoDB connection fails

**Symptoms**: 
```
MongoDB connection error: MongoNetworkError
```

**Solutions**:
1. **Atlas Network Access**: Verify IP whitelist includes `0.0.0.0/0` or Render's IP addresses
2. **Connection String**: Ensure password is URL-encoded
3. **Database User**: Verify user has read/write permissions
4. **Cluster Status**: Check cluster is running in MongoDB Atlas

#### Error: CORS errors from frontend

**Symptoms**:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions**:
1. Set `CLIENT_URL` environment variable to exact frontend URL
2. Remove trailing slashes from URLs
3. Ensure frontend uses HTTPS if backend uses HTTPS
4. Check `server.ts` CORS configuration

#### Error: Build succeeds but service won't start

**Symptoms**: Deployment completes but health check fails

**Solutions**:
1. Check logs in Render dashboard
2. Verify `PORT` environment variable is set
3. Ensure `npm start` command is correct
4. Check that `dist/` folder was built properly

#### Error: JWT_SECRET not defined

**Symptoms**:
```
ReferenceError: JWT_SECRET is not defined
```

**Solutions**:
1. Add `JWT_SECRET` environment variable in Render
2. Generate strong secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. Restart service after adding variables

### Local Development Issues

#### Error: Cannot find module

**Solutions**:
```bash
# Delete node_modules and package-lock.json
rm -rf backend/node_modules backend/package-lock.json

# Reinstall
cd backend
npm install
```

#### Error: TypeScript compilation errors

**Solutions**:
```bash
# Check TypeScript version
npx tsc --version

# Clean and rebuild
cd backend
rm -rf dist
npm run build

# Check tsconfig.json is correct
```

#### Error: MongoDB connection timeout locally

**Solutions**:
1. Start MongoDB:
   ```bash
   brew services start mongodb-community
   # or
   mongod --dbpath /path/to/data
   ```
2. Check connection string:
   ```bash
   # Local MongoDB
   MONGODB_URI=mongodb://localhost:27017/pos-system
   ```
3. Verify MongoDB is running:
   ```bash
   mongosh "mongodb://localhost:27017"
   ```

## Testing Deployment

### Health Check
```bash
curl https://your-app.onrender.com/health
```

Expected response:
```json
{
  "success": true,
  "message": "POS System API is running",
  "timestamp": "2024-..."
}
```

### Login Test
```bash
curl -X POST https://your-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin@pos.com","password":"password123"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "...",
    "refreshToken": "...",
    "user": {...}
  }
}
```

### Check Logs

**Render Dashboard**:
1. Go to your service
2. Click "Logs" tab
3. Look for errors or warnings

**Local Development**:
```bash
# Backend logs
cd backend && npm run dev

# Check MongoDB logs
tail -f /usr/local/var/log/mongodb/mongo.log
```

## Performance Issues

### Slow Response Times

**Solutions**:
1. Check MongoDB query performance
2. Enable indexing in models
3. Upgrade Render plan if using free tier
4. Check database connection pooling

### High Memory Usage

**Solutions**:
1. Use multi-stage Docker builds
2. Remove unused dependencies
3. Optimize image sizes
4. Consider upgrading Render resources

## Security Issues

### Security Vulnerabilities in Dependencies

**Solution**:
```bash
cd backend
npm audit
npm audit fix
git add package-lock.json package.json
git commit -m "fix: Update dependencies"
git push origin main
```

### Exposed Environment Variables

**Solutions**:
1. Never commit `.env` files
2. Use Render environment variables
3. Rotate secrets regularly
4. Review error messages (don't expose sensitive data)

## Getting Help

1. **Check documentation**: 
   - [RENDER_DEPLOYMENT_GUIDE.md](../RENDER_DEPLOYMENT_GUIDE.md)
   - [DEPLOY_QUICKSTART.md](./DEPLOY_QUICKSTART.md)

2. **Check logs**: Render dashboard → Logs

3. **Verify configuration**: 
   - Environment variables
   - Build commands
   - Start commands

4. **Test locally**:
   ```bash
   cd backend
   npm install
   npm run build
   npm start
   ```

5. **Community**:
   - Render community: https://community.render.com
   - MongoDB forums: https://developer.mongodb.com/community
   - GitHub issues: https://github.com/ahmadsal1998/pos-production/issues

## Still Having Issues?

If you're still experiencing problems:

1. Clear cache and rebuild:
   ```bash
   git pull origin main
   cd backend
   rm -rf node_modules dist package-lock.json
   npm install
   npm run build
   ```

2. Check all environment variables are set correctly

3. Verify network connectivity to MongoDB Atlas

4. Review recent commits for breaking changes

5. Roll back to last working version if needed

