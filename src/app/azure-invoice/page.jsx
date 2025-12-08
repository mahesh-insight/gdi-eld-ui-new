// src/app/azure-invoice/page.jsx
import { cookies } from 'next/headers';
import { cache } from 'react';
import { 
  fetchInvoiceMonthsServer, 
  fetchSummaryDataServer, 
  fetchCreditsDataServer, 
  fetchTrendsDataServer 
} from './actions';
import AzureInvoiceClientContent from './AzureInvoiceClientContent';

// React cache for per-request deduplication
// Server actions have their own 5-minute cache layer for persistence

const getCachedAzureData = cache(async (soldToId) => {
  console.log('🔄 Fetching Azure data for soldToId:', soldToId);
  
  const [monthsResponse, summaryResponse, creditsResponse, trendsResponse] = await Promise.all([
    fetchInvoiceMonthsServer(soldToId),
    fetchSummaryDataServer(soldToId, null),
    fetchCreditsDataServer(soldToId, null),
    fetchTrendsDataServer(soldToId, null)
  ]);
  
  return {
    monthsResponse,
    summaryResponse, 
    creditsResponse,
    trendsResponse,
    timestamp: Date.now()
  };
});

/**
 * TRUE SSR ARCHITECTURE WITH CACHING:
 * 1. Data fetches on SERVER before HTML is sent
 * 2. Results are cached for instant subsequent loads
 * 3. Browser receives fully rendered HTML with data
 * 4. loading.jsx shows while server fetches data
 * 5. Zero API calls from browser on initial load
 */

// Force dynamic rendering for proper SSR with user-specific data
export const dynamic = 'force-dynamic';

export default async function AzureInvoicePage() {
  const startTime = Date.now();
  console.log('🏗️ Server: Azure Invoice page rendering with TRUE SSR');
  
  // Get user authentication from cookies (server-side)
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  
  if (!userContextCookie) {
    console.log('❌ Server: No user context found, redirecting to login');
    // Return a server-side redirect or error page
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
    userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
  } catch (error) {
    console.error('❌ Server: Failed to parse user context:', error);
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Authentication Error</h2>
        <p>Invalid authentication data. Please log in again.</p>
        <a href="/" style={{ color: '#007bff' }}>Return to Login</a>
      </div>
    );
  }
  
  const { soldToId } = userContext;
  
  if (!soldToId) {
    console.log('❌ Server: No soldToId found in user context');
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Missing User Data</h2>
        <p>Required user information is missing. Please log in again.</p>
        <a href="/" style={{ color: '#007bff' }}>Return to Login</a>
      </div>
    );
  }
  
  console.log('✅ Server: Fetching Azure data for soldToId:', soldToId);
  
  // Fetch all data on the server
  const dataStartTime = Date.now();
  let azureData;
  
  try {
    azureData = await getCachedAzureData(soldToId);
  } catch (error) {
    console.error('❌ Server: Failed to fetch Azure data:', error);
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Data Fetch Error</h2>
        <p>Failed to load invoice data. Please try again later.</p>
        <button onClick={() => window.location.reload()} style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px' 
        }}>
          Retry
        </button>
      </div>
    );
  }
  
  const dataTime = Date.now() - dataStartTime;
  const totalTime = Date.now() - startTime;
  
  console.log(`✅ Server: Data fetched in ${dataTime}ms, total SSR time: ${totalTime}ms`);
  
  // Check cache hit ratio
  const { monthsResponse, summaryResponse, creditsResponse, trendsResponse } = azureData;
  const serverCacheHits = [monthsResponse, summaryResponse, creditsResponse, trendsResponse]
    .filter(response => response?.data?._fromCache);
  const cacheHitRatio = serverCacheHits.length / 4;
  
  const cacheStatusText = cacheHitRatio === 1 ? 'FULLY CACHED' : 
                         cacheHitRatio > 0 ? `PARTIALLY CACHED (${serverCacheHits.length}/4)` : 
                         'FRESH';
  
  console.log(`📦 Server: Cache status - ${cacheStatusText} (${Math.round(cacheHitRatio * 100)}% hit rate)`);
  
  return (
    <div>
      <div style={{
        padding: '20px 40px',
        borderBottom: '1px solid #e1e5e9',
        backgroundColor: '#f8f9fa'
      }}>
        <h1 style={{ 
          margin: '0', 
          color: '#2c3e50',
          fontSize: '28px',
          fontWeight: '600'
        }}>
          Azure Invoice Dashboard
        </h1>
      </div>
      {/* Pass server-fetched data to client component - NO client-side API calls */}
      <AzureInvoiceClientContent 
        mode="true-ssr"
        initialData={azureData}
        userContext={userContext}
        ssrPerformance={{
          dataFetchTime: dataTime,
          totalSSRTime: totalTime,
          cacheStatus: cacheStatusText,
          cacheHitRatio: Math.round(cacheHitRatio * 100),
          timestamp: new Date().toLocaleTimeString()
        }}
      />
    </div>
  );
}
