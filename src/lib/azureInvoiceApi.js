// src/lib/azureInvoiceApi.js

/**
 * Get soldToId from Redux store
 */
function getSoldToIdFromRedux() {
  if (typeof window !== 'undefined') {
    try {
      // Client-side: access Redux store safely
      const { store } = require('@/store/store');
      
      // Check if store exists and has getState method
      if (!store || typeof store.getState !== 'function') {
        console.warn('⚠️ Redux store not properly initialized');
        return null;
      }
      
      const state = store.getState();
      
      // Try multiple sources for soldToId
      const soldToId = state?.auth?.user?.soldToId || 
                       state?.auth?.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId ||
                       state?.user?.selectedSoldToId;
      
      console.log('🔍 Redux soldToId found:', soldToId);
      return soldToId;
    } catch (error) {
      console.error('❌ Error accessing Redux store:', error);
      return null;
    }
  }
  console.log('🔍 Server-side call - Redux not available');
  return null; // Server-side will pass soldToId as parameter
}

/**
 * Generic Azure Invoice API call function - uses centralized request system
 * @param {string} serviceName - Service name from services.js
 * @param {object} payload - Request payload
 */
export async function callAzureInvoiceAPI(serviceName, payload, serverAccessToken = null) {
  console.log(`🔥 API CALL: ${serviceName.toUpperCase()}`);
  console.log(`🔥 API PAYLOAD:`, payload);
  console.log(`🔥 SERVER TOKEN PROVIDED:`, !!serverAccessToken);
  
  try {
    // Import axios directly to bypass the request wrapper's data handling
    const axios = (await import('axios')).default;
    const services = (await import('./api/services')).default;
    
    // Get service configuration
    const serviceConfig = services.getService(serviceName);
    console.log('🔍 Service Config:', serviceConfig);
    
    let soldToArray;
    let urlParams = '';
    
    if (Array.isArray(payload)) {
      // Direct array payload (for invoiceMonths)
      soldToArray = payload;
    } else if (payload && typeof payload === 'object' && payload.payload) {
      // Object with payload array and other config (for other APIs with urlParam)
      soldToArray = payload.payload;
      urlParams = payload.urlParam || '';
    } else {
      console.error('❌ Invalid payload format:', payload);
      return { error: 'Invalid payload format' };
    }
    
    // Build the complete URL
    console.log('🔍 Base URL:', serviceConfig.baseURL);
    console.log('🔍 Service URL:', serviceConfig.url);
    let fullUrl = `${serviceConfig.baseURL}${serviceConfig.url}`;
    if (urlParams) {
      if (urlParams.startsWith('?')) {
        fullUrl += urlParams;
      } else {
        fullUrl += `/${urlParams}`;
      }
    }
    console.log('🔍 Final URL:', fullUrl);
    
    // Get access token for authorization - prioritize server-provided token
    let accessToken = serverAccessToken;
    
    if (!accessToken && typeof window !== 'undefined') {
      try {
        // First try localStorage (more reliable)
        accessToken = localStorage.getItem("access_token");
        console.log('🔍 localStorage accessToken:', accessToken);
        
        // Only try storage if localStorage doesn't have it
        if (!accessToken) {
          const { store } = require('@/lib/store');
          if (store && store.getState) {
            const state = store.getState();
            accessToken = state?.auth?.accessToken;
            console.log('🔍 Storage accessToken:', accessToken);
          }
        }
      } catch (error) {
        console.error('❌ Error getting access token:', error);
        // Final fallback to localStorage only
        try {
          accessToken = localStorage.getItem("access_token");
          console.log('🔍 Final fallback localStorage accessToken:', accessToken);
        } catch (e) {
          console.error('❌ localStorage also failed:', e);
        }
      }
    } else {
      // Server-side: try to get token from cookies
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get('access_token');
        accessToken = tokenCookie?.value;
        console.log('🔍 Server-side cookie accessToken:', accessToken);
        console.log('🔍 All available cookies:', cookieStore.getAll().map(c => c.name));
        
        // If no access_token cookie, try to get from auth persist cookie
        if (!accessToken) {
          const authCookie = cookieStore.get('persist:ccr-auth');
          if (authCookie) {
            try {
              const persistedState = JSON.parse(authCookie.value);
              accessToken = persistedState.accessToken;
              console.log('🔍 Access token from auth persist:', !!accessToken);
            } catch (e) {
              console.log('⚠️ Failed to parse auth persist cookie for token');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error getting access token from server cookies:', error);
      }
    }
    
    // Build headers
    const headers = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
      console.log('✅ Bearer token added to headers');
    } else {
      console.warn('⚠️ No access token found - API call will be unauthorized');
    }
    
    console.log(`🔥 DIRECT AXIOS CALL:`, {
      url: fullUrl,
      method: 'POST',
      data: soldToArray, // This will be the raw array
      headers: headers
    });
    
    // Make direct axios call with the array as data
    const response = await axios({
      method: 'POST',
      url: fullUrl,
      data: soldToArray, // Raw array, not wrapped in { data: [...] }
      headers: headers,
    });
    
    console.log(`✅ API RESPONSE: ${serviceName.toUpperCase()}`, response.data);
    console.log(`🔍 API RESPONSE TYPE: ${serviceName.toUpperCase()}`, typeof response.data);
    console.log(`🔍 API RESPONSE KEYS: ${serviceName.toUpperCase()}`, Object.keys(response.data || {}));
    
    // Special detailed logging for invoiceSummary to see selectLists structure
    if (serviceName.toLowerCase() === 'invoicesummary') {
      console.log('📋 INVOICE SUMMARY DETAILED RESPONSE:');
      console.log('📋 Full response:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.selectLists) {
        console.log('📋 selectLists found:', response.data.selectLists);
        console.log('📋 selectLists is array:', Array.isArray(response.data.selectLists));
        console.log('📋 selectLists length:', response.data.selectLists.length);
        
        response.data.selectLists.forEach((list, index) => {
          console.log(`📋 selectLists[${index}]:`, list);
          console.log(`📋 selectLists[${index}].type:`, list.type);
          console.log(`📋 selectLists[${index}].items:`, list.items);
          console.log(`📋 selectLists[${index}].items length:`, list.items ? list.items.length : 'no items');
        });
      } else {
        console.log('⚠️ No selectLists found in invoiceSummary response');
        console.log('⚠️ Available keys:', Object.keys(response.data || {}));
      }
    }
    
    // Return the response data directly (axios response format)
    return response.data;
  } catch (error) {
    console.error(`❌ API ERROR: ${serviceName.toUpperCase()}`, {
      error: error.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      payload
    });
    
    // Return empty object instead of throwing to prevent app crash
    return {
      error: error.message,
      errorCode: error?.response?.status || 500
    };
  }
}

export async function fetchInvoiceMonths({ soldToId, accessToken } = {}) {
  // Prioritize passed soldToId, then try Redux store
  const finalSoldToId = soldToId || getSoldToIdFromRedux();
  console.log('🔍 fetchInvoiceMonths - passed soldToId:', soldToId);
  console.log('🔍 fetchInvoiceMonths - finalSoldToId:', finalSoldToId);
  
  if (!finalSoldToId) {
    console.error('❌ fetchInvoiceMonths: No soldToId available');
    return { error: 'No soldToId available' };
  }
  return callAzureInvoiceAPI("invoiceMonths", [finalSoldToId], accessToken);
}

export async function fetchInvoiceSummary({ soldToId, value, filter, accessToken } = {}) {
  const finalSoldToId = soldToId || getSoldToIdFromRedux();
  if (!finalSoldToId) {
    console.error('❌ fetchInvoiceSummary: No soldToId available');
    return { error: 'No soldToId available' };
  }
  
  // Build URL params: summary/{value}?filter={filter}
  let urlParams = value;
  if (filter && filter.length > 0) {
    const filterParam = Array.isArray(filter) ? filter.join(',') : filter;
    urlParams = `${value}?filter=${encodeURIComponent(filterParam)}`;
  }
  
  return callAzureInvoiceAPI("invoiceSummary", {
    payload: [finalSoldToId],
    urlParam: urlParams
  }, accessToken);
}

export async function fetchInvoiceMonthDetail({
  soldToId,
  value,
  filter,
  monthlyDifference,
  accessToken
} = {}) {
  const finalSoldToId = soldToId || getSoldToIdFromRedux();
  if (!finalSoldToId) {
    console.error('❌ fetchInvoiceMonthDetail: No soldToId available');
    return { error: 'No soldToId available' };
  }
  
  const serviceName = monthlyDifference
    ? "invoiceMonthlyDifferenceDetail"
    : "invoiceMonthDetail";

  // Build URL params: month/{value}?filter={filter}
  let urlParams = value;
  if (filter && filter.length > 0) {
    const filterParam = Array.isArray(filter) ? filter.join(',') : filter;
    urlParams = `${value}?filter=${encodeURIComponent(filterParam)}`;
  }

  return callAzureInvoiceAPI(serviceName, {
    payload: [finalSoldToId],
    urlParam: urlParams
  }, accessToken);
}

export async function fetchInvoiceCredits({ soldToId, value, filter, accessToken } = {}) {
  const finalSoldToId = soldToId || getSoldToIdFromRedux();
  if (!finalSoldToId) {
    console.error('❌ fetchInvoiceCredits: No soldToId available');
    return { error: 'No soldToId available' };
  }
  
  // Build URL params: credits/{value}?filter={filter}
  let urlParams = value;
  if (filter && filter.length > 0) {
    const filterParam = Array.isArray(filter) ? filter.join(',') : filter;
    urlParams = `${value}?filter=${encodeURIComponent(filterParam)}`;
  }
  
  return callAzureInvoiceAPI("invoiceCredits", {
    payload: [finalSoldToId],
    urlParam: urlParams
  }, accessToken);
}

export async function fetchInvoiceTrend({ soldToId, months, filter, accessToken } = {}) {
  const finalSoldToId = soldToId || getSoldToIdFromRedux();
  if (!finalSoldToId) {
    console.error('❌ fetchInvoiceTrend: No soldToId available');
    return { error: 'No soldToId available' };
  }
  
  // Build URL params: trend?months={months}&limit=6&filter={filter}
  const monthsParam = months || 6;
  let urlParams = `?months=${monthsParam}&limit=6`;
  if (filter && filter.length > 0) {
    const filterParam = Array.isArray(filter) ? filter.join(',') : filter;
    urlParams += `&filter=${encodeURIComponent(filterParam)}`;
  }
  
  return callAzureInvoiceAPI("invoiceTrend", {
    payload: [finalSoldToId],
    urlParam: urlParams
  }, accessToken);
}

/**
 * Server-side data fetching for initial Azure Invoice page render
 * Uses generic API calls through centralized request system
 */
export async function getInitialAzureInvoiceData({ soldToId, locationState, accessToken }) {
  try {
    const invoiceMonths = await fetchInvoiceMonths({ soldToId, accessToken });

    if (!invoiceMonths?.length) {
      return {
        pageExistsError: true,
        invoiceMonths: [],
      };
    }

    const currentMonthObject = locationState?.currentMonthObject || invoiceMonths[0];
    const currentMonthValue = currentMonthObject.value;

    // Build 2-month string for monthly difference
    const moment = (await import("moment")).default;
    const date = new Date(currentMonthObject.date);
    const prevMonth = moment(date).subtract(1, "month").format("YYYYMM");
    const usageMonthDifference = `${prevMonth}/${currentMonthValue}`;

    const filterQuery = [];
    const trendFilter = "";

    // Parallel API calls
    const [summary, credits, trend] = await Promise.allSettled([
      fetchInvoiceSummary({ soldToId, value: currentMonthValue, filter: filterQuery, accessToken }),
      fetchInvoiceCredits({ soldToId, value: currentMonthValue, filter: filterQuery, accessToken }),
      fetchInvoiceTrend({ soldToId, months: 6, filter: trendFilter, accessToken }),
    ]);

    return {
      pageExistsError: false,
      invoiceMonths,
      currentMonthObject,
      usageMonth: currentMonthValue,
      usageMonthDifference,
      summary: summary.status === 'fulfilled' ? summary.value : null,
      credits: credits.status === 'fulfilled' ? credits.value : null,
      trend: trend.status === 'fulfilled' ? trend.value : null,
    };
  } catch (error) {
    console.error(`❌ getInitialAzureInvoiceData failed:`, error.message);
    return {
      pageExistsError: true,
      invoiceMonths: [],
      error: error.message,
    };
  }
}
