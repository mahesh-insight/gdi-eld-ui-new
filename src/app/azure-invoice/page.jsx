// src/app/azure-invoice/page.jsx
import { cookies } from 'next/headers';
import AzureInvoiceClientContent from './AzureInvoiceClientContent';
import { 
  fetchInvoiceMonthsServer, 
  fetchSummaryDataServer, 
  fetchCreditsDataServer, 
  fetchTrendsDataServer 
} from './actions';

export default async function AzureInvoicePage() {
  console.log('🎯 SERVER: Page rendering on server...');
  
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  const azureCacheCookie = cookieStore.get('azure_cache_metadata');
  
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
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Authentication Error</h2>
        <p>Invalid user context.</p>
      </div>
    );
  }
  
  const { soldToId } = userContext;
  
  if (!soldToId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Missing Data</h2>
        <p>User context incomplete.</p>
      </div>
    );
  }
  
  // Fetch data using server actions (with built-in caching)
  console.log('🎯 SERVER: Loading data for soldToId (using server cache)');
  const dataStartTime = Date.now();
  
  try {
    const monthsResponse = await fetchInvoiceMonthsServer(soldToId);
    const firstMonth = monthsResponse?.data?.invoiceMonths?.[0];
    
    if (!firstMonth) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>No Data Available</h2>
        </div>
      );
    }
    
    console.log('🎯 SERVER: First month:', firstMonth.value);
    
    const [summaryResponse, creditsResponse, trendsResponse] = await Promise.all([
      fetchSummaryDataServer(soldToId, firstMonth),
      fetchCreditsDataServer(soldToId, firstMonth),
      fetchTrendsDataServer(soldToId, firstMonth)
    ]);
    
    const dataTime = Date.now() - dataStartTime;
    console.log(`✅ SERVER: Data fetched in ${dataTime}ms`);
    
    const initialData = {
      monthsResponse,
      summaryResponse,
      creditsResponse,
      trendsResponse
    };
    
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
        <AzureInvoiceClientContent 
          mode="true-ssr"
          initialData={initialData}
          userContext={userContext}
          ssrPerformance={{
            dataFetchTime: dataTime,
            totalSSRTime: dataTime,
            cacheStatus: 'SERVER_RENDERED',
            timestamp: new Date().toLocaleTimeString()
          }}
        />
      </div>
    );
  } catch (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Data Fetch Error</h2>
        <p>{error.message}</p>
      </div>
    );
  }
}
