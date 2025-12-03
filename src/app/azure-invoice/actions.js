// src/app/azure-invoice/actions.js
'use server';

import { getInitialAzureInvoiceData } from '@/lib/azureInvoiceApi';
import { cookies } from 'next/headers';
import { getOrSetCached, getCached, setCached } from '@/lib/cache/serverCache';
import { CacheKeys, CacheTTL } from '@/lib/cache/cacheKeys';

/**
 * Server action to fetch Azure Invoice data (OPTIMIZED)
 * This runs on the server and passes data to client components
 * @param {string} clientSoldToId - Optional soldToId from client-side auth
 */
export async function fetchAzureInvoiceDataServer(clientSoldToId = null) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Server Action: Fetching Azure Invoice data (OPTIMIZED)');
    
    // OPTIMIZATION: Fast auth check first
    const cookieStore = await cookies();
    console.log('🔍 Available cookies:', cookieStore.getAll().map(c => c.name));
    
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = null;
    
    // OPTIMIZATION: Try regular cookies first (fastest path)  
    let accessToken = null;
    if (accessTokenCookie && userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
        accessToken = accessTokenCookie.value;
        console.log('⚡ Server Action: Fast auth via regular cookies, soldToId:', soldToId);
        console.log('⚡ Server Action: Access token found:', !!accessToken);
      } catch (error) {
        console.log('⚠️ Server Action: Failed to parse user context cookie');
      }
    }
    
    // OPTIMIZATION: Only check Redux cookie if regular cookies failed
    if (!soldToId) {
      const reduxPersistCookie = cookieStore.get('persist:ccr-auth');
      if (reduxPersistCookie) {
        try {
          const persistedState = JSON.parse(reduxPersistCookie.value);
          if (persistedState.isAuthenticated && persistedState.loginResponse) {
            soldToId = persistedState.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId;
            // Also try to get access token from Redux persist if not found
            if (!accessToken && persistedState.accessToken) {
              accessToken = persistedState.accessToken;
              console.log('⚡ Server Action: Access token from Redux persist:', !!accessToken);
            }
            console.log('⚡ Server Action: Fallback auth via Redux persist, soldToId:', soldToId);
          }
        } catch (error) {
          console.log('⚠️ Server Action: Failed to parse Redux persist cookie');
        }
      }
    }
    
    // Use client-provided soldToId if available (from Redux store)
    if (!soldToId && clientSoldToId) {
      soldToId = clientSoldToId;
      console.log('✅ Server Action: Using Redux store soldToId:', soldToId);
    }
    
    // If still no authentication found, return error - NO FALLBACK TO TEST DATA
    if (!soldToId) {
      console.log('❌ Server Action: No authentication found - user must be properly logged in');
      return {
        error: 'Authentication required - please ensure you are logged in with valid credentials',
        data: null,
        debug: {
          errorMessage: 'No soldToId found from authenticated user session',
          fetchTime: new Date().toISOString(),
          clientSoldToId: clientSoldToId,
          availableCookies: cookieStore.getAll().map(c => c.name),
          note: 'User must be properly authenticated through the login system'
        }
      };
    }

    const authTime = Date.now() - startTime;
    console.log(`⚡ Server Action: Auth check completed in ${authTime}ms, checking cache for soldToId: ${soldToId}`);
    
    // OPTIMIZATION: Use cache with 5-minute TTL for performance
    const cacheKey = `azure-invoice-data:${soldToId}`;
    console.log(`🗂️ Server Action: Using cache key: ${cacheKey}`);
    
    const dataStartTime = Date.now();
    const azureInvoiceData = await getOrSetCached(
      cacheKey,
      async () => {
        console.log(`🔄 Server Action: Cache MISS - fetching fresh data for ${soldToId}`);
        return await getInitialAzureInvoiceData({ 
          soldToId,
          accessToken
        });
      },
      CacheTTL.AZURE_INVOICE_DATA // 5 minutes
    );
    const dataTime = Date.now() - dataStartTime;
    
    const cacheStatus = azureInvoiceData._fromCache ? 'HIT' : 'MISS';
    console.log(`✅ Server Action: Data served from cache ${cacheStatus} in ${dataTime}ms`);
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Server Action: Data served in ${totalTime}ms`);
    console.log('📋 Server Action: Invoice Months:', azureInvoiceData.invoiceMonths?.length || 0);
    console.log('📋 Server Action: Summary:', !!azureInvoiceData.summary);
    console.log('📋 Server Action: Credits:', !!azureInvoiceData.credits);
    console.log('📋 Server Action: Trend:', !!azureInvoiceData.trend);
    
    return {
      error: null,
      data: azureInvoiceData,
      debug: {
        soldToId,
        fetchTime: new Date().toISOString(),
        dataKeys: Object.keys(azureInvoiceData),
        invoiceMonthsCount: azureInvoiceData.invoiceMonths?.length || 0,
        authTime: `${authTime}ms`,
        totalTime: `${totalTime}ms`,
        cacheKey: cacheKey,
        cacheStatus: cacheStatus
      }
    };
    
  } catch (error) {
    console.error('❌ Server Action: Error fetching Azure Invoice data:', error);
    return {
      error: error.message,
      data: null,
      debug: {
        errorMessage: error.message,
        errorStack: error.stack,
        fetchTime: new Date().toISOString()
      }
    };
  }
}

/**
 * Fast authentication check (no data fetching)
 * Used for immediate page rendering
 */
export async function checkAuthenticationServer() {
  try {
    console.log('🔍 Auth Check: Quick authentication verification');
    
    const cookieStore = await cookies();
    
    // Check for regular auth cookies (access_token, user_context)
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    // Check for Redux persist cookie
    const reduxPersistCookie = cookieStore.get('persist:ccr-auth');
    
    let soldToId = null;
    
    // Try regular cookies first
    if (accessTokenCookie && userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
        console.log('✅ Auth Check: Valid regular auth cookies found');
      } catch (error) {
        console.log('⚠️ Auth Check: Failed to parse regular cookies');
      }
    }
    
    // Try Redux persist cookie as fallback
    if (!soldToId && reduxPersistCookie) {
      try {
        const persistedState = JSON.parse(reduxPersistCookie.value);
        if (persistedState.isAuthenticated && persistedState.loginResponse) {
          soldToId = persistedState.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId;
          console.log('✅ Auth Check: Valid Redux persist cookie found');
        }
      } catch (error) {
        console.log('⚠️ Auth Check: Failed to parse Redux persist cookie');
      }
    }
    
    if (!soldToId) {
      console.log('❌ Auth Check: No valid authentication found');
      return {
        error: 'Authentication required - please log in first',
        authenticated: false,
        debug: {
          reason: 'No valid authentication cookies found',
          checkTime: new Date().toISOString()
        }
      };
    }
    
    console.log('✅ Auth Check: Authentication valid');
    return {
      error: null,
      authenticated: true,
      soldToId,
      debug: {
        checkTime: new Date().toISOString(),
        authMethod: accessTokenCookie ? 'regular_cookies' : 'redux_persist'
      }
    };
    
  } catch (error) {
    console.error('❌ Auth Check: Error during authentication check:', error);
    return {
      error: 'Authentication check failed',
      authenticated: false,
      debug: {
        errorMessage: error.message,
        checkTime: new Date().toISOString()
      }
    };
  }
}

/**
 * Server action to fetch UI properties (OPTIMIZED)
 */
export async function fetchUiPropertiesServer() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Server Action: Fetching UI Properties (OPTIMIZED)');
    
    // OPTIMIZATION: Import and fetch with timing
    const { getUiProperties } = await import('@/lib/server-config');
    const uiProperties = await getUiProperties();
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ Server Action: UI Properties fetched in ${fetchTime}ms`);
    
    return {
      error: null,
      data: uiProperties || { CCR_ARCHERA_URL: '', flags: {} },
      debug: {
        fetchTime: new Date().toISOString(),
        dataKeys: Object.keys(uiProperties || {}),
        hasData: !!uiProperties,
        duration: `${fetchTime}ms`
      }
    };
    
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error(`❌ Server Action: UI Properties error in ${fetchTime}ms:`, error);
    return {
      error: error.message,
      data: { CCR_ARCHERA_URL: '', flags: {} }, // Fallback data
      debug: {
        errorMessage: error.message,
        fetchTime: new Date().toISOString(),
        duration: `${fetchTime}ms`
      }
    };
  }
}