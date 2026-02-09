// src/app/AzureBilledConsumptionDetail/actions.js
'use server';

import { cookies } from 'next/headers';
import { getOrSetCached, invalidateCache } from '@/lib/cache/serverCache';
import { CacheTTL } from '@/lib/cache/cacheKeys';
import { getService } from '@/lib/api/services';

/**
 * Consolidated fetch for Azure Billed Consumption Detail data
 * This combines multiple API calls into a single server action with caching
 * @param {string} soldToId - Customer's sold to ID
 * @param {string} invoiceMonth - Invoice month (e.g., '202508' for August 2025)
 * @param {object} filters - Filter parameters (productcategory, limittenantid, invoicenumber, consumptionMonth)
 */
export async function fetchConsolidatedBilledConsumptionData(soldToId, invoiceMonth, filters = {}) {
  // Extract consumption month from filters or calculate it
  const consumptionMonth = filters.consumptionMonth || (() => {
    const year = parseInt(invoiceMonth.substring(0, 4));
    const month = parseInt(invoiceMonth.substring(4, 6));
    let cYear = year;
    let cMonth = month - 1;
    if (cMonth === 0) {
      cMonth = 12;
      cYear = year - 1;
    }
    return `${cYear}${String(cMonth).padStart(2, '0')}`;
  })();
  
  // Remove consumptionMonth from filters for API calls
  const { consumptionMonth: _, ...apiFilters } = filters;
  try {
    console.log('🚀 Consolidated Billed Consumption Fetch:', { soldToId, invoiceMonth, consumptionMonth, filters });
    
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      console.error('❌ No access token found in cookies');
      return { error: 'Authentication required', data: null };
    }
    
    const accessToken = accessTokenCookie.value;
    console.log('🔑 Access token found, length:', accessToken?.length);
    
    // Build filter query parameters
    const filterParams = buildFilterParams(apiFilters);
    const filterQuery = filterParams.length > 0 ? `?${filterParams.join('&')}` : '';
    
    console.log('🔄 SERVER: Making consolidated API calls with:', { 
      invoiceMonth,
      consumptionMonth,
      filterQuery,
      filters: apiFilters,
      soldToId,
      filterParams
    });
    
    // Create cache key for consolidated data
    const cacheKey = `billed-consumption:${soldToId}:${invoiceMonth}:${consumptionMonth}:${JSON.stringify(apiFilters)}`;
    console.log('🔑 SERVER: Cache key:', cacheKey);
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        // Make all 4 API calls in parallel
        const [totalsResult, creditsResult, summaryResult, gridResult] = await Promise.allSettled([
          // 1. Daily Totals (Azure Usage Total) - uses CONSUMPTION month
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/daily/totals/${consumptionMonth}${filterQuery}`;
            console.log('API #1 TOTALS:', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (response.status === 401) {
              throw new Error('Authentication required - 401');
            }
            if (!response.ok) {
              throw new Error(`Totals API error: ${response.status}`);
            }
            return await response.json();
          })(),
          
          // 2. Invoice Credits - uses INVOICE month
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-invoice-service/total/${invoiceMonth}?creditsonly=true${filterQuery ? '&' + filterQuery.substring(1) : ''}`;
            console.log('API #2 CREDITS:', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (response.status === 401) {
              throw new Error('Authentication required - 401');
            }
            if (!response.ok) {
              throw new Error(`Credits API error: ${response.status}`);
            }
            return await response.json();
          })(),
          
          // 3. Daily Summary (for select lists and dropdown values) - uses CONSUMPTION month
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/daily/summary/${consumptionMonth}${filterQuery}`;
            console.log('API #3 SUMMARY:', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (response.status === 401) {
              throw new Error('Authentication required - 401');
            }
            if (!response.ok) {
              throw new Error(`Summary API error: ${response.status}`);
            }
            return await response.json();
          })(),
          
          // 4. Daily Month Grid Data (for Grid Table) - uses CONSUMPTION month
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/daily/month/${consumptionMonth}${filterQuery}`;
            console.log('API #4 GRID:', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (response.status === 401) {
              throw new Error('Authentication required - 401');
            }
            if (!response.ok) {
              throw new Error(`Grid API error: ${response.status}`);
            }
            return await response.json();
          })()
        ]);
        
        // Check for 401 errors - don't cache if any API returned 401
        const has401Error = [
          totalsResult.status === 'rejected' && totalsResult.reason.message?.includes('401'),
          creditsResult.status === 'rejected' && creditsResult.reason.message?.includes('401'),
          summaryResult.status === 'rejected' && summaryResult.reason.message?.includes('401'),
          gridResult.status === 'rejected' && gridResult.reason.message?.includes('401')
        ].some(Boolean);
        
        if (has401Error) {
          console.log('🔒 SERVER: 401 error detected in API calls - throwing authentication error');
          // Clear cache for this user to prevent serving stale data
          await invalidateCache(`billed-consumption:${soldToId}`);
          throw new Error('Authentication required - 401');
        }
        
        return {
          totalsResponse: totalsResult.status === 'fulfilled' ? totalsResult.value : null,
          creditsResponse: creditsResult.status === 'fulfilled' ? creditsResult.value : null,
          summaryResponse: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
          gridResponse: gridResult.status === 'fulfilled' ? gridResult.value : null,
          errors: {
            totals: totalsResult.status === 'rejected' ? totalsResult.reason.message : null,
            credits: creditsResult.status === 'rejected' ? creditsResult.reason.message : null,
            summary: summaryResult.status === 'rejected' ? summaryResult.reason.message : null,
            grid: gridResult.status === 'rejected' ? gridResult.reason.message : null
          }
        };
      },
      CacheTTL.MEDIUM
    );
    
    return { error: null, data };
  } catch (error) {
    // Clear cache on any error to prevent serving stale data
    try {
      await invalidateCache(`billed-consumption:${soldToId}`);
      console.log('🧹 SERVER: Cleared cache due to error');
    } catch (cacheError) {
      console.error('⚠️ SERVER: Failed to clear cache:', cacheError);
    }
    return { error: error.message, data: null };
  }
}

/**
 * Build filter query parameters from filter object
 * Creates properly encoded filter strings for API calls
 * Example output: filter=limittenantid%3DAll&filter=invoicenumber%3D0930232606&filter=productcategory%20eq%20AzureUsage
 */
function buildFilterParams(filters) {
  const params = [];
  
  if (filters.limittenantid) {
    params.push(`filter=limittenantid%3D${encodeURIComponent(filters.limittenantid)}`);
  }
  
  if (filters.invoicenumber) {
    params.push(`filter=invoicenumber%3D${encodeURIComponent(filters.invoicenumber)}`);
  }
  
  if (filters.productcategory) {
    // Use 'eq' operator for productcategory with space encoded as %20
    params.push(`filter=productcategory%20eq%20${encodeURIComponent(filters.productcategory)}`);
  }
  
  // Azure Subscription filter (entitlementid)
  if (filters.entitlementid) {
    // Handle comma-separated values - split and create separate filter params
    const entitlementIds = filters.entitlementid.split(',');
    entitlementIds.forEach(id => {
      params.push(`filter=entitlementid%20eq%20${encodeURIComponent(id.trim())}`);
    });
  }
  
  // Service Name filter (metercategory)
  if (filters.metercategory) {
    // Handle comma-separated values - split and create separate filter params
    const meterCategories = filters.metercategory.split(',');
    meterCategories.forEach(category => {
      params.push(`filter=metercategory%20eq%20${encodeURIComponent(category.trim())}`);
    });
  }
  
  return params;
}

/**
 * Fetch data for Azure Subscription tab
 * Combines 5 API calls: totals, credits, entitlement summary, entitlement trend, and entitlement grid
 * @param {string} soldToId - Customer's sold to ID
 * @param {string} invoiceMonth - Invoice month (e.g., '202508')
 * @param {string} consumptionMonth - Consumption month (e.g., '202507')
 * @param {object} filters - Filter parameters
 * @param {number} months - Number of months for trend (default 6)
 * @param {number} limit - Limit for trend (default 6)
 * @param {number} page - Page number for grid (default 0)
 * @param {number} size - Page size for grid (default 20)
 */
export async function fetchAzureSubscriptionTabData(soldToId, invoiceMonth, consumptionMonth, filters = {}, months = 6, limit = 6, page = 0, size = 20) {
  try {
    console.log('🚀 Azure Subscription Tab Fetch:', { soldToId, invoiceMonth, consumptionMonth, filters, months, limit, page, size });
    
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      console.error('❌ No access token found in cookies');
      return { error: 'Authentication required', data: null };
    }
    
    const accessToken = accessTokenCookie.value;
    
    // Build filter query parameters
    const { consumptionMonth: _, ...apiFilters } = filters;
    const filterParams = buildFilterParams(apiFilters);
    const filterQuery = filterParams.length > 0 ? `&${filterParams.join('&')}` : '';
    
    console.log('🔄 SERVER: Making Azure Subscription Tab API calls with:', { 
      invoiceMonth,
      consumptionMonth,
      filterQuery,
      filters: apiFilters
    });
    
    // Create cache key
    const cacheKey = `azure-subscription-tab:${soldToId}:${invoiceMonth}:${consumptionMonth}:${JSON.stringify(apiFilters)}:${months}:${limit}:${page}:${size}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        // Make all 5 API calls in parallel
        const [totalsResult, creditsResult, summaryResult, trendResult, gridResult] = await Promise.allSettled([
          // 1. Daily Totals (Azure Usage Total) - uses CONSUMPTION month
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/daily/totals/${consumptionMonth}?${filterParams.join('&')}`;
            console.log('API #1 TOTALS (Subscription Tab):', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (!response.ok) throw new Error(`Totals API failed: ${response.status}`);
            return await response.json();
          })(),
          
          // 2. Credits (Invoice Credits) - uses INVOICE month
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-invoice-service/total/${invoiceMonth}?creditsonly=true${filterQuery}`;
            console.log('API #2 CREDITS (Subscription Tab):', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (!response.ok) throw new Error(`Credits API failed: ${response.status}`);
            return await response.json();
          })(),
          
          // 3. Entitlement Summary (Azure Subscription dropdown + Monthly Consumption chart)
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/entitlement/summary/${consumptionMonth}?${filterParams.join('&')}`;
            console.log('API #3 ENTITLEMENT SUMMARY (Subscription Tab):', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (!response.ok) throw new Error(`Entitlement Summary API failed: ${response.status}`);
            return await response.json();
          })(),
          
          // 4. Entitlement Trend (Trending Monthly Spend chart)
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/entitlement/trend?months=${months}&limit=${limit}`;
            console.log('API #4 ENTITLEMENT TREND (Subscription Tab):', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (!response.ok) throw new Error(`Entitlement Trend API failed: ${response.status}`);
            return await response.json();
          })(),
          
          // 5. Entitlement Grid (Grid table)
          (async () => {
            const serviceConfig = getService('providers');
            const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/entitlement/month/${consumptionMonth}?page=${page}&size=${size}${filterQuery}`;
            console.log('API #5 ENTITLEMENT GRID (Subscription Tab):', url);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            
            if (!response.ok) throw new Error(`Entitlement Grid API failed: ${response.status}`);
            return await response.json();
          })()
        ]);
        
        // Extract data or errors
        const totalsResponse = totalsResult.status === 'fulfilled' ? totalsResult.value : null;
        const creditsResponse = creditsResult.status === 'fulfilled' ? creditsResult.value : null;
        const summaryResponse = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
        const trendResponse = trendResult.status === 'fulfilled' ? trendResult.value : null;
        const gridResponse = gridResult.status === 'fulfilled' ? gridResult.value : null;
        
        console.log('✅ SERVER: Azure Subscription Tab API calls completed');
        
        return {
          totalsResponse,
          creditsResponse,
          summaryResponse,
          trendResponse,
          gridResponse,
          errors: {
            totals: totalsResult.status === 'rejected' ? totalsResult.reason.message : null,
            credits: creditsResult.status === 'rejected' ? creditsResult.reason.message : null,
            summary: summaryResult.status === 'rejected' ? summaryResult.reason.message : null,
            trend: trendResult.status === 'rejected' ? trendResult.reason.message : null,
            grid: gridResult.status === 'rejected' ? gridResult.reason.message : null
          }
        };
      },
      CacheTTL.MEDIUM
    );
    
    return { error: null, data };
  } catch (error) {
    return { error: error.message, data: null };
  }
}

/**
 * Fetch only entitlement trend data for period changes
 * @param {string} soldToId - Customer's sold to ID
 * @param {number} months - Number of months for trend (6 or 12)
 */
export async function fetchEntitlementTrend(soldToId, months = 6) {
  try {
    console.log('🚀 Fetching Entitlement Trend:', { soldToId, months, soldToIdType: typeof soldToId });
    
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      console.error('❌ No access token found in cookies');
      return { error: 'Authentication required', data: null };
    }
    
    const accessToken = accessTokenCookie.value;
    
    // Validate soldToId
    if (!soldToId) {
      console.error('❌ Missing soldToId');
      return { error: 'Missing soldToId', data: null };
    }
    
    // Create cache key
    const cacheKey = `entitlement-trend:${soldToId}:${months}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        const serviceConfig = getService('providers');
        const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/entitlement/trend?months=${months}&limit=6`;
        console.log('🔄 Fetching Entitlement Trend:', { url, soldToId, soldToIdArray: [soldToId] });
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify([soldToId])
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Entitlement Trend API Error:', { 
            status: response.status, 
            statusText: response.statusText,
            errorBody: errorText,
            url,
            soldToId
          });
          throw new Error(`Entitlement Trend API failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Entitlement Trend API Success:', { 
          hasData: !!result, 
          dataKeys: result ? Object.keys(result) : []
        });
        return result;
      },
      CacheTTL.MEDIUM
    );
    
    console.log('✅ Entitlement Trend data fetched');
    return { error: null, data };
  } catch (error) {
    console.error('❌ Entitlement Trend error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Fetch only Daily Consumption grid data for pagination
 * @param {string} soldToId - Customer's sold to ID
 * @param {string} invoiceMonth - Invoice month (e.g., '202508')
 * @param {object} filters - Filter parameters
 * @param {number} page - Page number (default 0)
 * @param {number} size - Page size (default 20)
 */
export async function fetchDailyConsumptionGrid(soldToId, invoiceMonth, filters = {}, page = 0, size = 20) {
  try {
    console.log('🚀 Daily Consumption Grid Pagination:', { soldToId, invoiceMonth, filters, page, size });
    
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      console.error('❌ No access token found in cookies');
      return { error: 'Authentication required', data: null };
    }
    
    const accessToken = accessTokenCookie.value;
    
    // Calculate consumption month
    const consumptionMonth = filters.consumptionMonth || (() => {
      const year = parseInt(invoiceMonth.substring(0, 4));
      const month = parseInt(invoiceMonth.substring(4, 6));
      let cYear = year;
      let cMonth = month - 1;
      if (cMonth === 0) {
        cMonth = 12;
        cYear = year - 1;
      }
      return `${cYear}${String(cMonth).padStart(2, '0')}`;
    })();
    
    // Remove consumptionMonth from filters for API calls
    const { consumptionMonth: _, ...apiFilters } = filters;
    
    // Build filter query parameters
    const filterParams = buildFilterParams(apiFilters);
    const filterQuery = filterParams.length > 0 ? `?${filterParams.join('&')}` : '';
    
    // Add page and size params
    const paginationQuery = filterQuery ? `${filterQuery}&page=${page}&size=${size}` : `?page=${page}&size=${size}`;
    
    const serviceConfig = getService('providers');
    const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/daily/month/${consumptionMonth}${paginationQuery}`;
    console.log('🔄 Daily Consumption Grid API:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify([soldToId])
    });
    
    if (!response.ok) {
      throw new Error(`Daily Consumption Grid API failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Daily Consumption Grid fetched');
    return { error: null, data };
  } catch (error) {
    console.error('❌ Daily Consumption Grid error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Fetch only Azure Subscription grid data for pagination
 * @param {string} soldToId - Customer's sold to ID
 * @param {string} invoiceMonth - Invoice month (e.g., '202508')
 * @param {object} filters - Filter parameters
 * @param {number} page - Page number (default 0)
 * @param {number} size - Page size (default 20)
 */
export async function fetchAzureSubscriptionGrid(soldToId, invoiceMonth, filters = {}, page = 0, size = 20) {
  try {
    console.log('🚀 Azure Subscription Grid Pagination:', { soldToId, invoiceMonth, filters, page, size });
    
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      console.error('❌ No access token found in cookies');
      return { error: 'Authentication required', data: null };
    }
    
    const accessToken = accessTokenCookie.value;
    
    // Calculate consumption month
    const consumptionMonth = filters.consumptionMonth || (() => {
      const year = parseInt(invoiceMonth.substring(0, 4));
      const month = parseInt(invoiceMonth.substring(4, 6));
      let cYear = year;
      let cMonth = month - 1;
      if (cMonth === 0) {
        cMonth = 12;
        cYear = year - 1;
      }
      return `${cYear}${String(cMonth).padStart(2, '0')}`;
    })();
    
    // Remove consumptionMonth from filters for API calls
    const { consumptionMonth: _, ...apiFilters } = filters;
    
    // Build filter query parameters
    const filterParams = buildFilterParams(apiFilters);
    const filterQuery = filterParams.length > 0 ? `&${filterParams.join('&')}` : '';
    
    const serviceConfig = getService('providers');
    const url = `${serviceConfig.baseURL}/ccr-consumption-service/microsoft/entitlement/month/${consumptionMonth}?page=${page}&size=${size}${filterQuery}`;
    console.log('🔄 Azure Subscription Grid API:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify([soldToId])
    });
    
    if (!response.ok) {
      throw new Error(`Azure Subscription Grid API failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Azure Subscription Grid fetched');
    return { error: null, data };
  } catch (error) {
    console.error('❌ Azure Subscription Grid error:', error);
    return { error: error.message, data: null };
  }
}
