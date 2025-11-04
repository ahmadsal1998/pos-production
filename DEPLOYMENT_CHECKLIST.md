# Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

## Pre-Deployment

### Backend Setup
- [ ] Create MongoDB Atlas account
- [ ] Create MongoDB cluster (free M0 tier is fine)
- [ ] Configure database user with password
- [ ] Add network access (Allow from Anywhere: 0.0.0.0/0)
- [ ] Copy MongoDB connection string
- [ ] Generate JWT secrets (2 different ones)
- [ ] Create Render account
- [ ] Verify GitHub repository is pushed

### Frontend Setup
- [ ] Choose hosting platform (Vercel/Netlify recommended)
- [ ] Create account on hosting platform
- [ ] Verify GitHub repository is pushed

## Backend Deployment (Render)

### Configure Service
- [ ] Connect GitHub repository to Render
- [ ] Set root directory to: `backend`
- [ ] Set build command: `npm install && npm run build`
- [ ] Set start command: `npm start`
- [ ] Select Node environment
- [ ] Choose region closest to users
- [ ] Select free tier or upgrade plan

### Environment Variables
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `MONGODB_URI` = Your Atlas connection string
- [ ] `JWT_SECRET` = First generated secret
- [ ] `JWT_REFRESH_SECRET` = Second generated secret
- [ ] `CLIENT_URL` = Your frontend URL (HTTPS)
- [ ] `JWT_EXPIRE` = `7d` (optional)
- [ ] `JWT_REFRESH_EXPIRE` = `30d` (optional)
- [ ] `RESEND_API_KEY` = Your Resend API key (optional)
- [ ] `RESEND_FROM_EMAIL` = Sender email (optional, defaults to no-reply@possystem.com)
- [ ] `RESEND_FROM_NAME` = Sender name (optional, defaults to POS System)

### Verify Backend
- [ ] Deployment succeeds without errors
- [ ] Health check works: `https://your-app.onrender.com/health`
- [ ] Test login endpoint with Postman/curl
- [ ] Check Render logs for any errors

### Database Seeding
- [ ] Seed database with admin user
- [ ] Verify admin credentials work
- [ ] Change admin password immediately
- [ ] Delete seed script if in production repo

## Frontend Deployment (Vercel/Netlify)

### Configure Project
- [ ] Connect GitHub repository
- [ ] Set framework to Vite or React
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Set root directory to: `frontend`

### Environment Variables
- [ ] `VITE_API_URL` = Your backend URL (e.g., `https://your-app.onrender.com/api`)
- [ ] Add any other environment variables needed

### Verify Frontend
- [ ] Build succeeds
- [ ] Site loads without errors
- [ ] Login page is accessible
- [ ] Can login with credentials
- [ ] API calls work from frontend
- [ ] No CORS errors in console

## Post-Deployment

### Security
- [ ] All secrets are in environment variables (not in code)
- [ ] MongoDB Atlas has authentication enabled
- [ ] HTTPS is enabled (automatic with Render/Vercel)
- [ ] Admin password has been changed
- [ ] JWT secrets are strong and unique
- [ ] CORS is configured correctly

### Testing
- [ ] Test login flow
- [ ] Test protected routes
- [ ] Test logout functionality
- [ ] Test password reset (if configured)
- [ ] Test API endpoints
- [ ] Check error handling
- [ ] Verify logging works

### Monitoring
- [ ] Set up MongoDB Atlas monitoring alerts
- [ ] Configure Render health checks
- [ ] Check application logs
- [ ] Set up uptime monitoring
- [ ] Configure error tracking (optional: Sentry)

### Performance
- [ ] Enable caching where appropriate
- [ ] Configure CDN for frontend assets
- [ ] Optimize database queries
- [ ] Set up database backups
- [ ] Monitor response times

## Documentation

- [ ] Update README with deployment URLs
- [ ] Document environment variables
- [ ] Create runbook for common issues
- [ ] Document rollback procedure
- [ ] Share credentials securely with team

## Launch

- [ ] All tests pass
- [ ] Performance is acceptable
- [ ] Security checklist complete
- [ ] Backup procedures in place
- [ ] Team notified of launch
- [ ] Monitoring is active
- [ ] Support channels are ready

## Rollback Plan

- [ ] Know how to rollback in Render
- [ ] Know how to rollback frontend
- [ ] Have previous version tagged in Git
- [ ] Database migration rollback plan
- [ ] Communication plan for users

## Common Issues

### Backend Issues
- **Build fails**: Check root directory is `backend`
- **MongoDB connection error**: Verify IP whitelist and connection string
- **CORS errors**: Check `CLIENT_URL` matches frontend URL
- **Service sleeps**: Free tier sleeps after 15 min, upgrade to prevent

### Frontend Issues
- **API not found**: Verify `VITE_API_URL` is correct
- **Build errors**: Check Node version compatibility
- [ ] Network errors: Verify backend is running
- **White screen**: Check browser console for errors

## Resources

- [Render Dashboard](https://dashboard.render.com)
- [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Netlify Dashboard](https://app.netlify.com)

## Support

If you encounter issues:
1. Check application logs
2. Review deployment guide
3. Check troubleshooting section
4. Search GitHub issues
5. Contact support

---

**Last Updated**: After successful deployment, update this checklist with your specific configuration details.

