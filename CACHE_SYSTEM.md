# Universal Cache System Documentation

## 🚀 Overview

This universal caching system automatically scales from **memory → Redis → database** based on your environment and application needs.

## 🎯 Key Features

- **Auto-scaling**: Memory cache → Redis → Database progression
- **Memory protection**: Automatic eviction and cleanup
- **Performance monitoring**: Built-in timing and statistics
- **Cache invalidation**: Pattern-based and user-specific
- **Production ready**: Memory limits, error handling, monitoring

## 📊 Architecture Levels

### Level 1: Memory Cache (Low/Mid Applications)
- **Use case**: Development, small apps, prototypes
- **Capacity**: Up to 1000 entries, ~500MB memory
- **Performance**: ~2-10ms access time
- **Persistence**: Process memory (lost on restart)

### Level 2: Redis Cache (High Applications)
- **Use case**: Production, high traffic, distributed systems  
- **Capacity**: Limited by Redis instance (GBs to TBs)
- **Performance**: ~5-20ms access time
- **Persistence**: Configurable (disk backup, clustering)

### Level 3: Database Cache (Enterprise)
- **Use case**: Multi-region, compliance, audit trails
- **Capacity**: Virtually unlimited
- **Performance**: ~50-200ms access time  
- **Persistence**: Permanent, ACID compliance

## 🔧 Quick Start

### 1. Basic Usage
\`\`\`javascript
import { getOrSetCached, getCached, setCached } from '@/lib/cache/serverCache';
import { CacheKeys, CacheTTL } from '@/lib/cache/cacheKeys';

// In your server action
export async function fetchUserDataServer(userId) {
  return await getOrSetCached(
    CacheKeys.USER_PROFILE(userId),
    async () => {
      // This only runs on cache miss
      const response = await fetch(\`/api/users/\${userId}\`);
      return await response.json();
    },
    CacheTTL.USER_SESSION // 30 minutes
  );
}
\`\`\`

### 2. Environment Setup

#### Memory Cache (Default)
\`\`\`bash
# No setup required - works out of the box
npm run dev
\`\`\`

#### Redis Cache (Production)
\`\`\`bash
# Install Redis support
npm install ioredis

# Set environment variable
REDIS_URL=redis://localhost:6379

# Or for hosted Redis
REDIS_URL=rediss://user:password@host:port
\`\`\`

## 📚 Usage Patterns

### Server Actions (Recommended)
\`\`\`javascript
// src/app/dashboard/actions.js
export async function fetchDashboardServer(userId, soldToId) {
  const cacheKey = CacheKeys.DASHBOARD_DATA(userId, soldToId);
  
  return await getOrSetCached(
    cacheKey,
    async () => {
      // Expensive operation here
      return await expensiveAPICall();
    },
    CacheTTL.MEDIUM
  );
}
\`\`\`

### API Routes
\`\`\`javascript
// src/app/api/reports/route.js
import { getOrSetCached } from '@/lib/cache/serverCache';

export async function POST(request) {
  const { reportType, filters } = await request.json();
  const cacheKey = \`report-\${reportType}-\${JSON.stringify(filters)}\`;
  
  const data = await getOrSetCached(
    cacheKey,
    async () => await generateReport(reportType, filters),
    CacheTTL.REPORTS
  );
  
  return Response.json(data);
}
\`\`\`

## 🧹 Cache Management

### Invalidation Patterns
\`\`\`javascript
import { invalidateCache } from '@/lib/cache/serverCache';

// After user update
await invalidateCache(\`user-profile-\${userId}\`);

// After data changes
await invalidateCache(\`dashboard-\${userId}\`);

// Pattern-based invalidation
await invalidateCache(/reports-.*-\${userId}/);
\`\`\`

### Monitoring
\`\`\`javascript
// Get cache statistics
const stats = await getCacheStats();
console.log('Cache type:', stats.type);
console.log('Entries:', stats.entries);
console.log('Memory usage:', stats.memoryUsage);

// Or visit: http://localhost:3000/api/cache/stats
\`\`\`

## ⚙️ Configuration

### Cache Keys (Centralized)
\`\`\`javascript
// src/lib/cache/cacheKeys.js
export const CacheKeys = {
  USER_PROFILE: (userId) => \`user-profile-\${userId}\`,
  DASHBOARD: (userId, soldToId) => \`dashboard-\${userId}-\${soldToId}\`,
  // Add your own keys here
};
\`\`\`

### TTL Management
\`\`\`javascript
export const CacheTTL = {
  VERY_SHORT: 1 * 60 * 1000,      // 1 minute  
  SHORT: 5 * 60 * 1000,           // 5 minutes
  MEDIUM: 30 * 60 * 1000,         // 30 minutes
  LONG: 2 * 60 * 60 * 1000,       // 2 hours
  // Customize based on your needs
};
\`\`\`

## 🚨 Production Considerations

### Memory Limits
- **Default limit**: 1000 entries
- **Memory protection**: Automatic LRU eviction
- **Cleanup**: Every 10 minutes

### Redis Configuration
\`\`\`javascript
// For high-traffic apps
REDIS_URL=redis://localhost:6379
REDIS_MAX_MEMORY=2gb
REDIS_EVICTION_POLICY=allkeys-lru
\`\`\`

### Monitoring Endpoints
- \`GET /api/cache/stats\` - View cache statistics
- \`DELETE /api/cache/stats\` - Clear entire cache
- \`POST /api/cache/invalidate\` - Pattern-based invalidation

## 🎯 Best Practices

### ✅ DO
- Use consistent cache keys
- Set appropriate TTLs
- Handle cache misses gracefully
- Monitor memory usage
- Invalidate on data updates

### ❌ DON'T  
- Cache sensitive data (passwords, tokens)
- Cache real-time data
- Use very long TTLs for user data
- Cache data > 10MB per entry
- Ignore memory limits

## 📈 Performance Expectations

| Cache Type | Access Time | Capacity | Use Case |
|------------|-------------|----------|----------|
| Memory | 2-10ms | ~500MB | Development, Small Apps |
| Redis | 5-20ms | 1GB-1TB | Production, High Traffic |
| Database | 50-200ms | Unlimited | Enterprise, Compliance |

## 🔧 Troubleshooting

### High Memory Usage
\`\`\`bash
# Check cache stats
curl http://localhost:3000/api/cache/stats

# Clear cache if needed
curl -X DELETE http://localhost:3000/api/cache/stats
\`\`\`

### Redis Connection Issues
\`\`\`bash
# Test Redis connection
redis-cli ping

# Check Redis memory
redis-cli info memory
\`\`\`

### Performance Issues
1. Check cache hit/miss ratios in logs
2. Reduce TTL for frequently changing data
3. Increase TTL for static data
4. Consider Redis upgrade for high traffic

## 🚀 Migration Path

1. **Start**: Use memory cache (no setup)
2. **Scale**: Add Redis when needed (\`REDIS_URL\`)
3. **Enterprise**: Custom database cache implementation

The system automatically detects and uses the best available option! 🎯