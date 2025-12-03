// src/lib/cache/examples.js
/**
 * Example implementations for different pages using the universal cache system
 */

import { getOrSetCached, getCached, setCached, invalidateCache } from './serverCache';
import { CacheKeys, CacheTTL } from './cacheKeys';

// EXAMPLE 1: Dashboard Page Action
export async function fetchDashboardDataServer(userId, soldToId) {
  const cacheKey = CacheKeys.DASHBOARD_DATA(userId, soldToId);
  
  const dashboardData = await getOrSetCached(
    cacheKey,
    async () => {
      // Fetch from your API
      const response = await fetch(`/api/dashboard?userId=${userId}&soldToId=${soldToId}`);
      return await response.json();
    },
    CacheTTL.MEDIUM // 30 minutes
  );
  
  return { data: dashboardData, error: null };
}

// EXAMPLE 2: User Profile Action
export async function fetchUserProfileServer(userId) {
  const cacheKey = CacheKeys.USER_PROFILE(userId);
  
  return await getOrSetCached(
    cacheKey,
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      return await response.json();
    },
    CacheTTL.USER_SESSION // 30 minutes
  );
}

// EXAMPLE 3: Reports Page Action (with parameters)
export async function fetchReportDataServer(reportType, userId, filters) {
  const cacheKey = CacheKeys.REPORT_DATA(reportType, userId, filters);
  
  return await getOrSetCached(
    cacheKey,
    async () => {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, userId, filters })
      });
      return await response.json();
    },
    CacheTTL.REPORTS // 15 minutes
  );
}

// EXAMPLE 4: Configuration Data (rarely changes)
export async function fetchUIPropertiesServer() {
  const cacheKey = CacheKeys.UI_PROPERTIES();
  
  return await getOrSetCached(
    cacheKey,
    async () => {
      const response = await fetch('/api/ui-properties');
      return await response.json();
    },
    CacheTTL.CONFIGURATION // 1 hour
  );
}

// EXAMPLE 5: Time-based caching (for data that changes hourly)
export async function fetchHourlyStatsServer() {
  const cacheKey = CacheKeys.HOURLY('stats');
  
  return await getOrSetCached(
    cacheKey,
    async () => {
      const response = await fetch('/api/stats/hourly');
      return await response.json();
    },
    CacheTTL.LONG // 2 hours
  );
}

// EXAMPLE 6: Cache invalidation patterns
export async function updateUserProfile(userId, profileData) {
  // Update the profile
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
  
  if (response.ok) {
    // Invalidate user-related caches
    await invalidateCache(`user-profile-${userId}`);
    await invalidateCache(`dashboard-${userId}`);
    console.log(`🧹 Invalidated cache for user ${userId}`);
  }
  
  return response.json();
}

// EXAMPLE 7: Bulk cache operations
export async function preloadUserData(userId) {
  const userPromises = [
    setCached(CacheKeys.USER_PROFILE(userId), await fetchUserAPI(userId), CacheTTL.USER_SESSION),
    setCached(CacheKeys.USER_PERMISSIONS(userId), await fetchPermissionsAPI(userId), CacheTTL.USER_SESSION),
  ];
  
  await Promise.all(userPromises);
  console.log(`🚀 Preloaded cache for user ${userId}`);
}

// EXAMPLE 8: Conditional caching based on data size
export async function fetchLargeDatasetServer(datasetId) {
  const cacheKey = `dataset-${datasetId}`;
  
  const data = await getOrSetCached(
    cacheKey,
    async () => {
      const response = await fetch(`/api/datasets/${datasetId}`);
      const data = await response.json();
      
      // Only cache if data is reasonable size
      if (JSON.stringify(data).length > 1024 * 1024) { // 1MB
        console.log('⚠️ Data too large for caching, serving fresh');
        return null; // Don't cache
      }
      
      return data;
    },
    CacheTTL.SHORT
  );
  
  return data;
}