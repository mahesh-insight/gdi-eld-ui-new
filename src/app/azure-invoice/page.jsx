// src/app/azure-invoice/page.jsx
import { cookies } from 'next/headers';
import AzureInvoiceClientContent from './AzureInvoiceClientContent';
import { 
  fetchInvoiceMonthsServer, 
  fetchSummaryDataServer, 
  fetchCreditsDataServer, 
  fetchTrendsDataServer,
  fetchInvoiceDetailsServer
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
  
  // Extract soldToId for server-side data fetching (same pattern as invoices)
  let soldToId = soldToIdCookie?.value;
  let userContext = null;
  
  // If no direct soldToId cookie, try to extract from user_context
  if (!soldToId && userContextCookie) {
    try {
      userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
      soldToId = userContext?.userProfile?.defaultContext?.[0]?.soldToId || userContext?.soldToId;
      console.log('🔍 SERVER: Extracted soldToId from user_context:', soldToId);
    } catch (error) {
      console.error('❌ SERVER: Failed to parse user_context cookie:', error);
      return <AzureInvoiceClientContent mode="client-side" />;
    }
  } else if (userContextCookie && !userContext) {
    // Parse userContext even if we have soldToId from cookie for component props
    try {
      userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
    } catch (error) {
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
  console.log('🚀 SERVER: Starting server-side data fetch for soldToId:', soldToId);
  
  let initialData = null;
  let ssrError = null;
  
  try {
    // Fetch all data using caching on the server
    const startTime = Date.now();
    
    // Get first month for invoice details (cached)
    const monthsData = await fetchInvoiceMonthsServer(soldToId);
    if (monthsData.error) {
      throw new Error(`Months fetch failed: ${monthsData.error}`);
    }
    
    const firstMonth = monthsData?.data?.invoiceMonths?.[0]?.value || '202512'; // Default to current month
    console.log('📅 SERVER: Using first month for azure invoice details:', firstMonth);
    
    // Fetch all azure invoice data in parallel (all cached with 10-minute TTL)
    const [summaryData, creditsData, trendsData, detailsData] = await Promise.all([
      fetchSummaryDataServer(soldToId, firstMonth),
      fetchCreditsDataServer(soldToId, firstMonth),
      fetchTrendsDataServer(soldToId, firstMonth),
      fetchInvoiceDetailsServer(soldToId, firstMonth)
    ]);
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ SERVER: Azure invoice data fetched in ${fetchTime}ms`);
    
    // Log cache hit/miss status for debugging
    console.log('📊 SERVER: Cache status:', {
      months: monthsData._fromCache ? 'HIT' : 'MISS',
      summary: summaryData._fromCache ? 'HIT' : 'MISS', 
      credits: creditsData._fromCache ? 'HIT' : 'MISS',
      trends: trendsData._fromCache ? 'HIT' : 'MISS',
      details: detailsData._fromCache ? 'HIT' : 'MISS'
    });
    
    // Check for any errors in individual responses
    if (summaryData.error) console.warn('⚠️ Summary data error:', summaryData.error);
    if (creditsData.error) console.warn('⚠️ Credits data error:', creditsData.error);
    if (trendsData.error) console.warn('⚠️ Trends data error:', trendsData.error);
    if (detailsData.error) console.warn('⚠️ Details data error:', detailsData.error);
    
    initialData = {
      monthsResponse: monthsData,
      summaryResponse: summaryData,
      creditsResponse: creditsData,
      trendsResponse: trendsData,
      invoiceDetailsResponse: detailsData,
      fetchTime
    };
    
    console.log('✅ SERVER: Azure invoice initial data prepared:', {
      hasMonths: !!monthsData?.data,
      monthsCount: monthsData?.data?.invoiceMonths?.length || 0,
      hasSummary: !!summaryData?.data,
      hasCredits: !!creditsData?.data,
      hasTrends: !!trendsData?.data,
      hasInvoiceDetails: !!detailsData?.data,
      invoiceDetailsCount: detailsData?.data?.content?.length || detailsData?.data?.length || 0
    });
  } catch (error) {
    console.error('❌ SERVER: Azure invoice data fetch error:', error);
    ssrError = error.message;
  }
  
  // Error state
  if (ssrError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Data Fetch Error</h2>
        <p>Failed to load Azure invoice data: {ssrError}</p>
        <a 
          href="/azure-invoice"
          style={{ 
            display: 'inline-block',
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '4px',
            marginTop: '15px'
          }}
        >
          Retry
        </a>
      </div>
    );
  }
  
  return (
    <div>
      <AzureInvoiceClientContent 
        mode="ssr"
        initialData={initialData}
        userContext={userContext}
        ssrPerformance={{
          dataFetchTime: initialData ? initialData.fetchTime || 0 : 0,
          totalSSRTime: initialData ? initialData.fetchTime || 0 : 0,
          cacheStatus: 'CLEAN_SSR_WITH_10MIN_CACHE',
          cacheHitRatio: 0,
          timestamp: new Date().toLocaleTimeString()
        }}
        soldToId={soldToId}
      />
    </div>
  );
}
