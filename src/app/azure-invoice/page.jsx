// src/app/azure-invoice/page.jsx
import { cookies } from 'next/headers';
import AzureInvoiceClientContent from './AzureInvoiceClientContent';
import { 
  fetchConsolidatedAzureInvoiceData
} from './actions';

/**
 * TRUE SERVER-SIDE RENDERING (SSR):
 * - This is a SERVER component (no 'use client')
 * - Data is fetched on the server during page render
 * - HTML is sent to browser with data already populated
 * - No browser API calls on initial load
 * - Client component receives pre-fetched data as props
 * 
 * ⚡ CACHING STRATEGY:
 * - Data cache: 10 minutes (actual API data caching)
 * - Each API call is cached individually for optimal performance
 */

export default async function AzureInvoicePage() {
  console.log('🎯 SERVER: Rendering Azure Invoice page with SSR...');
  
  // Get authentication data from server-side cookies (same pattern as invoices)
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  const soldToIdCookie = cookieStore.get('soldToId');
  const accessTokenCookie = cookieStore.get('access_token');
  
  // Check if we have enough data for SSR
  const hasSoldToId = soldToIdCookie?.value || userContextCookie?.value;
  const hasAccessToken = accessTokenCookie?.value && accessTokenCookie.value !== '{}' && accessTokenCookie.value.length > 100;
  
  if (!hasSoldToId || !hasAccessToken) {
    console.log('⚠️ SERVER: Missing authentication data - rendering client fallback', {
      hasSoldToId: !!hasSoldToId,
      hasAccessToken: !!hasAccessToken,
      accessTokenLength: accessTokenCookie?.value?.length || 0
    });
    return <AzureInvoiceClientContent mode="client-side" />;
  }

  // Extract soldToId from cookies
  let soldToId = soldToIdCookie?.value;
  let userContext = null;
  
  // If we have user_context, extract data for component props
  if (userContextCookie?.value) {
    try {
      const parsedUserContext = JSON.parse(userContextCookie.value);
      soldToId = soldToId || parsedUserContext?.userProfile?.defaultContext?.[0]?.soldToId;
      userContext = {
        soldToId,
        firstName: parsedUserContext?.firstName,
        lastName: parsedUserContext?.lastName,
        username: parsedUserContext?.username,
        companyName: parsedUserContext?.userProfile?.defaultContext?.[0]?.soldToName
      };
    } catch (e) {
      console.warn('⚠️ SERVER: Failed to parse user_context for component props, using minimal context');
      userContext = { soldToId };
    }
  }
  
  // Create minimal userContext if we only have soldToId
  if (!userContext && soldToId) {
    userContext = { soldToId };
  }
  
  if (!soldToId) {
    console.log('⚠️ SERVER: No soldToId, falling back to client-side mode');
    return <AzureInvoiceClientContent mode="client-side" />;
  }

  // SERVER-SIDE DATA FETCHING - runs on server, not in browser
  console.log('🚀 SERVER: Starting server-side data fetch for Azure Invoice, soldToId:', soldToId);
  
  let initialData = null;
  let ssrError = null;
  
  try {
    const startTime = Date.now();
    
    // Fetch ALL data using single consolidated call (cached)
    console.log('🔍 SERVER: Fetching consolidated Azure Invoice data with soldToId:', soldToId);
    const consolidatedResult = await fetchConsolidatedAzureInvoiceData(accessTokenCookie.value, soldToId);

    const fetchTime = Date.now() - startTime;
    
    // Check for errors
    if (consolidatedResult.error) {
      throw new Error(`Consolidated fetch failed: ${consolidatedResult.error}`);
    }
    
    const data = consolidatedResult.data;
    
    initialData = {
      // Provide data in both formats for compatibility
      monthsResponse: { 
        data: { invoiceMonths: data?.invoiceMonths || [] },
        cached: consolidatedResult.cached
      },
      summaryResponse: { 
        data: data?.summary || null,
        cached: consolidatedResult.cached
      },
      creditsResponse: { 
        data: data?.credits || null,
        cached: consolidatedResult.cached
      },
      trendsResponse: { 
        data: data?.trend || null,
        cached: consolidatedResult.cached
      },
      monthDetailResponse: {
        data: data?.monthDetail || null,
        cached: consolidatedResult.cached
      },
      monthlyDifferenceResponse: {
        data: data?.monthlyDifference || null,
        cached: consolidatedResult.cached
      },
      // Direct properties for fallback
      invoiceMonths: data?.invoiceMonths || [],
      summary: data?.summary || null,
      credits: data?.credits || null,
      trend: data?.trend || null,
      monthDetail: data?.monthDetail || null,
      monthlyDifference: data?.monthlyDifference || null,
      fetchTime,
      timestamp: new Date().toISOString(),
      cacheInfo: {
        consolidatedCached: consolidatedResult.cached,
        allFromSameCache: true // All data from single consolidated cache
      }
    };

    console.log('✅ SERVER: Successfully pre-fetched Azure Invoice data', {
      monthsCount: data?.invoiceMonths?.length || 0,
      hasSummary: !!data?.summary,
      hasCredits: !!data?.credits,
      hasTrends: !!data?.trend,
      hasMonthDetail: !!data?.monthDetail,
      hasMonthlyDifference: !!data?.monthlyDifference,
      monthDetailLength: data?.monthDetail?.length || 0,
      monthlyDifferenceLength: data?.monthlyDifference?.length || 0,
      fetchTime: `${fetchTime}ms`,
      cacheHit: consolidatedResult.cached
    });

  } catch (error) {
    console.error('❌ SERVER: Azure Invoice SSR failed, falling back to client-side:', error);
    ssrError = error.message;
    // Fall back to client-side mode on server error
    return <AzureInvoiceClientContent mode="client-side" error={ssrError} />;
  }

  // SUCCESS: Return server-rendered content with pre-fetched data
  console.log('🎯 SERVER: Rendering Azure Invoice with pre-fetched data');
  
  return (
    <div>
      <AzureInvoiceClientContent 
        mode="ssr"
        initialData={initialData}
        userContext={userContext}
        ssrPerformance={{
          dataFetchTime: initialData ? initialData.fetchTime || 0 : 0,
          totalSSRTime: initialData ? initialData.fetchTime || 0 : 0,
          cacheStatus: 'FRESH_SSR',
          cacheHitRatio: initialData?.cacheInfo?.consolidatedCached ? 1 : 0,
          timestamp: new Date().toLocaleTimeString()
        }}
      />
    </div>
  );
}

// Enable Next.js caching for this page
export const revalidate = 600; // 10 minutes cache
