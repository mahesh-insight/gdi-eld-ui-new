// src/lib/cache/reduxCacheUtils.js
import store from '../../store/store';
import { clearCache, clearData, validateSession } from '../../store/azureInvoiceSlice';

/**
 * Redux Cache Management Utilities for Azure Invoice Data
 * Provides fast loading after page refresh/navigation in Next.js
 */

export const ReduxCacheUtils = {
  
  /**
   * Clear all Azure Invoice cache data
   * Use when user logs out or switches accounts
   */
  clearAllCache: () => {
    console.log('🧹 REDUX CACHE: Clearing all Azure Invoice cache');
    store.dispatch(clearData());
  },

  /**
   * Clear only month-specific cache data (keep base data)
   * Use when data might be stale but user session is still valid
   */
  clearMonthCache: () => {
    console.log('🧹 REDUX CACHE: Clearing month-specific cache');
    store.dispatch(clearCache());
  },

  /**
   * Validate current session and clear cache if session changed
   * @param {string} soldToId - Current user's soldToId
   * @returns {boolean} - True if session is valid, false if cache was cleared
   */
  validateAndClearIfNeeded: (soldToId) => {
    const state = store.getState();
    const cachedSoldToId = state.azureInvoice.cacheMetadata?.soldToId;
    
    if (cachedSoldToId && cachedSoldToId !== soldToId) {
      console.log('🧹 REDUX CACHE: Session changed, clearing cache', {
        cached: cachedSoldToId?.substring(0, 20) + '...',
        current: soldToId?.substring(0, 20) + '...'
      });
      store.dispatch(clearData());
      return false;
    }
    
    return true;
  },

  /**
   * Get cache statistics for debugging
   * @returns {object} Cache statistics
   */
  getCacheStats: () => {
    const state = store.getState();
    const azureData = state.azureInvoice;
    const cacheAge = azureData.cacheMetadata?.lastUpdated 
      ? Date.now() - azureData.cacheMetadata.lastUpdated 
      : null;
    
    return {
      hasCachedData: !!azureData.monthsData,
      cacheAge: cacheAge ? Math.floor(cacheAge / 60000) : null, // minutes
      cachedMonths: Object.keys(azureData.monthDataCache || {}),
      soldToId: azureData.cacheMetadata?.soldToId?.substring(0, 20) + '...' || 'N/A',
      chartDataCached: !!azureData.processedChartData?.invoiceBreakdownData?.length,
      selectListsCached: azureData.selectListOptions?.productCategory?.length > 1
    };
  },

  /**
   * Check if cache is valid for current session
   * @param {string} soldToId - Current user's soldToId
   * @param {number} maxAgeMinutes - Maximum cache age in minutes (default: 1 for testing)
   * @returns {boolean} True if cache is valid and can be used
   */
  isCacheValid: (soldToId, maxAgeMinutes = 1) => { // Changed from 30 to 1 minute for testing
    const state = store.getState();
    const azureData = state.azureInvoice;
    
    // Check session
    if (azureData.cacheMetadata?.soldToId !== soldToId) {
      return false;
    }
    
    // Check age
    if (!azureData.cacheMetadata?.lastUpdated) {
      return false;
    }
    
    const cacheAge = Date.now() - azureData.cacheMetadata.lastUpdated;
    const maxAge = maxAgeMinutes * 60 * 1000;
    
    return cacheAge < maxAge && !!azureData.monthsData;
  },

  /**
   * Pre-warm cache with SSR data for fast subsequent loads
   * Call this from server-side rendered pages
   */
  prewarmCache: (ssrData, userContext) => {
    console.log('🔥 REDUX CACHE: Pre-warming cache with SSR data');
    
    if (!userContext?.soldToId) {
      console.warn('⚠️ REDUX CACHE: No soldToId provided for cache prewarming');
      return;
    }

    // Validate session first
    store.dispatch(validateSession({ soldToId: userContext.soldToId }));
    
    // Store SSR data for fast access
    const { setInitialSSRData } = require('../../store/azureInvoiceSlice');
    store.dispatch(setInitialSSRData({
      monthsData: ssrData.monthsData,
      summaryData: ssrData.summaryData,
      creditsData: ssrData.creditsData,
      trendsData: ssrData.trendsData,
      userContext
    }));
    
    console.log('✅ REDUX CACHE: Cache pre-warmed for fast loading');
  },

  /**
   * Export cache data for debugging
   * @returns {object} Full cache data
   */
  exportCacheData: () => {
    const state = store.getState();
    return {
      azureInvoiceCache: state.azureInvoice,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Global cache clearing function for logout handlers
 * Attach to window for easy access from auth components
 */
export const clearAzureInvoiceCacheGlobal = () => {
  console.log('🌍 GLOBAL: Clearing Azure Invoice cache (called from logout)');
  ReduxCacheUtils.clearAllCache();
};

// Attach to window if in browser
if (typeof window !== 'undefined') {
  window.clearAzureInvoiceReduxCache = clearAzureInvoiceCacheGlobal;
  window.azureCacheUtils = ReduxCacheUtils;
}

export default ReduxCacheUtils;