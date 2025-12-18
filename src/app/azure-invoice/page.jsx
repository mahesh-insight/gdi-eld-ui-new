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
 */

export default async function AzureInvoicePage() {
  console.log('🎯 SERVER: Rendering Azure Invoice page with SSR...');
  
  // Get user context from server-side cookies
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  
  if (!userContextCookie) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Authentication Required</h2>
        <p>Please log in to access the Azure Invoice dashboard.</p>
        <a href="/" style={{ color: '#007bff' }}>Return to Login</a>
      </div>
    );
  }
  
  let userContext;
  try {
    userContext = JSON.parse(userContextCookie.value);
  } catch (error) {
    console.error('❌ SERVER: Failed to parse user context:', error);
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Authentication Error</h2>
        <p>Invalid user context. Please log in again.</p>
        <a href="/" style={{ color: '#007bff' }}>Return to Login</a>
      </div>
    );
  }
  
  const { soldToId } = userContext;
  
  if (!soldToId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Missing Data</h2>
        <p>User context incomplete. Please log in again.</p>
        <a href="/" style={{ color: '#007bff' }}>Return to Login</a>
      </div>
    );
  }
  
  // SERVER-SIDE DATA FETCHING - runs on server, not in browser
  console.log('🚀 SERVER: Starting server-side data fetch for soldToId:', soldToId);
  
  let initialData = null;
  let ssrError = null;
  
  try {
    // Fetch all data in parallel on the server
    const startTime = Date.now();
    
    // Get first month for invoice details (assuming monthsResponse has the data)
    const monthsData = await fetchInvoiceMonthsServer(soldToId);
    const firstMonth = monthsData?.data?.invoiceMonths?.[0]?.value || '202512'; // Default to current month
    console.log('📅 SERVER: Using first month for invoice details:', firstMonth);
    
    const [monthsResponse, summaryResponse, creditsResponse, trendsResponse, invoiceDetailsResponse] = await Promise.all([
      Promise.resolve(monthsData), // Already fetched above
      fetchSummaryDataServer(soldToId, null), // null = fetch for first month
      fetchCreditsDataServer(soldToId, null),
      fetchTrendsDataServer(soldToId, null),
      fetchInvoiceDetailsServer(soldToId, firstMonth)
    ]);
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ SERVER: Data fetched in ${fetchTime}ms`);
    
    // Check for errors
    if (monthsResponse.error) {
      console.error('❌ SERVER: Months error:', monthsResponse.error);
      ssrError = monthsResponse.error;
    } else {
      initialData = {
        monthsResponse,
        summaryResponse,
        creditsResponse,
        trendsResponse,
        invoiceDetailsResponse
      };
      
      console.log('✅ SERVER: Initial data prepared:', {
        hasMonths: !!monthsResponse?.data?.invoiceMonths,
        monthsCount: monthsResponse?.data?.invoiceMonths?.length || 0,
        hasSummary: !!summaryResponse?.data,
        hasCredits: !!creditsResponse?.data,
        hasTrends: !!trendsResponse?.data,
        hasInvoiceDetails: !!invoiceDetailsResponse?.data,
        invoiceDetailsCount: invoiceDetailsResponse?.data?.content?.length || invoiceDetailsResponse?.data?.length || 0
      });
    }
  } catch (error) {
    console.error('❌ SERVER: Data fetch error:', error);
    ssrError = error.message;
  }
  
  // Error state
  if (ssrError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Data Fetch Error</h2>
        <p>Failed to load invoice data: {ssrError}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '15px'
          }}
        >
          Retry
        </button>
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
          dataFetchTime: 0,
          totalSSRTime: 0,
          cacheStatus: 'FRESH_SSR',
          cacheHitRatio: 0,
          timestamp: new Date().toLocaleTimeString()
        }}
      />
    </div>
  );
}
