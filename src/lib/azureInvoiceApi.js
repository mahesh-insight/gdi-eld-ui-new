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
  
  // Declare variables that will be used in catch block
  let soldToArray;
  let fullUrl;
  
  try {
    // Import axios directly to bypass the request wrapper's data handling
    const axios = (await import('axios')).default;
    const services = (await import('./api/services')).default;
    
    // Get service configuration
    const serviceConfig = services.getService(serviceName);
    console.log('🔍 Service Config:', serviceConfig);
    
    soldToArray = null;
    let urlParams = '';
    
    // Add null/undefined check first
    if (!payload) {
      console.error('❌ No payload provided (null or undefined)');
      return { error: 'No payload provided' };
    }
    
    if (Array.isArray(payload)) {
      // Direct array payload (for invoiceMonths)
      soldToArray = payload;
    } else if (typeof payload === 'object' && payload.hasOwnProperty('payload')) {
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
    fullUrl = `${serviceConfig.baseURL}${serviceConfig.url}`;
    if (urlParams) {
      if (urlParams.startsWith('?')) {
        fullUrl += urlParams;
      } else {
        fullUrl += `/${urlParams}`;
      }
    }
    console.log('🌐🌐🌐 FULL API REQUEST URL:', fullUrl);
    console.log('📦 Request Payload:', JSON.stringify(soldToArray, null, 2));
    
    // Get access token for authorization - prioritize passed token
    let accessToken = serverAccessToken;
    
    // Only try to get token from other sources if not provided
    if (!accessToken && typeof window !== 'undefined') {
      try {
        // Client-side: First try to get from Redux persist storage
        const persistData = localStorage.getItem('persist:ccr-auth');
        if (persistData) {
          const parsed = JSON.parse(persistData);
          console.log('🔍 Redux persist keys:', Object.keys(parsed));
          
          // Try to get token from loginResponse.tokens.bearerToken first (most reliable)
          if (parsed.loginResponse) {
            try {
              let loginResponseStr = parsed.loginResponse;
              // Remove quotes if it's a JSON string
              if (typeof loginResponseStr === 'string' && loginResponseStr.startsWith('"')) {
                loginResponseStr = JSON.parse(loginResponseStr);
              }
              const loginResponseObj = typeof loginResponseStr === 'string' ? 
                JSON.parse(loginResponseStr) : loginResponseStr;
              
              if (loginResponseObj?.tokens?.bearerToken) {
                accessToken = loginResponseObj.tokens.bearerToken;
                console.log('✅ Client-side token from loginResponse.tokens.bearerToken:', accessToken?.substring(0, 20) + '...');
              }
            } catch (e) {
              console.log('⚠️ Failed to parse loginResponse for bearerToken:', e);
            }
          }
          
          // Fallback to direct accessToken from Redux persist
          if (!accessToken && parsed.accessToken) {
            let tokenFromPersist = parsed.accessToken;
            // Remove quotes if it's a JSON string
            if (typeof tokenFromPersist === 'string' && tokenFromPersist.startsWith('"')) {
              tokenFromPersist = JSON.parse(tokenFromPersist);
            }
            if (typeof tokenFromPersist === 'string' && tokenFromPersist.length > 100) {
              accessToken = tokenFromPersist;
              console.log('✅ Client-side token from Redux persist accessToken:', accessToken?.substring(0, 20) + '...');
            }
          }
        }
        
        // Final fallback to direct localStorage (legacy)
        if (!accessToken) {
          accessToken = localStorage.getItem("access_token");
          console.log('🔍 Legacy localStorage accessToken:', accessToken?.substring(0, 20) + '...');
        }
        
        // Last resort: try Redux store
        if (!accessToken) {
          try {
            const { store } = require('@/store/store');
            if (store && store.getState) {
              const state = store.getState();
              accessToken = state?.auth?.accessToken;
              console.log('🔍 Redux store accessToken:', accessToken?.substring(0, 20) + '...');
            }
          } catch (e) {
            console.log('🔍 Could not access Redux store:', e.message);
          }
        }
      } catch (error) {
        console.error('❌ Error getting access token:', error);
      }
    }
    
    // Build headers
    const headers = {
      'Content-Type': 'application/json',
    };
    if (accessToken && typeof accessToken === 'string') {
      headers.Authorization = `Bearer ${accessToken}`;
      console.log('✅ Bearer token added to headers:', {
        tokenLength: accessToken.length,
        tokenPrefix: accessToken.substring(0, 20) + '...',
        isValidJWT: accessToken.length > 100
      });
    } else {
      console.error('⚠️ No valid access token found - API call will be unauthorized');
      console.log('🔍 Access token type:', typeof accessToken);
      console.log('🔍 Access token value:', accessToken);
      console.log('🔍 Is client-side:', typeof window !== 'undefined');
      
      // Additional debugging for client-side
      if (typeof window !== 'undefined') {
        console.log('🔍 Debug localStorage persist data:');
        try {
          const persistData = localStorage.getItem('persist:ccr-auth');
          if (persistData) {
            const parsed = JSON.parse(persistData);
            console.log('🔍 Available persist keys:', Object.keys(parsed));
            console.log('🔍 isAuthenticated:', parsed.isAuthenticated);
            console.log('🔍 accessToken type:', typeof parsed.accessToken);
            console.log('🔍 loginResponse type:', typeof parsed.loginResponse);
          } else {
            console.log('🔍 No persist data found in localStorage');
          }
        } catch (e) {
          console.error('🔍 Error checking persist data:', e);
        }
      }
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
      originalPayload: payload,
      processedPayload: soldToArray
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
  
  const serviceName = "invoiceMonthDetail";

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

export async function fetchInvoiceMonthlyDifferenceDetail({
  soldToId,
  value,
  filter,
  accessToken
} = {}) {
  const finalSoldToId = soldToId || getSoldToIdFromRedux();
  if (!finalSoldToId) {
    console.error('❌ fetchInvoiceMonthlyDifferenceDetail: No soldToId available');
    return { error: 'No soldToId available' };
  }
  
  const serviceName = "invoiceMonthlyDifferenceDetail";

  // Build URL params: month/sku-difference/{value}?filter={filter}
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

/**
 * Client-side combined data fetching for Azure Invoice month changes
 * Makes a SINGLE network request to get all data (summary + credits + trend)
 */
export async function fetchCombinedInvoiceData({ soldToId, monthValue, accessToken }) {
  try {
    console.log('🎯🎯🎯 fetchCombinedInvoiceData called with:', {
      soldToId: soldToId?.substring(0, 20) + '...',
      monthValue: monthValue,
      hasAccessToken: !!accessToken
    });
    
    // Get access token if not provided
    let finalAccessToken = accessToken;
    
    if (!finalAccessToken && typeof window !== 'undefined') {
      try {
        // First try to get from Redux persist storage
        const persistData = localStorage.getItem('persist:ccr-auth');
        if (persistData) {
          const parsed = JSON.parse(persistData);
          
          // Try to get token from loginResponse.tokens.bearerToken first (most reliable)
          if (parsed.loginResponse) {
            try {
              let loginResponseStr = parsed.loginResponse;
              // Remove quotes if it's a JSON string
              if (typeof loginResponseStr === 'string' && loginResponseStr.startsWith('"')) {
                loginResponseStr = JSON.parse(loginResponseStr);
              }
              const loginResponseObj = typeof loginResponseStr === 'string' ? 
                JSON.parse(loginResponseStr) : loginResponseStr;
              
              if (loginResponseObj?.tokens?.bearerToken) {
                finalAccessToken = loginResponseObj.tokens.bearerToken;
                console.log('✅ Combined API: Token from loginResponse.tokens.bearerToken');
              }
            } catch (e) {
              console.log('⚠️ Failed to parse loginResponse for bearerToken:', e);
            }
          }
          
          // Fallback to direct accessToken from Redux persist
          if (!finalAccessToken && parsed.accessToken) {
            let tokenFromPersist = parsed.accessToken;
            // Remove quotes if it's a JSON string
            if (typeof tokenFromPersist === 'string' && tokenFromPersist.startsWith('"')) {
              tokenFromPersist = JSON.parse(tokenFromPersist);
            }
            if (typeof tokenFromPersist === 'string' && tokenFromPersist.length > 100) {
              finalAccessToken = tokenFromPersist;
              console.log('✅ Combined API: Token from Redux persist accessToken');
            }
          }
        }
        
        // Final fallback to direct localStorage (legacy)
        if (!finalAccessToken) {
          finalAccessToken = localStorage.getItem("access_token");
          console.log('🔍 Combined API: Legacy localStorage accessToken check');
        }
      } catch (error) {
        console.error('❌ Combined API: Error getting access token:', error);
      }
    }
    
    console.log('🚀 Making SINGLE combined API call for month:', monthValue);
    console.log('🔑 Using access token:', !!finalAccessToken, finalAccessToken?.substring(0, 20) + '...');
    
    // Build headers with Bearer token
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (finalAccessToken && typeof finalAccessToken === 'string') {
      headers.Authorization = `Bearer ${finalAccessToken}`;
      console.log('✅ Combined API: Authorization header set with Bearer token');
    } else {
      console.error('⚠️ Combined API: No access token available - will get 401');
    }
    
    // Make ONE network request to the combined endpoint
    const response = await fetch('/api/azure-invoice', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        action: 'combinedMonthData',
        soldToId: [soldToId], // API expects array format
        month: monthValue
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('📊 Single combined API call result:', {
      success: result.success,
      hasData: !!result.data,
      summary: !!result.data?.summary,
      credits: !!result.data?.credits,
      trend: !!result.data?.trend,
      invoiceDetails: !!result.data?.invoiceDetails,
      monthlyDifference: !!result.data?.monthlyDifference
    });

    if (result.success && result.data) {
      return {
        success: true,
        summary: result.data.summary,
        credits: result.data.credits,
        trend: result.data.trend,
        invoiceDetails: result.data.invoiceDetails,
        monthlyDifference: result.data.monthlyDifference,
        monthValue: result.data.monthValue
      };
    } else {
      throw new Error(result.error || 'Failed to fetch combined data');
    }
    
  } catch (error) {
    console.error(`❌ fetchCombinedInvoiceData failed:`, error.message);
    return {
      success: false,
      error: error.message,
      summary: null,
      credits: null,
      trend: null,
      invoiceDetails: null,
      monthlyDifference: null
    };
  }
}

/**
 * Server-side data fetching for initial Azure Invoice page render
 * Uses generic API calls through centralized request system
 */
export async function getInitialAzureInvoiceData({ soldToId, locationState, accessToken }) {
  try {
    console.log('🎯🎯🎯 getInitialAzureInvoiceData called with:', {
      soldToId: soldToId?.substring(0, 20) + '...',
      locationState: locationState,
      currentMonthObject: locationState?.currentMonthObject,
      hasAccessToken: !!accessToken
    });
    
    const invoiceMonths = await fetchInvoiceMonths({ soldToId, accessToken });

    if (!invoiceMonths?.length) {
      return {
        pageExistsError: true,
        invoiceMonths: [],
      };
    }

    const currentMonthObject = locationState?.currentMonthObject || invoiceMonths[0];
    const currentMonthValue = currentMonthObject.value;
    
    console.log('📅📅📅 MONTH VALUE BEING USED FOR API CALLS:', {
      currentMonthObject: currentMonthObject,
      currentMonthValue: currentMonthValue,
      source: locationState?.currentMonthObject ? 'FROM_LOCATION_STATE' : 'FROM_FIRST_MONTH'
    });

    // Build 2-month string for monthly difference
    const moment = (await import("moment")).default;
    const date = new Date(currentMonthObject.date);
    const prevMonth = moment(date).subtract(1, "month").format("YYYYMM");
    const usageMonthDifference = `${prevMonth}/${currentMonthValue}`;

    const filterQuery = [];
    const trendFilter = "";

    // Parallel API calls - including month detail and monthly difference for tabs
    const [summary, credits, trend, monthDetail, monthlyDifference] = await Promise.allSettled([
      fetchInvoiceSummary({ soldToId, value: currentMonthValue, filter: filterQuery, accessToken }),
      fetchInvoiceCredits({ soldToId, value: currentMonthValue, filter: filterQuery, accessToken }),
      fetchInvoiceTrend({ soldToId, months: 6, filter: trendFilter, accessToken }),
      fetchInvoiceMonthDetail({ soldToId, value: `${currentMonthValue}?page=0&size=20`, filter: filterQuery, accessToken }),
      fetchInvoiceMonthlyDifferenceDetail({ soldToId, value: `${prevMonth}/${currentMonthValue}?page=0&size=20`, filter: filterQuery, accessToken })
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
      monthDetail: monthDetail.status === 'fulfilled' ? monthDetail.value : null,
      monthlyDifference: monthlyDifference.status === 'fulfilled' ? monthlyDifference.value : null,
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

/**
 * Fetch Azure Invoice data for month change (without fetching invoiceMonths again)
 * This is used when user changes month - we already have the months list
 */
export async function getAzureInvoiceDataForMonth({ soldToId, currentMonthObject, accessToken }) {
  try {
    console.log('🔄 getAzureInvoiceDataForMonth called for month change:', {
      soldToId: soldToId?.substring(0, 20) + '...',
      currentMonthObject,
      hasAccessToken: !!accessToken
    });

    const currentMonthValue = currentMonthObject.value;
    
    console.log('📅 MONTH VALUE BEING USED FOR API CALLS:', currentMonthValue);

    // Build 2-month string for monthly difference
    const moment = (await import("moment")).default;
    const date = new Date(currentMonthObject.date);
    const prevMonth = moment(date).subtract(1, "month").format("YYYYMM");
    const usageMonthDifference = `${prevMonth}/${currentMonthValue}`;

    const filterQuery = [];
    const trendFilter = "";

    // Parallel API calls - NO invoiceMonths call on month change
    const [summary, credits, trend, monthDetail, monthlyDifference] = await Promise.allSettled([
      fetchInvoiceSummary({ soldToId, value: currentMonthValue, filter: filterQuery, accessToken }),
      fetchInvoiceCredits({ soldToId, value: currentMonthValue, filter: filterQuery, accessToken }),
      fetchInvoiceTrend({ soldToId, months: 6, filter: trendFilter, accessToken }),
      fetchInvoiceMonthDetail({ soldToId, value: `${currentMonthValue}?page=0&size=20`, filter: filterQuery, accessToken }),
      fetchInvoiceMonthlyDifferenceDetail({ soldToId, value: `${prevMonth}/${currentMonthValue}?page=0&size=20`, filter: filterQuery, accessToken })
    ]);

    return {
      pageExistsError: false,
      currentMonthObject,
      usageMonth: currentMonthValue,
      usageMonthDifference,
      summary: summary.status === 'fulfilled' ? summary.value : null,
      credits: credits.status === 'fulfilled' ? credits.value : null,
      trend: trend.status === 'fulfilled' ? trend.value : null,
      monthDetail: monthDetail.status === 'fulfilled' ? monthDetail.value : null,
      monthlyDifference: monthlyDifference.status === 'fulfilled' ? monthlyDifference.value : null,
    };
  } catch (error) {
    console.error(`❌ getAzureInvoiceDataForMonth failed:`, error.message);
    return {
      pageExistsError: true,
      error: error.message,
    };
  }
}
