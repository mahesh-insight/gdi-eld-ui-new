// src/app/azure-invoice/actions.js
'use server';

import { getInitialAzureInvoiceData } from '@/lib/azureInvoiceApi';
import { cookies } from 'next/headers';
import { getOrSetCached, getCached, setCached } from '@/lib/cache/serverCache';
import { CacheKeys, CacheTTL } from '@/lib/cache/cacheKeys';

/**
 * Consolidated Azure Invoice data fetching (SERVER ACTION)
 * This function fetches ALL data needed for the page in one cached operation
 * Similar to how invoices page works for consistent behavior
 */
export async function fetchConsolidatedAzureInvoiceData(accessToken, soldToId, selectedMonth = null, customerFilter = null, trendMonths = 6) {
  try {
    // If no accessToken provided, try to get from cookies as fallback
    let finalAccessToken = accessToken;
    if (!finalAccessToken) {
      const cookieStore = await cookies();
      const accessTokenCookie = cookieStore.get('access_token');
      finalAccessToken = accessTokenCookie?.value;
    }
    
    if (!finalAccessToken) {
      return {
        error: 'Access token not found',
        data: null,
        cached: false
      };
    }
    
    
    // Create cache key for consolidated data (similar to invoices page)
    const monthValue = selectedMonth || 'current';
    const cacheKey = `azure-consolidated:${soldToId}:${monthValue}:${customerFilter || 'all'}:trend${trendMonths}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 SERVER ACTION: Cache MISS - making SINGLE consolidated API call');
        
        // If selectedMonth is provided, fetch month-specific data (doesn't refetch invoiceMonths)
        if (selectedMonth) {
          const moment = (await import("moment")).default;
          const services = await import('@/lib/api/services');
          
          // Calculate previous month for monthly difference
          const currentDate = new Date(`${selectedMonth.substring(0, 4)}-${selectedMonth.substring(4, 6)}-01`);
          const prevMonth = moment(currentDate).subtract(1, "month").format("YYYYMM");
          
          console.log('📅 SERVER ACTION: Month-specific fetch for:', selectedMonth, 'prev:', prevMonth);
          
          // Build filter parameter for customer filtering
          let filterParam = '';
          if (customerFilter && customerFilter !== 'All' && customerFilter !== 'all') {
            filterParam = `?filter=limittenantid%3D${encodeURIComponent(customerFilter)}`;
            console.log('🔍 SERVER ACTION: Applying customer filter:', filterParam);
          }
          
          // Get base URL from services config
          const serviceConfig = services.default.getService('invoiceSummary');
          const baseURL = serviceConfig.baseURL || process.env.NEXT_PUBLIC_API_BASE_URL;
          
          // Make all 5 API calls in parallel on the SERVER
          const [summary, credits, trend, monthDetail, monthlyDifference] = await Promise.allSettled([
            // Invoice Summary
            fetch(`${baseURL}/ccr-invoice-service/summary/${selectedMonth}${filterParam}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalAccessToken}`
              },
              body: JSON.stringify([soldToId]),
              cache: 'no-store'
            }).then(res => res.ok ? res.json() : Promise.reject(new Error(`Summary: ${res.status}`))),
            
            // Invoice Credits (total with creditsonly=true)
            fetch(`${baseURL}/ccr-invoice-service/total/${selectedMonth}?creditsonly=true${filterParam ? '&' + filterParam.substring(1) : ''}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalAccessToken}`
              },
              body: JSON.stringify([soldToId]),
              cache: 'no-store'
            }).then(res => res.ok ? res.json() : Promise.reject(new Error(`Credits: ${res.status}`))),
            
            // Invoice Trend
            fetch(`${baseURL}/ccr-invoice-service/trend?months=${trendMonths}&limit=6${filterParam ? '&' + filterParam.substring(1) : ''}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalAccessToken}`
              },
              body: JSON.stringify([soldToId]),
              cache: 'no-store'
            }).then(res => res.ok ? res.json() : Promise.reject(new Error(`Trend: ${res.status}`))),
            
            // Month Detail (for grid tab 1)
            fetch(`${baseURL}/ccr-invoice-service/month/${selectedMonth}?page=0&size=20${filterParam ? '&' + filterParam.substring(1) : ''}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalAccessToken}`
              },
              body: JSON.stringify([soldToId]),
              cache: 'no-store'
            }).then(res => res.ok ? res.json() : Promise.reject(new Error(`MonthDetail: ${res.status}`))),
            
            // Monthly Difference (for grid tab 2)
            fetch(`${baseURL}/ccr-invoice-service/month/sku-difference/${prevMonth}/${selectedMonth}?page=0&size=20${filterParam ? '&' + filterParam.substring(1) : ''}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalAccessToken}`
              },
              body: JSON.stringify([soldToId]),
              cache: 'no-store'
            }).then(res => res.ok ? res.json() : Promise.reject(new Error(`MonthlyDiff: ${res.status}`))),
          ]);
          
          console.log('✅ SERVER ACTION: All 5 parallel API calls completed');
          
          return {
            pageExistsError: false,
            summary: summary.status === 'fulfilled' ? summary.value : null,
            credits: credits.status === 'fulfilled' ? credits.value : null,
            trend: trend.status === 'fulfilled' ? trend.value : null,
            monthDetail: monthDetail.status === 'fulfilled' ? monthDetail.value : null,
            monthlyDifference: monthlyDifference.status === 'fulfilled' ? monthlyDifference.value : null,
          };
        }
        
        // Initial load - fetch everything including invoiceMonths
        console.log('📅 SERVER ACTION: Initial load - fetching all data including months');
        return await getInitialAzureInvoiceData({ 
          soldToId, 
          accessToken: finalAccessToken,
          locationState: null
        });
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('✅ SERVER ACTION: Consolidated data served:', data._fromCache ? 'CACHE HIT' : 'API CALL');
    return { 
      error: null, 
      data,
      cached: data._fromCache
    };
  } catch (error) {
    console.error('❌ SERVER ACTION: fetchConsolidatedAzureInvoiceData error:', error);
    return { 
      error: error?.message || 'Failed to fetch consolidated Azure Invoice data', 
      data: null,
      cached: false
    };
  }
}

/**
 * Server action to fetch Azure Invoice data (OPTIMIZED)
 * This runs on the server and passes data to client components
 * @param {string} clientSoldToId - Optional soldToId from client-side auth
 */
/**
 * Fetch only invoice months data
 */
export async function fetchInvoiceMonthsServer(clientSoldToId = null) {
  try {
    console.log('🚀 Server Action: Fetching Invoice Months');
    const cookieStore = await cookies();
    
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    const soldToIdCookie = cookieStore.get('soldToId');
    
    // Fix soldToId - ensure it's a string, not an array
    let soldToId = clientSoldToId || soldToIdCookie?.value;
    if (Array.isArray(soldToId)) {
      soldToId = soldToId[0]; // Extract string from array
    }
    
    let accessToken = null;
    
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
      console.log('🔍 Raw access token from cookie:', typeof accessToken, accessToken?.length || 0);
    }
    
    // If no direct soldToId, try to extract from user_context  
    if (!soldToId && userContextCookie) {
      try {
        const userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
        soldToId = userContext?.userProfile?.defaultContext?.[0]?.soldToId || userContext?.soldToId;
      } catch (parseError) {
        console.error('❌ Failed to parse user context cookie:', parseError);
      }
    }
    
    console.log('🔑 Authentication available:', {
      soldToId,
      accessTokenLength: accessToken?.length || 0,
      accessTokenPrefix: accessToken?.substring(0, 2) + '...'
    });
    
    if (!soldToId || !accessToken || accessToken === '{}' || accessToken.length < 100) {
      console.error('❌ Missing or invalid authentication:', { 
        hasSoldToId: !!soldToId, 
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0,
        accessTokenValue: accessToken,
        soldToId 
      });
      return { error: 'Authentication required for months data', data: null };
    }
    
    console.log('🔑 Authentication available:', { 
      soldToId, 
      accessTokenLength: accessToken?.length || 0,
      accessTokenPrefix: (accessToken && typeof accessToken === 'string') ? accessToken.substring(0, 20) + '...' : 'None'
    });
    
    // Use cache with 10-minute TTL
    const cacheKey = `azure-invoice-months:${soldToId}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching months from API');
        return await getInitialAzureInvoiceData({ soldToId, accessToken });
      },
      10 * 60 * 1000 // 10 minutes
    );
    
    console.log('✅ Months data served from cache:', data._fromCache ? 'HIT' : 'MISS');
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
 * Consolidated function to fetch all data for a month (summary, credits, trends)
 */
export async function fetchAzureInvoiceDataForMonth(clientSoldToId = null, selectedMonth = null) {
  try {
    const monthValue = typeof selectedMonth === 'string' ? selectedMonth : selectedMonth?.value;
    console.log('🚀 Server Action: Fetching ALL data for month:', monthValue, 'soldToId:', clientSoldToId);
    
    // Handle authentication once at this level
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
    if (!soldToId && userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
      } catch (parseError) {
        console.error('❌ Failed to parse user context for consolidated fetch:', parseError);
      }
    }
    
    if (!soldToId || !accessToken) {
      console.error('❌ Consolidated fetch: Missing auth - soldToId:', !!soldToId, 'accessToken:', !!accessToken);
      return { 
        error: 'Authentication required for month data', 
        data: { summary: null, credits: null, trend: null } 
      };
    }
    
    // Import the individual Azure Invoice API functions directly to bypass getInitialAzureInvoiceData
    const { fetchInvoiceSummary, fetchInvoiceCredits, fetchInvoiceTrend } = await import('@/lib/azureInvoiceApi');
    
    console.log('🔄 Consolidated fetch: Calling individual APIs with soldToId:', soldToId, 'month:', selectedMonth);
    console.log('📅 Using month value:', monthValue);
    
    if (!monthValue) {
      console.error('❌ No month value available');
      return { 
        error: 'Month value required', 
        data: { summary: null, credits: null, trend: null } 
      };
    }
    
    // Call the individual APIs directly with proper parameters
    console.log('🔄 Making API calls with params:', {
      soldToId,
      monthValue,
      hasAccessToken: !!accessToken
    });
    
    const [summary, credits, trend] = await Promise.allSettled([
      fetchInvoiceSummary({ soldToId, value: monthValue, filter: [], accessToken }),
      fetchInvoiceCredits({ soldToId, value: monthValue, filter: [], accessToken }),
      fetchInvoiceTrend({ soldToId, months: 6, filter: "", accessToken }),
    ]);
    
    // Log individual results for debugging
    console.log('🔍 Individual API results:', {
      summary: {
        status: summary.status,
        hasValue: !!summary.value,
        error: summary.status === 'rejected' ? summary.reason : null,
        data: summary.status === 'fulfilled' ? summary.value : null
      },
      credits: {
        status: credits.status,
        hasValue: !!credits.value,
        error: credits.status === 'rejected' ? credits.reason : null,
        data: credits.status === 'fulfilled' ? credits.value : null
      },
      trend: {
        status: trend.status,
        hasValue: !!trend.value,
        error: trend.status === 'rejected' ? trend.reason : null,
        data: trend.status === 'fulfilled' ? trend.value : null
      }
    });
    
    // Process results
    const azureData = {
      summary: summary.status === 'fulfilled' ? summary.value : null,
      credits: credits.status === 'fulfilled' ? credits.value : null,  
      trend: trend.status === 'fulfilled' ? trend.value : null
    };
    
    console.log('✅ Consolidated fetch: Azure API response:', {
      hasSummary: !!azureData?.summary,
      hasCredits: !!azureData?.credits,
      hasTrend: !!azureData?.trend
    });
    
    return {
      error: null,
      data: {
        summary: azureData?.summary || null,
        credits: azureData?.credits || null,
        trend: azureData?.trend || null
      }
    };
  } catch (error) {
    console.error('❌ fetchAzureInvoiceDataForMonth error:', error);
    return {
      error: error?.message || 'Failed to fetch month data',
      data: { summary: null, credits: null, trend: null }
    };
  }
}

/**
 * Fetch summary data for selected month
 */
export async function fetchSummaryDataServer(clientSoldToId = null, selectedMonth = null) {
  try {
    // Handle month parameter - can be string or object
    const monthValue = typeof selectedMonth === 'string' ? selectedMonth : selectedMonth?.value;
    console.log('🚀 Server Action: Fetching Summary Data for month:', monthValue);
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
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
    
    // Use cache with month-specific key and 10-minute TTL
    const monthKey = monthValue || 'default';
    const cacheKey = `azure-summary:${soldToId}:${monthKey}`;
    
    // TEMPORARY: Clear cache to force fresh fetch for debugging summary issue
    const { getCache } = await import('@/lib/cache/serverCache');
    const cache = getCache();
    console.log('🧹 Summary: Clearing cache for key:', cacheKey);
    await cache.delete(cacheKey);
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching summary from API (forced fresh)');
        // Create month object for API call - SAME AS CREDITS AND TRENDS
        const monthObject = typeof selectedMonth === 'string' ? { value: selectedMonth } : selectedMonth;
        console.log('🔧 Summary: Creating month object:', {
          original: selectedMonth,
          originalType: typeof selectedMonth,
          monthObject: monthObject
        });
        return await getInitialAzureInvoiceData({ soldToId, accessToken, locationState: { currentMonthObject: monthObject } });
      },
      10 * 60 * 1000 // 10 minutes
    );
    
    console.log('✅ Summary data served from cache:', data._fromCache ? 'HIT' : 'MISS');
    console.log('🔍🔍🔍 SUMMARY DEBUG - getInitialAzureInvoiceData returned:', {
      hasData: !!data,
      keys: data ? Object.keys(data) : 'none',
      hasSummary: !!data?.summary,
      summaryType: typeof data?.summary,
      summaryValue: data?.summary,
      pageExistsError: data?.pageExistsError
    });
    return { 
      error: null, 
      data: data?.summary || null,
      success: true
    };
  } catch (error) {
    console.error('❌ fetchSummaryDataServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch summary data', 
      data: null,
      success: false
    };
  }
}

/**
 * Fetch credits data for selected month
 */
export async function fetchCreditsDataServer(clientSoldToId = null, selectedMonth = null) {
  try {
    // Handle month parameter - can be string or object
    const monthValue = typeof selectedMonth === 'string' ? selectedMonth : selectedMonth?.value;
    console.log('🚀 Server Action: Fetching Credits Data for month:', monthValue);
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
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
    
    // Use cache with month-specific key and 10-minute TTL
    const monthKey = monthValue || 'default';
    const cacheKey = `azure-credits:${soldToId}:${monthKey}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching credits from API');
        // Create month object for API call
        const monthObject = typeof selectedMonth === 'string' ? { value: selectedMonth } : selectedMonth;
        return await getInitialAzureInvoiceData({ soldToId, accessToken, locationState: { currentMonthObject: monthObject } });
      },
      10 * 60 * 1000 // 10 minutes
    );
    
    console.log('✅ Credits data served from cache:', data._fromCache ? 'HIT' : 'MISS');
    return { 
      error: null, 
      data: data?.credits || null,
      success: true
    };
  } catch (error) {
    console.error('❌ fetchCreditsDataServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch credits data', 
      data: null,
      success: false
    };
  }
}

/**
 * Fetch trends data
 */
export async function fetchTrendsDataServer(clientSoldToId = null, selectedMonth = null) {
  try {
    // Handle month parameter - can be string or object
    const monthValue = typeof selectedMonth === 'string' ? selectedMonth : selectedMonth?.value;
    console.log('🚀 Server Action: Fetching Trends Data for month:', monthValue);
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
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
    
    // Use cache with month-specific key and 10-minute TTL
    const monthKey = monthValue || 'default';
    const cacheKey = `azure-trends:${soldToId}:${monthKey}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching trends from API');
        // Create month object for API call
        const monthObject = typeof selectedMonth === 'string' ? { value: selectedMonth } : selectedMonth;
        return await getInitialAzureInvoiceData({ soldToId, accessToken, locationState: { currentMonthObject: monthObject } });
      },
      10 * 60 * 1000 // 10 minutes
    );
    
    console.log('✅ Trends data served from cache:', data._fromCache ? 'HIT' : 'MISS');
    return { 
      error: null, 
      data: data?.trend || null,
      success: true
    };
  } catch (error) {
    console.error('❌ fetchTrendsDataServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch trends data', 
      data: null,
      success: false
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
    
    // OPTIMIZATION: Use cache with 10-minute TTL for performance
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

/**
 * Fetch invoice details for a specific month
 */
export async function fetchInvoiceDetailsServer(clientSoldToId = null, monthValue = null) {
  try {
    console.log('🚀 Server Action: Fetching Invoice Details for month:', monthValue);
    const cookieStore = await cookies();
    
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
    if (userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId || clientSoldToId;
      } catch (parseError) {
        console.error('❌ Failed to parse user context cookie:', parseError);
      }
    }
    
    if (!soldToId || !accessToken || !monthValue) {
      return { error: 'Missing required parameters for invoice details', data: null };
    }
    
    // Call the invoice month detail API
    const cacheKey = `azure-invoice-details:${soldToId}:${monthValue}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching invoice details from API');
        // Import azureInvoiceApi here to avoid circular dependencies
        const { callAzureInvoiceAPI } = await import('../../lib/azureInvoiceApi');
        
        // Format month value for API (202512 format)
        const formattedMonth = monthValue.replace('-', '');
        const apiUrl = `/ccr-invoice-service/month/${formattedMonth}?page=0&size=20`;
        
        console.log('🌐 Calling invoice details API:', apiUrl);
        console.log('🔍 Server parameters:', {
          soldToId: soldToId,
          soldToIdType: typeof soldToId,
          soldToIdIsArray: Array.isArray(soldToId),
          monthValue: monthValue,
          formattedMonth: formattedMonth,
          accessToken: !!accessToken
        });
        
        // Ensure soldToId is always an array and contains valid data
        const soldToArray = Array.isArray(soldToId) ? soldToId : [soldToId];
        console.log('🔍 Processed soldToArray:', soldToArray);
        
        const apiPayload = {
          payload: soldToArray,
          urlParam: `${formattedMonth}?page=0&size=20`
        };
        
        console.log('🔍 Final API Payload for invoiceMonthDetail:', apiPayload);
        console.log('🔍 About to call callAzureInvoiceAPI with:', {
          serviceName: 'invoiceMonthDetail',
          payload: apiPayload,
          hasAccessToken: !!accessToken
        });
        
        // Call the actual API
        const response = await callAzureInvoiceAPI('invoiceMonthDetail', apiPayload, accessToken);
        
        console.log('🔍 Raw API Response from callAzureInvoiceAPI:', response);
        console.log('🔍 Response type:', typeof response);
        console.log('🔍 Response keys:', response ? Object.keys(response) : 'no response');
        
        return response || {
          content: [],
          pageNumber: 0,
          pageSize: 20,
          totalElements: 0,
          totalPages: 1
        };
      },
      5 * 60 * 1000 // 5 minutes cache
    );
    
    console.log('✅ Invoice details served from cache:', data._fromCache ? 'HIT' : 'MISS');
    return { 
      error: null, 
      data 
    };
  } catch (error) {
    console.error('❌ fetchInvoiceDetailsServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch invoice details', 
      data: null 
    };
  }
}

/**
 * Fetch monthly difference data
 */
export async function fetchMonthlyDifferenceServer(clientSoldToId = null, currentMonth = null, previousMonth = null) {
  try {
    console.log('🚀 Server Action: Fetching Monthly Difference:', currentMonth, 'vs', previousMonth);
    const cookieStore = await cookies();
    
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = clientSoldToId;
    let accessToken = null;
    
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.value;
    }
    
    if (userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId || clientSoldToId;
      } catch (parseError) {
        console.error('❌ Failed to parse user context cookie:', parseError);
      }
    }
    
    if (!soldToId || !accessToken || !currentMonth || !previousMonth) {
      return { error: 'Missing required parameters for monthly difference', data: null };
    }
    
    // Call the monthly difference API
    const cacheKey = `azure-monthly-difference:${soldToId}:${currentMonth}:${previousMonth}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching monthly difference from API');
        // Import azureInvoiceApi here to avoid circular dependencies
        const { callAzureInvoiceAPI } = await import('../../lib/azureInvoiceApi');
        
        const apiUrl = `/ccr-invoice-service/month/sku-difference/${previousMonth}/${currentMonth}?page=0&size=20`;
        
        console.log('🌐 Calling monthly difference API:', apiUrl);
        console.log('🔍 Server parameters:', {
          soldToId: soldToId,
          soldToIdType: typeof soldToId,
          soldToIdIsArray: Array.isArray(soldToId),
          currentMonth: currentMonth,
          previousMonth: previousMonth,
          accessToken: !!accessToken
        });
        
        // Ensure soldToId is always an array and contains valid data
        const soldToArray = Array.isArray(soldToId) ? soldToId : [soldToId];
        console.log('🔍 Processed soldToArray:', soldToArray);
        
        const apiPayload = {
          payload: soldToArray,
          urlParam: `${previousMonth}/${currentMonth}?page=0&size=20`
        };
        
        console.log('🔍 Final API Payload for monthlyDifferenceDetail:', apiPayload);
        console.log('🔍 Expected full URL: /ccr-invoice-service/month/sku-difference/' + previousMonth + '/' + currentMonth + '?page=0&size=20');
        console.log('🔍 About to call callAzureInvoiceAPI with:', {
          serviceName: 'invoiceMonthlyDifferenceDetail',
          payload: apiPayload,
          hasAccessToken: !!accessToken
        });
        
        // Call the actual API
        const response = await callAzureInvoiceAPI('invoiceMonthlyDifferenceDetail', apiPayload, accessToken);
        
        console.log('🔍 Raw API Response from callAzureInvoiceAPI:', response);
        console.log('🔍 Response type:', typeof response);
        console.log('🔍 Response keys:', response ? Object.keys(response) : 'no response');
        
        return response || {
          content: [],
          pageNumber: 0,
          pageSize: 20,
          totalElements: 0,
          totalPages: 1
        };
      },
      5 * 60 * 1000 // 5 minutes cache
    );
    
    console.log('✅ Monthly difference served from cache:', data._fromCache ? 'HIT' : 'MISS');
    return { 
      error: null, 
      data 
    };
  } catch (error) {
    console.error('❌ fetchMonthlyDifferenceServer error:', error);
    return { 
      error: error?.message || 'Failed to fetch monthly difference', 
      data: null 
    };
  }
}