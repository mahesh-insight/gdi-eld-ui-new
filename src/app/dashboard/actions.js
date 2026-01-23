// src/app/dashboard/actions.js
'use server';

import { cookies } from 'next/headers';
import { getOrSetCached } from '@/lib/cache/serverCache';
import request from '@/lib/api/request';

/**
 * DASHBOARD SERVER ACTIONS
 * All widget data fetching happens server-side for SSR and caching
 * Similar pattern to Azure Invoice and Invoices pages
 */

/**
 * Fetch mpsaStatus to get widget flags (cached for 10 minutes)
 */
export async function fetchMpsaStatus(accessToken, soldToId) {
  console.log('🔵 [SERVER ACTION] fetchMpsaStatus CALLED for soldToId:', soldToId);
  try {
    const cacheKey = `mpsa-status:${soldToId}`;
    console.log('🔑 Cache key:', cacheKey);
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 ⚠️  CACHE MISS - fetching mpsaStatus from API for soldToId:', soldToId);
        console.log('🌐 Making HTTP request to mpsaStatus endpoint...');
        
        const response = await request.get('mpsaStatus', {
          pathParam: soldToId,
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        console.log('✅ HTTP response received from mpsaStatus API');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 FULL mpsaStatus API RESPONSE:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Return only serializable data - no Axios response objects
        return {
          data: response.data,
          status: response.status,
          statusText: response.statusText
        };
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('✅ mpsaStatus data served:', data._fromCache ? '🟢 CACHE HIT' : '🔴 CACHE MISS');
    return { error: null, data, cached: data._fromCache };
  } catch (error) {
    console.error('❌ fetchMpsaStatus error:', error);
    return { error: error?.message || 'Failed to fetch MPSA status', data: null, cached: false };
  }
}

/**
 * Fetch Azure Spend Widget data (cached for 10 minutes)
 */
export async function fetchAzureSpendWidget(accessToken, soldToId) {
  try {
    const cacheKey = `azure-spend-widget:${soldToId}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching Azure Spend Widget from API');
        
        const response = await request.post('getAzureSpendWidget', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          data: [soldToId]
        });
        
        // request.post() already returns unwrapped data, not axios response
        return {
          data: response,
          status: 200,
          statusText: 'OK'
        };
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('✅ Azure Spend Widget data served:', data._fromCache ? 'CACHE HIT' : 'CACHE MISS');
    return { error: null, data, cached: data._fromCache };
  } catch (error) {
    console.error('❌ fetchAzureSpendWidget error:', error);
    return { error: error?.message || 'Failed to fetch Azure Spend Widget', data: null, cached: false };
  }
}

/**
 * Fetch MS Cloud Widget data (cached for 10 minutes)
 */
export async function fetchMSCloudWidget(accessToken, soldToId) {
  try {
    const cacheKey = `mscloud-widget:${soldToId}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching MS Cloud Widget from API');
        
        const response = await request.post('getMSCloudWidget', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          data: [soldToId]
        });
        
        // request.post() already returns unwrapped data, not axios response
        return {
          data: response,
          status: 200,
          statusText: 'OK'
        };
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('✅ MS Cloud Widget data served:', data._fromCache ? 'CACHE HIT' : 'CACHE MISS');
    return { error: null, data, cached: data._fromCache };
  } catch (error) {
    console.error('❌ fetchMSCloudWidget error:', error);
    return { error: error?.message || 'Failed to fetch MS Cloud Widget', data: null, cached: false };
  }
}

/**
 * Fetch M365 Widget data (cached for 10 minutes)
 */
export async function fetchM365Widget(accessToken, soldToId) {
  try {
    const cacheKey = `m365-widget:${soldToId}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching M365 Widget from API');
        
        const response = await request.post('getM365Widget', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          data: [soldToId]
        });
        
        // request.post() already returns unwrapped data, not axios response
        return {
          data: response,
          status: 200,
          statusText: 'OK'
        };
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('✅ M365 Widget data served:', data._fromCache ? 'CACHE HIT' : 'CACHE MISS');
    return { error: null, data, cached: data._fromCache };
  } catch (error) {
    console.error('❌ fetchM365Widget error:', error);
    return { error: error?.message || 'Failed to fetch M365 Widget', data: null, cached: false };
  }
}

/**
 * Fetch AWS Spend Widget data (cached for 10 minutes)
 */
export async function fetchAwsSpendWidget(accessToken, soldToId) {
  try {
    const cacheKey = `aws-spend-widget:${soldToId}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching AWS Spend Widget from API');
        
        const response = await request.post('getAwsSpendWidget', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          data: [soldToId]
        });
        
        // request.post() already returns unwrapped data, not axios response
        return {
          data: response,
          status: 200,
          statusText: 'OK'
        };
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('✅ AWS Spend Widget data served:', data._fromCache ? 'CACHE HIT' : 'CACHE MISS');
    return { error: null, data, cached: data._fromCache };
  } catch (error) {
    console.error('❌ fetchAwsSpendWidget error:', error);
    return { error: error?.message || 'Failed to fetch AWS Spend Widget', data: null, cached: false };
  }
}

/**
 * Fetch Adobe Spend Widget data (cached for 10 minutes)
 */
export async function fetchAdobeSpendWidget(accessToken, soldToId) {
  try {
    const cacheKey = `adobe-spend-widget:${soldToId}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching Adobe Spend Widget from API');
        
        const response = await request.post('getAdobeSpendWidget', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          data: [soldToId]
        });
        
        // request.post() already returns unwrapped data, not axios response
        return {
          data: response,
          status: 200,
          statusText: 'OK'
        };
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('✅ Adobe Spend Widget data served:', data._fromCache ? 'CACHE HIT' : 'CACHE MISS');
    return { error: null, data, cached: data._fromCache };
  } catch (error) {
    console.error('❌ fetchAdobeSpendWidget error:', error);
    return { error: error?.message || 'Failed to fetch Adobe Spend Widget', data: null, cached: false };
  }
}

/**
 * Fetch MPSA Widget data (cached for 10 minutes)
 */
export async function fetchMPSAWidget(accessToken, soldToId) {
  try {
    const cacheKey = `mpsa-widget:${soldToId}`;
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 Cache MISS - fetching MPSA Widget from API');
        
        const response = await request.post('getMPSAWidget', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          data: [soldToId]
        });
        
        // request.post() already returns unwrapped data, not axios response
        return {
          data: response,
          status: 200,
          statusText: 'OK'
        };
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('✅ MPSA Widget data served:', data._fromCache ? 'CACHE HIT' : 'CACHE MISS');
    return { error: null, data, cached: data._fromCache };
  } catch (error) {
    console.error('❌ fetchMPSAWidget error:', error);
    return { error: error?.message || 'Failed to fetch MPSA Widget', data: null, cached: false };
  }
}

/**
 * CONSOLIDATED DASHBOARD DATA FETCH
 * Fetches mpsaStatus first to get widget flags, then fetches enabled widgets in parallel
 * Uses Promise.allSettled to prevent one widget failure from blocking others
 * Similar pattern to WidgetColumns.jsx but server-side
 */
export async function fetchConsolidatedDashboardData(accessToken, soldToId, bypassCache = false) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [SERVER ACTION] fetchConsolidatedDashboardData CALLED');
    console.log('   soldToId:', soldToId);
    console.log('   hasToken:', !!accessToken);
    console.log('   bypassCache:', bypassCache);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const cacheKey = `dashboard-consolidated:${soldToId}`;
    console.log('🔑 Consolidated cache key:', cacheKey);
    
    // If bypassCache is true, clear this specific cache entry first
    if (bypassCache) {
      console.log('🚩 BYPASS CACHE FLAG DETECTED - clearing cache for this soldToId');
      const { invalidateCache } = await import('@/lib/cache/serverCache');
      await invalidateCache(cacheKey);
    }
    
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        console.log('📥 ⚠️  CONSOLIDATED CACHE MISS - fetching all dashboard data');
        console.log('📌 Step 1: Calling fetchMpsaStatus...');
        
        // Step 1: Fetch mpsaStatus to get widget flags
        const mpsaResult = await fetchMpsaStatus(accessToken, soldToId);
        
        if (mpsaResult.error || !mpsaResult.data) {
          return {
            error: mpsaResult.error,
            mpsaStatus: null,
            widgets: {},
            widgetFlags: null
          };
        }
        
        // Extract widget flags from mpsaStatus response
        const mpsaData = mpsaResult.data.data || mpsaResult.data;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 WIDGET FLAG EXTRACTION DEBUG:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('mpsaData structure:', JSON.stringify(mpsaData, null, 2));
        console.log('');
        console.log('Looking for properties:');
        console.log('  - mpsaData.microsoft:', mpsaData?.microsoft);
        console.log('  - mpsaData.aws:', mpsaData?.aws);
        console.log('  - mpsaData.adobe:', mpsaData?.adobe);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const widgetFlags = {
          isAzureSpendWidgetDataState: mpsaData?.microsoft?.hasAzureSpendWidgetData ?? false,
          isM365WidgetDataState: mpsaData?.microsoft?.hasM365WidgetData ?? false,
          isMSSpendWidgetDataState: mpsaData?.microsoft?.hasMSSpendWidgetData ?? false,
          isAwsSpendWidgetDataState: mpsaData?.aws?.hasSpendWidgetData ?? false,
          isAdobeWidgetDataState: mpsaData?.adobe?.hasSpendWidgetData ?? false,
          isMPSAWidgetDataState: mpsaData?.microsoft?.haveMPSAData ?? false,
          hasReservedInstanceOrAzureSavingsPlan: mpsaData?.microsoft?.hasReservedInstanceOrAzureSavingsPlan ?? false,
          unlimitedCspTags: mpsaData?.microsoft?.unlimitedCspTags ?? false,
          hasConsumptionData: mpsaData?.aws?.hasConsumptionData ?? false
        };
        
        console.log('✅ Widget flags extracted:', widgetFlags);
        
        // Step 2: Build parallel fetch array based on enabled widgets
        const widgetPromises = [];
        const widgetKeys = [];
        
        if (widgetFlags.isAzureSpendWidgetDataState) {
          widgetKeys.push('azureSpend');
          widgetPromises.push(fetchAzureSpendWidget(accessToken, soldToId));
        }
        
        if (widgetFlags.isM365WidgetDataState) {
          widgetKeys.push('m365');
          widgetPromises.push(fetchM365Widget(accessToken, soldToId));
        }
        
        if (widgetFlags.isMSSpendWidgetDataState) {
          widgetKeys.push('msCloud');
          widgetPromises.push(fetchMSCloudWidget(accessToken, soldToId));
        }
        
        if (widgetFlags.isAwsSpendWidgetDataState) {
          widgetKeys.push('awsSpend');
          widgetPromises.push(fetchAwsSpendWidget(accessToken, soldToId));
        }
        
        if (widgetFlags.isAdobeWidgetDataState) {
          widgetKeys.push('adobeSpend');
          widgetPromises.push(fetchAdobeSpendWidget(accessToken, soldToId));
        }
        
        if (widgetFlags.isMPSAWidgetDataState) {
          widgetKeys.push('mpsa');
          widgetPromises.push(fetchMPSAWidget(accessToken, soldToId));
        }
        
        // Step 3: Fetch all enabled widgets in parallel (Promise.allSettled pattern)
        const widgetResults = await Promise.allSettled(widgetPromises);
        
        // Step 4: Build widgets object with results
        const widgets = {};
        widgetResults.forEach((result, index) => {
          const key = widgetKeys[index];
          if (result.status === 'fulfilled' && result.value.data) {
            // result.value = {error, data, cached}
            // result.value.data = {data: actualData, status, statusText}
            // So we need result.value.data.data to get the actual widget data
            widgets[key] = result.value.data;
            console.log(`✅ Widget ${key} data loaded:`, !!widgets[key].data);
          } else if (result.status === 'rejected') {
            console.error(`❌ Widget ${key} failed:`, result.reason);
            widgets[key] = { error: result.reason?.message || 'Failed to load' };
          } else {
            console.error(`❌ Widget ${key} error:`, result.value.error);
            widgets[key] = { error: result.value.error || 'Failed to load' };
          }
        });
        
        console.log('✅ Dashboard data fetched:', {
          mpsaStatus: !!mpsaResult.data,
          widgetsCount: Object.keys(widgets).length,
          widgetKeys
        });
        
        return {
          mpsaStatus: mpsaResult.data,
          widgets,
          widgetFlags,
          error: null
        };
      },
      10 * 60 * 1000 // 10 minutes cache
    );
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Consolidated Dashboard data served:');
    console.log('   Status:', data._fromCache ? '🟢 CACHE HIT (no API calls made)' : '🔴 CACHE MISS (fresh API data)');
    console.log('   Widget Count:', data.widgets ? Object.keys(data.widgets).length : 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return {
      error: null,
      data,
      cached: data._fromCache
    };
  } catch (error) {
    console.error('❌ fetchConsolidatedDashboardData error:', error);
    return {
      error: error?.message || 'Failed to fetch dashboard data',
      data: null,
      cached: false
    };
  }
}
