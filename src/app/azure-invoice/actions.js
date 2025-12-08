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
/**
 * Fetch only invoice months data
 */
export async function fetchInvoiceMonthsServer(clientSoldToId = null) {
  // Similar auth logic but return only months
  try {
    console.log('🚀 Server Action: Fetching Invoice Months');
    const cookieStore = await cookies();
    
    // Debug all available cookies
    const allCookies = cookieStore.getAll();
    console.log('🔍 All available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));
    
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    console.log('🔍 Server-side cookie debug:', {
      accessTokenCookie: accessTokenCookie ? 'found' : 'not found',
      userContextCookie: userContextCookie ? 'found' : 'not found',
      clientSoldToId
    });
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    // Try to get from cookies first, then fall back to client params
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
      console.log('✅ Access token found in cookies');
    }
    
    if (userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId || clientSoldToId;
        console.log('✅ User context found in cookies, soldToId:', soldToId);
      } catch (parseError) {
        console.error('❌ Failed to parse user context cookie:', parseError);
      }
    }
    
    // Final validation
    if (!soldToId) {
      console.error('❌ No soldToId available from cookies or client');
      return { error: 'Authentication required for months data - no soldToId', data: null };
    }
    
    if (!accessToken) {
      console.error('❌ No access token available from cookies');
      return { error: 'Authentication required for months data - no access token', data: null };
    }
    
    console.log('🔍 Using auth data:', { soldToId, hasAccessToken: !!accessToken });
    
    const data = await getInitialAzureInvoiceData({ soldToId, accessToken });
    console.log('🔍 getInitialAzureInvoiceData returned:', JSON.stringify(data, null, 2));
    console.log('🔍 invoiceMonths extracted:', data?.invoiceMonths);
    return { 
      error: null, 
      data: { 
        invoiceMonths: data?.invoiceMonths || [] 
      } 
    };
  } catch (error) {
    console.error('❌ fetchInvoiceMonthsServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch invoice months', 
      data: null 
    };
  }
}

/**
 * Fetch summary data for selected month
 */
export async function fetchSummaryDataServer(clientSoldToId = null, selectedMonth = null) {
  try {
    console.log('🚀 Server Action: Fetching Summary Data for month:', selectedMonth);
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    // Get access token from cookies
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
    // Get soldToId from cookies if not provided by client
    if (!soldToId && userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
      } catch (parseError) {
        console.error('❌ Failed to parse user context for summary:', parseError);
      }
    }
    
    if (!soldToId || !accessToken) {
      return { error: 'Authentication required for summary data', data: null };
    }
    
    const data = await getInitialAzureInvoiceData({ soldToId, accessToken, locationState: { currentMonthObject: selectedMonth } });
    return { 
      error: null, 
      data: data?.summary || null
    };
  } catch (error) {
    console.error('❌ fetchSummaryDataServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch summary data', 
      data: null 
    };
  }
}

/**
 * Fetch credits data for selected month
 */
export async function fetchCreditsDataServer(clientSoldToId = null, selectedMonth = null) {
  try {
    console.log('🚀 Server Action: Fetching Credits Data for month:', selectedMonth);
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    // Get access token from cookies
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
    // Get soldToId from cookies if not provided by client
    if (!soldToId && userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
      } catch (parseError) {
        console.error('❌ Failed to parse user context for credits:', parseError);
      }
    }
    
    if (!soldToId || !accessToken) {
      return { error: 'Authentication required for credits data', data: null };
    }
    
    const data = await getInitialAzureInvoiceData({ soldToId, accessToken, locationState: { currentMonthObject: selectedMonth } });
    return { 
      error: null, 
      data: data?.credits || null
    };
  } catch (error) {
    console.error('❌ fetchCreditsDataServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch credits data', 
      data: null 
    };
  }
}

/**
 * Fetch trends data for selected month
 */
export async function fetchTrendsDataServer(clientSoldToId = null, selectedMonth = null) {
  try {
    console.log('🚀 Server Action: Fetching Trends Data for month:', selectedMonth);
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    // Get access token from cookies
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
    // Get soldToId from cookies if not provided by client
    if (!soldToId && userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
      } catch (parseError) {
        console.error('❌ Failed to parse user context for trends:', parseError);
      }
    }
    
    if (!soldToId || !accessToken) {
      return { error: 'Authentication required for trends data', data: null };
    }
    
    const data = await getInitialAzureInvoiceData({ soldToId, accessToken, locationState: { currentMonthObject: selectedMonth } });
    return { 
      error: null, 
      data: data?.trend || null
    };
  } catch (error) {
    console.error('❌ fetchTrendsDataServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch trends data', 
      data: null 
    };
  }
}

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
 * Server action to fetch Azure Invoice data for a specific selected month
 * @param {string} clientSoldToId - soldToId from client-side auth
 * @param {object} selectedMonth - The selected month object {text, value, date}
 */
export async function fetchAzureInvoiceDataForMonth(clientSoldToId, selectedMonth) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Server Action: Fetching Azure Invoice data for selected month:', selectedMonth);
    
    // OPTIMIZATION: Fast auth check first
    const cookieStore = await cookies();
    
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = null;
    let accessToken = null;
    
    // OPTIMIZATION: Try regular cookies first (fastest path)  
    if (accessTokenCookie && userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
        accessToken = accessTokenCookie.value;
        console.log('⚡ Server Action: Fast auth via regular cookies, soldToId:', soldToId);
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
            if (!accessToken && persistedState.accessToken) {
              accessToken = persistedState.accessToken;
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
    
    // If still no authentication found, return error
    if (!soldToId) {
      console.log('❌ Server Action: No authentication found - user must be properly logged in');
      return {
        error: 'Authentication required - please ensure you are logged in with valid credentials',
        data: null
      };
    }
    
    if (!selectedMonth || !selectedMonth.value) {
      return {
        error: 'Selected month is required',
        data: null
      };
    }
    
    // Import the specific API functions we need
    const { fetchInvoiceSummary, fetchInvoiceCredits, fetchInvoiceTrend } = await import('@/lib/azureInvoiceApi');
    
    const currentMonthValue = selectedMonth.value;
    const filterQuery = [];
    const trendFilter = "";
    
    console.log(`🔄 Server Action: Fetching data for month ${currentMonthValue} with soldToId: ${soldToId}`);
    
    // Parallel API calls for the selected month
    const [summary, credits, trend] = await Promise.allSettled([
      fetchInvoiceSummary({ soldToId, value: currentMonthValue, filter: filterQuery, accessToken }),
      fetchInvoiceCredits({ soldToId, value: currentMonthValue, filter: filterQuery, accessToken }),
      fetchInvoiceTrend({ soldToId, months: 6, filter: trendFilter, accessToken }),
    ]);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Server Action: Month-specific data fetched in ${totalTime}ms`);
    console.log('🔍 API Results:', {
      summary: summary.status === 'fulfilled' ? 'SUCCESS' : `ERROR: ${summary.reason}`,
      credits: credits.status === 'fulfilled' ? 'SUCCESS' : `ERROR: ${credits.reason}`,
      trend: trend.status === 'fulfilled' ? 'SUCCESS' : `ERROR: ${trend.reason}`,
    });

    // Log actual response data
    if (summary.status === 'fulfilled') {
      console.log('📊 SUMMARY API RESPONSE:', JSON.stringify(summary.value, null, 2));
    }
    if (credits.status === 'fulfilled') {
      console.log('💰 CREDITS API RESPONSE:', JSON.stringify(credits.value, null, 2));
    }
    if (trend.status === 'fulfilled') {
      console.log('📈 TREND API RESPONSE:', JSON.stringify(trend.value, null, 2));
    }

    return {
      error: null,
      data: {
        currentMonthObject: selectedMonth,
        usageMonth: currentMonthValue,
        summary: summary.status === 'fulfilled' ? summary.value : null,
        credits: credits.status === 'fulfilled' ? credits.value : null,
        trend: trend.status === 'fulfilled' ? trend.value : null,
      },
      debug: {
        soldToId,
        selectedMonth,
        fetchTime: new Date().toISOString(),
        totalTime: `${totalTime}ms`,
      }
    };
    
  } catch (error) {
    console.error('❌ Server Action: Error fetching month-specific data:', error);
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