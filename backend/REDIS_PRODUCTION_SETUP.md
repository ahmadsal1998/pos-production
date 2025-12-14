# Redis Production Setup Guide

## Overview

Redis caching is **optional but highly recommended** for production deployments. It significantly improves barcode lookup performance from ~50ms to < 5ms, which is critical for high-volume POS operations.

## System Behavior

- ✅ **Without Redis**: System works normally, barcode lookups use database queries (~50ms)
- ✅ **With Redis**: System works with enhanced performance, barcode lookups use cache (< 5ms)
- ✅ **Automatic Detection**: System automatically detects and uses Redis when available
- ✅ **Graceful Degradation**: If Redis connection is lost, system continues working without caching

## Production Setup

### Option 1: Redis Cloud (Recommended for Production)

1. **Sign up for Redis Cloud** (https://redis.com/try-free/)
   - Free tier: 30MB storage
   - Paid tiers: Scale as needed

2. **Get Connection URL**
   - Format: `redis://username:password@host:port`
   - Example: `redis://default:abc123@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345`

3. **Set Environment Variable**
   ```bash
   REDIS_URL=redis://default:abc123@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
   ```

### Option 2: Self-Hosted Redis (Docker)

```bash
# Run Redis in Docker
docker run -d \
  --name redis-pos \
  -p 6379:6379 \
  --restart unless-stopped \
  redis:7-alpine

# Set environment variable (if not using default localhost)
REDIS_URL=redis://localhost:6379
```

### Option 3: Self-Hosted Redis (Native Installation)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows:**
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL2 with Ubuntu installation

## Environment Configuration

### Development (.env)
```env
# Optional - defaults to redis://localhost:6379
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### Production (.env or Platform Settings)
```env
# Required for production Redis
REDIS_URL=redis://username:password@host:port
NODE_ENV=production
```

### Platform-Specific Setup

**Render.com:**
1. Add Redis service in dashboard
2. Copy connection URL
3. Add as environment variable: `REDIS_URL`

**Heroku:**
```bash
heroku addons:create heroku-redis:mini
# Automatically sets REDIS_URL
```

**Railway:**
1. Add Redis service
2. Copy connection URL
3. Add as environment variable: `REDIS_URL`

**DigitalOcean:**
1. Create Managed Redis database
2. Copy connection URL
3. Add as environment variable: `REDIS_URL`

## Verification

### Check Redis Connection

1. **Health Check Endpoint:**
   ```bash
   curl http://localhost:5000/health
   ```
   
   Response includes Redis status:
   ```json
   {
     "success": true,
     "services": {
       "redis": {
         "available": true,
         "connected": true,
         "healthy": true
       }
     }
   }
   ```

2. **Server Logs:**
   - ✅ Success: `✅ Redis: Connected and ready`
   - ⚠️ Warning: `⚠️ Redis: Not available (connection refused)`

### Test Barcode Lookup Performance

With Redis enabled, barcode lookups should be:
- **Cache Hit**: < 5ms
- **Cache Miss**: ~50ms (first lookup, then cached)

## Production Features

### Automatic Reconnection
- System automatically reconnects if Redis connection is lost
- Exponential backoff: 500ms, 1000ms, 2000ms, up to 5000ms
- Max 10 reconnection attempts in production

### Connection Health Monitoring
- Ping every 30 seconds to keep connection alive
- Automatic reconnection on connection loss
- Graceful degradation if Redis is unavailable

### Cache Management
- **TTL**: 1 hour (3600 seconds) for product barcodes
- **Automatic Invalidation**: Cache cleared when products are updated/deleted
- **Pattern Deletion**: Uses SCAN (production-safe) instead of KEYS

## Performance Impact

### Without Redis
- Barcode lookup: ~50ms (database query)
- Suitable for: Low-volume stores, development

### With Redis
- Barcode lookup: < 5ms (cache hit)
- Suitable for: High-volume stores, production, multiple concurrent users

## Troubleshooting

### Redis Not Connecting

1. **Check Redis is Running:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **Check Connection URL:**
   ```bash
   echo $REDIS_URL
   # Should show: redis://host:port or redis://user:pass@host:port
   ```

3. **Check Firewall/Network:**
   - Ensure port 6379 is open (or your Redis port)
   - Check security groups (AWS, GCP, Azure)
   - Verify network connectivity

4. **Check Logs:**
   - Look for Redis connection errors in server logs
   - Check for authentication errors

### Redis Connection Drops

- System automatically reconnects
- Check Redis server logs for issues
- Verify Redis server has enough memory
- Check for network issues

### High Memory Usage

- Redis uses ~1MB per 1000 cached products
- Monitor Redis memory: `redis-cli info memory`
- Set maxmemory policy if needed: `maxmemory-policy allkeys-lru`

## Monitoring

### Key Metrics to Monitor

1. **Cache Hit Rate**: Should be > 80% for optimal performance
2. **Connection Status**: Should be consistently connected
3. **Memory Usage**: Monitor Redis memory consumption
4. **Response Times**: Barcode lookups should be < 5ms with cache

### Redis Commands for Monitoring

```bash
# Check Redis info
redis-cli info

# Check memory usage
redis-cli info memory

# Check connected clients
redis-cli client list

# Monitor commands in real-time
redis-cli monitor
```

## Security Considerations

1. **Use Password Authentication:**
   ```env
   REDIS_URL=redis://username:password@host:port
   ```

2. **Use TLS/SSL in Production:**
   ```env
   REDIS_URL=rediss://username:password@host:port
   ```

3. **Restrict Network Access:**
   - Use VPC/private networks when possible
   - Restrict Redis port to application servers only
   - Use firewall rules to limit access

## IndexedDB Sync Compatibility

✅ **IndexedDB sync works independently of Redis**

- Frontend IndexedDB sync uses API calls to backend
- Backend Redis caching is transparent to frontend
- No changes needed to IndexedDB sync code
- Both systems work together seamlessly

## Summary

- ✅ Redis is **optional** but **highly recommended** for production
- ✅ System works without Redis (slower barcode lookups)
- ✅ System automatically detects and uses Redis when available
- ✅ Graceful degradation if Redis connection is lost
- ✅ IndexedDB sync works independently of Redis
- ✅ Production-ready with automatic reconnection and health monitoring

