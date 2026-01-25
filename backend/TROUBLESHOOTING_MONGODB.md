# MongoDB Connection Troubleshooting Guide

## Current Error
```
querySrv ECONNREFUSED _mongodb._tcp.cluster0.zp7zgws.mongodb.net
```

This error indicates a DNS resolution or network connectivity issue with MongoDB Atlas.

## Step-by-Step Troubleshooting

### 1. Check Internet Connection
```bash
# Test basic connectivity
ping google.com
```

### 2. Verify MongoDB Atlas Cluster Status

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Log in to your account
3. Check if your cluster (`cluster0`) is:
   - ✅ **Running** (green status)
   - ❌ **Paused** (if paused, click "Resume" to start it)
   - ❌ **Deleted** (if deleted, you'll need to restore or create a new cluster)

### 3. Check IP Whitelist (Network Access)

**This is the most common cause of connection issues!**

1. In MongoDB Atlas, go to **Network Access** (left sidebar)
2. Check if your current IP address is whitelisted
3. If not, click **"Add IP Address"**
4. Options:
   - **Add Current IP Address** (recommended for testing)
   - **Allow Access from Anywhere** (0.0.0.0/0) - ⚠️ Less secure, but useful for development

**Note**: If you're behind a VPN or corporate firewall, you may need to whitelist multiple IPs.

### 4. Verify Connection String

Check your `.env` file:
```bash
# Should look like:
MONGODB_URI=mongodb+srv://username:password@cluster0.zp7zgws.mongodb.net/?retryWrites=true&w=majority
```

**Important checks:**
- ✅ Username and password are correct
- ✅ Cluster name matches (`cluster0.zp7zgws.mongodb.net`)
- ✅ No extra spaces or special characters
- ✅ Password doesn't contain special characters that need URL encoding (use `encodeURIComponent()` if needed)

### 5. Test DNS Resolution

```bash
# Test if DNS can resolve the MongoDB hostname
nslookup cluster0.zp7zgws.mongodb.net
# or
dig _mongodb._tcp.cluster0.zp7zgws.mongodb.net SRV
```

If DNS resolution fails, it could be:
- DNS server issues
- Firewall blocking DNS queries
- Network configuration problems

### 6. Test with MongoDB Compass

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Try connecting with your connection string
3. If Compass works but the script doesn't, it's likely a Node.js/network configuration issue
4. If Compass also fails, it's a MongoDB Atlas configuration issue

### 7. Check Firewall/Security Software

- **Corporate Firewall**: May block MongoDB connections
- **Antivirus Software**: May block network connections
- **VPN**: May interfere with connections (try disconnecting)
- **Proxy Settings**: May need to configure proxy for Node.js

### 8. Try Alternative Connection Method

If `mongodb+srv://` fails, try the standard connection string format:

```bash
# Get connection details from MongoDB Atlas:
# 1. Click "Connect" on your cluster
# 2. Choose "Connect your application"
# 3. Select "Node.js" driver
# 4. Copy the connection string
```

### 9. Check MongoDB Atlas Service Status

1. Check [MongoDB Atlas Status Page](https://status.mongodb.com/)
2. Verify there are no ongoing incidents

### 10. Verify Database User Permissions

1. Go to **Database Access** in MongoDB Atlas
2. Verify your database user:
   - Has appropriate permissions (at least `readWrite`)
   - Is not locked or disabled
   - Password is correct

## Quick Fixes to Try

### Fix 1: Resume Paused Cluster
If your cluster is paused (common in free tier):
1. Go to MongoDB Atlas
2. Click on your cluster
3. Click **"Resume"** button
4. Wait 1-2 minutes for cluster to start

### Fix 2: Whitelist IP Address
1. Go to **Network Access**
2. Click **"Add IP Address"**
3. Click **"Add Current IP Address"**
4. Click **"Confirm"**
5. Wait 1-2 minutes for changes to propagate

### Fix 3: Test Connection String Format
Try using the connection string directly in MongoDB Compass to verify it works.

### Fix 4: Check for Special Characters in Password
If your password contains special characters, they may need to be URL-encoded:
```javascript
// Example: password "p@ssw0rd!" becomes "p%40ssw0rd%21"
const encodedPassword = encodeURIComponent(password);
```

## Testing After Fixes

After making changes, test the connection:

```bash
npm run test:mongo
```

If the test passes, you can proceed with the migration:

```bash
npm run migrate:customer-payments
```

## Common Solutions by Error Type

### `ECONNREFUSED`
- **Cause**: IP not whitelisted or cluster paused
- **Solution**: Whitelist IP and/or resume cluster

### `querySrv ENOTFOUND`
- **Cause**: DNS resolution failure
- **Solution**: Check DNS settings, try different DNS server (8.8.8.8)

### `Authentication failed`
- **Cause**: Wrong username/password
- **Solution**: Verify credentials in Database Access

### `Server selection timed out`
- **Cause**: Network timeout or firewall blocking
- **Solution**: Check firewall, increase timeout in connection options

## Still Having Issues?

If none of the above solutions work:

1. **Check MongoDB Atlas Logs**: Look for connection attempts in Atlas dashboard
2. **Try from Different Network**: Test from a different location/network
3. **Contact MongoDB Support**: If you have a paid plan, contact support
4. **Check Node.js Version**: Ensure you're using Node.js 20+ (as specified in package.json)

## Additional Resources

- [MongoDB Atlas Connection Troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/)
- [MongoDB Connection String Format](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [MongoDB Atlas Network Access](https://www.mongodb.com/docs/atlas/security/ip-access-list/)

---

**Last Updated**: January 2026
