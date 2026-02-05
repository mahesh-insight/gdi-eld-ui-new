// src/app/invoices/actions.js
'use server';

import { cookies } from 'next/headers';
import { getOrSetCached } from '@/lib/cache/serverCache';
import { CacheTTL } from '@/lib/cache/cacheKeys';
import { getService } from '@/lib/api/services';

/**
 * Consolidated fetch for all invoice data (optimized like azure-invoice)
 * This combines multiple API calls into a single server action with caching
 */
export async function fetchConsolidatedInvoiceData(soldToId, provider, selectedMonth, invoiceNumber = null, customerFilter = null) {
  try {
    console.log('🚀 Consolidated Invoice Fetch:', { soldToId, provider, selectedMonth, invoiceNumber, customerFilter });
    
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      return { error: 'Authentication required', data: null };
    }
    
    const accessToken = accessTokenCookie.value;
    const abbreviation = typeof provider === 'string' ? provider : provider?.abbreviation;
    const monthValue = typeof selectedMonth === 'string' ? selectedMonth : selectedMonth?.value;
    
    // Build filter parameters as separate URL query parameters
    // Trend API only needs customer filter, not invoice number
    const trendQueryParams = [];
    const summaryQueryParams = [];
    
    // Add customer filter first if provided (limittenantid)
    if (customerFilter && customerFilter !== 'All' && customerFilter !== 'all') {
      const customerFilterParam = `filter=limittenantid%3D${encodeURIComponent(customerFilter)}`;
      trendQueryParams.push(customerFilterParam);
      summaryQueryParams.push(customerFilterParam);
    }
    
    // Add invoice number filter only for summary and grid APIs (not trend)
    const invoiceFilter = invoiceNumber && invoiceNumber !== 'all' && invoiceNumber !== 'All' ? invoiceNumber : 'all';
    summaryQueryParams.push(`filter=invoicenumber%3D${invoiceFilter}`);
    
    const summaryFilterParam = summaryQueryParams.length > 0 ? `?${summaryQueryParams.join('&')}` : '';
    const trendFilterParam = trendQueryParams.length > 0 ? `?${trendQueryParams.join('&')}` : '';
    
    console.log('🔄 SERVER: Making consolidated API calls with:', { 
      abbreviation, 
      monthValue, 
      summaryFilterParam,
      trendFilterParam,
      invoiceFilter,
      customerFilter: customerFilter || 'none',
      soldToId
    });
    
    // Create cache key for consolidated data including customer filter
    const cacheKey = `invoice-consolidated:${soldToId}:${abbreviation}:${monthValue}:${invoiceFilter}:${customerFilter || 'all'}`;
    console.log('🔑 SERVER: Cache key:', cacheKey);
    console.log('🎯 SERVER: Filter params - Summary/Grid:', summaryFilterParam, 'Trend:', trendFilterParam);
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 SERVER: Cache MISS - fetching consolidated data from APIs');
        console.log('   Summary/Grid filter:', summaryFilterParam);
        console.log('   Trend filter:', trendFilterParam);
        
        // Make all API calls in parallel using services
        const [summaryResult, trendResult, gridResult] = await Promise.allSettled([
          // Invoice Summary (month data)
          (async () => {
            const serviceConfig = getService('providers'); // Get base URL
            const url = `${serviceConfig.baseURL}/ccr-billableitem-service/${abbreviation}/summary/${monthValue}${summaryFilterParam}`;
            console.log('📡 SERVER: Summary API URL:', url);
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            if (!response.ok) throw new Error(`Summary API error: ${response.status}`);
            return response.json();
          })(),
          
          // Trend data
          (async () => {
            const serviceConfig = getService('providers'); // Get base URL
            const trendFilter = trendFilterParam ? '&' + trendFilterParam.substring(1) : '';
            const url = `${serviceConfig.baseURL}/ccr-billableitem-service/${abbreviation}/trend?months=6&limit=6${trendFilter}`;
            console.log('📈 SERVER: Trend API URL:', url);
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            if (!response.ok) throw new Error(`Trend API error: ${response.status}`);
            return response.json();
          })(),
          
          // Grid data (details)
          (async () => {
            const serviceConfig = getService('providers'); // Get base URL
            const url = `${serviceConfig.baseURL}/ccr-billableitem-service/${abbreviation}/month/${monthValue}${summaryFilterParam}`;
            console.log('📋 SERVER: Grid API URL:', url);
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([soldToId])
            });
            if (!response.ok) throw new Error(`Grid API error: ${response.status}`);
            return response.json();
          })()
        ]);
        
        // Process results and add URLs to breakdown chart data
        const summaryData = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
        
        // Add URLs to chartData/breakdown items if they exist
        if (summaryData?.chartData) {
          summaryData.chartData = summaryData.chartData.map(item => ({
            ...item,
            url: item.label === 'Azure Usage' ? '/AzureBilledConsumptionDetail' : (item.url || '')
          }));
        } else if (summaryData?.breakdown) {
          summaryData.breakdown = summaryData.breakdown.map(item => ({
            ...item,
            url: item.label === 'Azure Usage' ? '/AzureBilledConsumptionDetail' : (item.url || '')
          }));
        } else if (summaryData?.spendPeriod?.spend) {
          summaryData.spendPeriod.spend = summaryData.spendPeriod.spend.map(item => ({
            ...item,
            url: (item.label === 'Azure Usage' || item.category === 'Azure Usage') ? '/AzureBilledConsumptionDetail' : (item.url || '')
          }));
        }
        
        const consolidatedData = {
          summaryResponse: summaryResult.status === 'fulfilled' ? { data: summaryData } : { error: summaryResult.reason?.message },
          trendResponse: trendResult.status === 'fulfilled' ? { data: trendResult.value } : { error: trendResult.reason?.message },
          detailsResponse: gridResult.status === 'fulfilled' ? { data: gridResult.value } : { error: gridResult.reason?.message }
        };
        
        console.log('✅ Consolidated fetch from APIs completed:', {
          summarySuccess: summaryResult.status === 'fulfilled',
          trendSuccess: trendResult.status === 'fulfilled', 
          gridSuccess: gridResult.status === 'fulfilled'
        });
        
        return consolidatedData;
      },
      CacheTTL.AZURE_INVOICE_DATA // 10 minutes for invoice data
    );
    
    console.log('🎯 SERVER: Cache HIT - returning consolidated data from cache for key:', cacheKey);
    console.log('📊 SERVER: Returned data summary:', {
      hasSummary: !!data?.summaryResponse?.data,
      totalSpend: data?.summaryResponse?.data?.spendPeriod?.totalSpend,
      gridRecords: data?.detailsResponse?.data?.totalElements || data?.detailsResponse?.data?.length
    });
    return { error: null, data };
    
  } catch (error) {
    console.error('❌ Consolidated fetch error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Cached providers fetch
 */
export async function fetchProvidersServer(soldToId) {
  try {
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      return { error: 'Authentication required', data: null };
    }
    
    // Cache providers for 30 minutes
    const cacheKey = `invoice-providers:${soldToId}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching providers from API');
        const serviceConfig = getService('providers');
        const result = await fetch(serviceConfig.baseURL + serviceConfig.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessTokenCookie.value}`
          },
          body: JSON.stringify([soldToId])
        });
        
        if (!result.ok) {
          throw new Error(`HTTP error! status: ${result.status}`);
        }
        
        return result.json();
      },
      CacheTTL.MEDIUM // 30 minutes
    );
    
    console.log('✅ Providers fetched:', data?.length || 0, 'items');
    return { error: null, data };
    
  } catch (error) {
    console.error('❌ fetchProvidersServer error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Cached invoice months fetch
 */
export async function fetchInvoiceMonthsServer(soldToId, provider) {
  try {
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      return { error: 'Authentication required', data: null };
    }
    
    const abbreviation = typeof provider === 'string' ? provider : provider?.abbreviation;
    
    if (!abbreviation) {
      return { error: 'Provider abbreviation required', data: null };
    }
    
    // Cache months for 30 minutes per provider
    const cacheKey = `invoice-months:${soldToId}:${abbreviation}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching months for provider:', abbreviation);
        
        // Get base URL from services and construct provider-specific URL
        const serviceConfig = getService('providers'); // Use any service to get baseURL
        const url = `${serviceConfig.baseURL}/ccr-billableitem-service/${abbreviation}/months`;
        
        console.log('🔍 Constructed URL:', url);
        const result = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessTokenCookie.value}`
          },
          body: JSON.stringify([soldToId])
        });
        
        if (!result.ok) {
          throw new Error(`HTTP error! status: ${result.status}`);
        }
        
        return result.json();
      },
      CacheTTL.MEDIUM // 30 minutes
    );
    
    console.log('✅ Invoice months fetched for provider', abbreviation, ':', data?.length || 0, 'items');
    return { error: null, data };
    
  } catch (error) {
    console.error('❌ fetchInvoiceMonthsServer error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Legacy server actions for backward compatibility
 * These will use the consolidated fetch internally
 */
export async function fetchInvoiceSummaryServer(soldToId, abbreviation, monthValue) {
  const result = await fetchConsolidatedInvoiceData(soldToId, { abbreviation }, { value: monthValue });
  if (result.error) {
    return { error: result.error, data: null };
  }
  return { error: null, data: result.data?.summaryResponse?.data };
}

export async function fetchInvoiceTrendServer(soldToId, abbreviation, months = 6) {
  try {
    console.log('🔄 Fetching Invoice Trend:', { soldToId, abbreviation, months });
    
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    
    if (!accessTokenCookie) {
      return { error: 'Authentication required', data: null };
    }
    
    const accessToken = accessTokenCookie.value;
    const serviceConfig = getService('providers');
    const url = `${serviceConfig.baseURL}/ccr-billableitem-service/${abbreviation}/trend?months=${months}&limit=6`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify([soldToId])
    });
    
    if (!response.ok) {
      throw new Error(`Trend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { error: null, data };
  } catch (error) {
    console.error('❌ fetchInvoiceTrendServer error:', error);
    return { error: error.message, data: null };
  }
}

export async function fetchInvoiceDetailsServer(soldToId, abbreviation, monthValue) {
  const result = await fetchConsolidatedInvoiceData(soldToId, { abbreviation }, { value: monthValue });
  if (result.error) {
    return { error: result.error, data: null };
  }
  return { error: null, data: result.data?.detailsResponse?.data };
}

/**
 * Additional backward compatibility functions for client handlers
 */
export async function fetchInitialInvoiceMonths(abbreviation) {
  try {
    const cookieStore = await cookies();
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = null;
    if (userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
      } catch (error) {
        console.error('Error parsing user context:', error);
      }
    }
    
    if (!soldToId) {
      throw new Error('No soldToId found in user context');
    }
    
    const result = await fetchInvoiceMonthsServer(soldToId, { abbreviation });
    return result;
  } catch (error) {
    console.error('❌ fetchInitialInvoiceMonths error:', error);
    return { error: error.message, data: null };
  }
}

export async function fetchInvoiceMonth(abbreviation, monthValue) {
  try {
    const cookieStore = await cookies();
    const userContextCookie = cookieStore.get('user_context');
    
    let soldToId = null;
    if (userContextCookie) {
      try {
        const userContext = JSON.parse(userContextCookie.value);
        soldToId = userContext.soldToId;
      } catch (error) {
        console.error('Error parsing user context:', error);
      }
    }
    
    if (!soldToId) {
      throw new Error('No soldToId found in user context');
    }
    
    const result = await fetchConsolidatedInvoiceData(soldToId, { abbreviation }, { value: monthValue });
    if (result.error) {
      return { error: result.error, data: null };
    }
    
    // Extract the data we need for the client
    const monthsData = result.data?.monthsResponse?.data || [];
    const summaryData = result.data?.summaryResponse?.data || [];
    const trendData = result.data?.trendResponse?.data || [];
    const detailsData = result.data?.detailsResponse?.data || [];
    
    return { 
      error: null, 
      data: {
        months: monthsData,
        summary: summaryData,
        trend: trendData,
        details: detailsData
      }
    };
  } catch (error) {
    console.error('❌ fetchInvoiceMonth error:', error);
    return { error: error.message, data: null };
  }
}