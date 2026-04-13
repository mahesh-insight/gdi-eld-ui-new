// src/app/invoices/page.jsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import InvoicesClientContent from './InvoicesClientContent';
import {
  fetchProvidersServer,
  fetchInvoiceMonthsServer,
  fetchConsolidatedInvoiceData
} from './actions';
import { fetchMpsaStatus } from '../dashboard/actions';
import { isJwtExpired } from '@/lib/auth-utils';

/**
 * TRUE SERVER-SIDE RENDERING (SSR):
 * - This is a SERVER component (no 'use client')
 * - Data is fetched on the server during page render
 * - HTML is sent to browser with data already populated
 * - No browser API calls on initial load
 * - Client component receives pre-fetched data as props
 */

export const metadata = {
  title: 'Invoices',
};

export default async function InvoicesPage() {
  console.log('🎯 SERVER: Rendering Invoices page with SSR...');
  
  // Get authentication data from server-side cookies (same pattern as azure-invoice)
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  const soldToIdCookie = cookieStore.get('soldToId');
  const accessTokenCookie = cookieStore.get('access_token');
  
  // Check if we have enough data for SSR
  const hasSoldToId = soldToIdCookie?.value || userContextCookie?.value;
  const tokenValue = accessTokenCookie?.value;
  const hasAccessToken = tokenValue && tokenValue !== '{}' && tokenValue.length > 100 && !isJwtExpired(tokenValue);
  
  if (!hasSoldToId || !hasAccessToken) {
    const expired = tokenValue && isJwtExpired(tokenValue);
    console.log('⚠️ SERVER: Missing or expired authentication — redirecting to login', {
      hasSoldToId: !!hasSoldToId,
      hasAccessToken: !!hasAccessToken,
      tokenExpired: !!expired
    });
    redirect('/');
  }
  
  // Extract soldToId for server-side data fetching (same pattern as azure-invoice)
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
      return <InvoicesClientContent mode="client-side" />;
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
    return <InvoicesClientContent mode="client-side" />;
  }

  // SERVER-SIDE DATA FETCHING - runs on server, not in browser
  console.log('🚀 SERVER: Starting server-side data fetch for soldToId:', soldToId);
  
  let initialData = null;
  let ssrError = null;
  
  try {
    // Fetch all data using caching on the server
    const startTime = Date.now();
    
    // First get MPSA status to get feature flags (cached)
    const mpsaStatusData = await fetchMpsaStatus(accessTokenCookie.value, soldToId);
    const mpsaData = mpsaStatusData?.data?.data || mpsaStatusData?.data;
    const hasReservedInstanceOrAzureSavingsPlan = mpsaData?.microsoft?.hasReservedInstanceOrAzureSavingsPlan ?? false;
    
    console.log('🔍 SERVER: MPSA Status fetched:', {
      hasMpsaData: !!mpsaData,
      hasReservedInstanceOrAzureSavingsPlan
    });
    
    // Get providers to determine default provider (cached)
    const providersData = await fetchProvidersServer(soldToId);
    if (providersData.error) {
      throw new Error(`Providers fetch failed: ${providersData.error}`);
    }
    
    // ✅ Use first provider from list as default (not always microsoft)
    const defaultProvider = providersData?.data?.[0];
    if (!defaultProvider) {
      throw new Error('No providers available');
    }
    
    console.log('📌 SERVER: Default provider set to first option:', defaultProvider.abbreviation);
    
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
      firstMonth,
      fetchTime,
      mpsaData, // Store full MPSA data for reuse in client component
      hasReservedInstanceOrAzureSavingsPlan
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
  
  // If SSR fetch failed with an auth-related error, redirect to login.
  // For other transient errors, fall back to client-side so the user can still interact.
  if (ssrError) {
    const isAuthError = ssrError.includes('401') || ssrError.includes('403') ||
                        ssrError.toLowerCase().includes('unauthorized') ||
                        ssrError.toLowerCase().includes('forbidden');
    if (isAuthError) {
      console.warn('⚠️ SERVER: Auth error during SSR fetch — redirecting to login:', ssrError);
      redirect('/');
    }
    console.warn('⚠️ SERVER: Non-auth SSR error — falling back to client-side mode:', ssrError);
    return <InvoicesClientContent mode="client-side" />;
  }
  
  console.log('✅ SERVER: Rendering InvoicesClientContent with:', {
    mode: 'ssr',
    userContextSoldToId: userContext?.soldToId,
    hasInitialData: !!initialData
  });
  
  return (
    <div>
      <InvoicesClientContent 
        mode="ssr"
        initialData={initialData}
        userContext={userContext}
        ssrPerformance={{
          dataFetchTime: initialData ? initialData.fetchTime || 0 : 0,
          totalSSRTime: initialData ? initialData.fetchTime || 0 : 0,
          cacheStatus: 'FRESH_SSR',
          cacheHitRatio: 0,
          timestamp: new Date().toLocaleTimeString()
        }}
      />
    </div>
  );
}

// Enable Next.js caching for this page
export const revalidate = 600; // 10 minutes cache