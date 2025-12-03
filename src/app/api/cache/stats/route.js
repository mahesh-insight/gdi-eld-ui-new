// src/app/api/cache/stats/route.js
import { getCacheStats, getCache } from '@/lib/cache/serverCache';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stats = await getCacheStats();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cache: stats,
      recommendations: generateRecommendations(stats)
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cache = getCache();
    await cache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

function generateRecommendations(stats) {
  const recommendations = [];
  
  if (stats.type === 'memory') {
    const heapUsed = parseInt(stats.memoryUsage.heapUsed);
    const entries = stats.entries;
    
    if (heapUsed > 512) { // 512MB
      recommendations.push({
        level: 'warning',
        message: 'High memory usage detected. Consider upgrading to Redis.',
        action: 'Set REDIS_URL environment variable'
      });
    }
    
    if (entries > 500) {
      recommendations.push({
        level: 'info',
        message: 'Large number of cache entries. Monitor for performance impact.',
        action: 'Consider shorter TTL or more selective caching'
      });
    }
  }
  
  if (stats.type === 'redis') {
    recommendations.push({
      level: 'success',
      message: 'Using Redis for optimal performance.',
      action: 'Monitor Redis memory usage in production'
    });
  }
  
  return recommendations;
}