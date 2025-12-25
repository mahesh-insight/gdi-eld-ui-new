// src/app/invoices/page.jsx
import { cookies } from 'next/headers';
import InvoicesClientContent from './InvoicesClientContent';
import {
  fetchProvidersServer,
  fetchInvoiceMonthsServer,
  fetchConsolidatedInvoiceData
} from './actions';

/**
 * TRUE SERVER-SIDE RENDERING (SSR):
 * - This is a SERVER component (no 'use client')
 * - Data is fetched on the server during page render
 * - HTML is sent to browser with data already populated
 * - No browser API calls on initial load
 * - Client component receives pre-fetched data as props
 */

export default async function InvoicesPage() {
  console.log('🎯 SERVER: Rendering Invoices page with SSR...');
  
  // Get user context from server-side cookies
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  
  if (!userContextCookie) {
    console.log('⚠️ SERVER: No user_context cookie found - rendering client fallback');
    return <InvoicesClientContent mode="client-side" />;
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
    // Fetch all data using caching on the server
    const startTime = Date.now();
    
    // First get providers to determine default provider (cached)
    const providersData = await fetchProvidersServer(soldToId);
    if (providersData.error) {
      throw new Error(`Providers fetch failed: ${providersData.error}`);
    }
    
    const defaultProvider = providersData?.data?.find(p => p.abbreviation === 'microsoft') || providersData?.data?.[0];
    if (!defaultProvider) {
      throw new Error('No providers available');
    }
    
    const apiEndpoint = defaultProvider.abbreviation;
    
    // Get invoice months for the default provider (cached)
    const invoiceMonthsData = await fetchInvoiceMonthsServer(soldToId, { abbreviation: apiEndpoint });
    if (invoiceMonthsData.error) {
      throw new Error(`Invoice months fetch failed: ${invoiceMonthsData.error}`);
    }
    
    const firstMonth = invoiceMonthsData?.data?.[0]?.value || '202412'; // Default to current month
    
    console.log('📅 SERVER: Using provider:', apiEndpoint, 'and first month:', firstMonth);
    
    // Use consolidated cached fetch for summary, trend, and details data
    const consolidatedData = await fetchConsolidatedInvoiceData(
      soldToId,
      apiEndpoint,
      firstMonth,
      null // No specific invoice filter for initial SSR load
    );
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ SERVER: Data fetched in ${fetchTime}ms`);
    
    if (consolidatedData.error) {
      throw new Error(`Consolidated data fetch failed: ${consolidatedData.error}`);
    }
    
    // Extract data from consolidated response
    const { summaryResponse, trendResponse, detailsResponse } = consolidatedData.data;
    
    initialData = {
      providersResponse: providersData,
      invoiceMonthsResponse: invoiceMonthsData,
      summaryResponse,
      trendResponse,
      detailsResponse,
      defaultProvider,
      firstMonth
    };
    
    console.log('✅ SERVER: Initial data prepared:', {
      hasProviders: !!providersData?.data,
      providersCount: providersData?.data?.length || 0,
      hasInvoiceMonths: !!invoiceMonthsData?.data,
      monthsCount: invoiceMonthsData?.data?.length || 0,
      hasSummary: !!summaryResponse?.data,
      hasTrend: !!trendResponse?.data,
      hasDetails: !!detailsResponse?.data,
      detailsCount: detailsResponse?.data?.content?.length || detailsResponse?.data?.length || 0
    });
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
        <a 
          href="/invoices"
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
      <InvoicesClientContent 
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