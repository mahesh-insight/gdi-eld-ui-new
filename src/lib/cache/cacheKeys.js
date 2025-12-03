// src/lib/cache/cacheKeys.js
/**
 * Centralized cache key management
 * Prevents key conflicts and provides consistent naming
 */

export const CacheKeys = {
  // User-related caches
  USER_PROFILE: (userId) => `user-profile-${userId}`,
  USER_PERMISSIONS: (userId) => `user-permissions-${userId}`,
  USER_PREFERENCES: (userId) => `user-preferences-${userId}`,

  // Azure Invoice caches
  AZURE_INVOICE: (soldToId) => `azure-invoice-${soldToId}`,
  AZURE_SUMMARY: (soldToId, month) => `azure-summary-${soldToId}-${month}`,
  AZURE_TREND: (soldToId, months) => `azure-trend-${soldToId}-${months}`,

  // Dashboard caches
  DASHBOARD_DATA: (userId, soldToId) => `dashboard-${userId}-${soldToId}`,
  DASHBOARD_WIDGETS: (userId) => `dashboard-widgets-${userId}`,

  // Reports caches
  REPORT_DATA: (type, userId, params) => `report-${type}-${userId}-${JSON.stringify(params).slice(0, 50)}`,
  
  // Configuration caches
  UI_PROPERTIES: () => `ui-properties`,
  APP_CONFIG: () => `app-config`,
  FEATURE_FLAGS: () => `feature-flags`,

  // Time-based caches (for data that changes periodically)
  HOURLY: (key) => `${key}-${Math.floor(Date.now() / (60 * 60 * 1000))}`,
  DAILY: (key) => `${key}-${Math.floor(Date.now() / (24 * 60 * 60 * 1000))}`,

  // Session-based caches
  SESSION: (sessionId, key) => `session-${sessionId}-${key}`,
};

export const CacheTTL = {
  VERY_SHORT: 1 * 60 * 1000,      // 1 minute
  SHORT: 5 * 60 * 1000,           // 5 minutes (default)
  MEDIUM: 30 * 60 * 1000,         // 30 minutes
  LONG: 2 * 60 * 60 * 1000,       // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
  
  // Specific use cases
  USER_SESSION: 30 * 60 * 1000,   // 30 minutes
  API_RESPONSE: 5 * 60 * 1000,    // 5 minutes
  CONFIGURATION: 60 * 60 * 1000,  // 1 hour
  REPORTS: 15 * 60 * 1000,        // 15 minutes
};