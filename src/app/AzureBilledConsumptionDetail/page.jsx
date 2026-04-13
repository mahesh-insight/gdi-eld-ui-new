// src/app/AzureBilledConsumptionDetail/page.jsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AzureBilledConsumptionDetailClient from './AzureBilledConsumptionDetailClient';
import { fetchConsolidatedBilledConsumptionData } from './actions';
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
  title: 'Azure Billed Consumption Detail',
};

export default async function AzureBilledConsumptionDetail() {
  console.log('🎯 SERVER: Rendering Azure Billed Consumption Detail page with SSR...');
  
  // Get authentication data from server-side cookies
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  const soldToIdCookie = cookieStore.get('soldToId');
  const accessTokenCookie = cookieStore.get('access_token');
  
  // Check if we have enough data for SSR
  const hasSoldToId = soldToIdCookie?.value || userContextCookie?.value;
  const tokenValue = accessTokenCookie?.value;
  const hasAccessToken = tokenValue && tokenValue !== '{}' && tokenValue.length > 100 && !isJwtExpired(tokenValue);
  
  if (!hasSoldToId || !hasAccessToken) {
    console.log('⚠️ SERVER: Missing or expired authentication — redirecting to login', {
      hasSoldToId: !!hasSoldToId,
      hasAccessToken: !!hasAccessToken,
      tokenExpired: tokenValue ? isJwtExpired(tokenValue) : 'no token'
    });
    redirect('/');
  }
  
  // Extract soldToId for server-side data fetching
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
      return <AzureBilledConsumptionDetailClient mode="client-side" />;
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
    return <AzureBilledConsumptionDetailClient mode="client-side" />;
  }

  // Get navigation context from cookie (set by chart click handler)
  const navigationCookie = cookieStore.get('billed_navigation');
  let navigationContext = null;
  
  console.log('🍪 SERVER: All cookies:', {
    hasBilledNav: !!navigationCookie,
    cookieValue: navigationCookie?.value,
    allCookieNames: Array.from((await cookies()).getAll()).map(c => c.name)
  });
  
  if (navigationCookie?.value) {
    try {
      navigationContext = JSON.parse(decodeURIComponent(navigationCookie.value));
      console.log('🔍 SERVER: Navigation context from cookie:', navigationContext);
      console.log('📅 SERVER: Month from context:', navigationContext.month);
      console.log('🏷️ SERVER: Label from context:', navigationContext.label);
      console.log('👤 SERVER: Customer from context:', navigationContext.customerValue);
      console.log('📄 SERVER: Invoice from context:', navigationContext.invoiceNumber);
    } catch (error) {
      console.error('❌ SERVER: Failed to parse navigation context:', error);
      console.log('Raw cookie value:', navigationCookie.value);
    }
  } else {
    console.warn('⚠️ SERVER: No billed_navigation cookie found!');
  }

  // SERVER-SIDE DATA FETCHING - runs on server, not in browser
  console.log('🚀 SERVER: Starting server-side data fetch for soldToId:', soldToId);
  
  let initialData = null;
  let ssrError = null;
  
  try {
    const startTime = Date.now();
    
    // Build filters from navigation context
    const filters = {};
    if (navigationContext?.label) {
      filters.productcategory = navigationContext.label;
    }
    // Always include limittenantid - either specific customer or 'All'
    filters.limittenantid = navigationContext?.customerValue || 'All';
    
    if (navigationContext?.invoiceNumber) {
      filters.invoicenumber = navigationContext.invoiceNumber;
    }
    
    // Use month from navigation context with fallback
    // If no navigation context (expired cookie or direct access), show error message instead of using current month
    if (!navigationContext?.month) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          backgroundColor: '#fff',
          margin: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#d13438', marginBottom: '16px' }}>Navigation Required</h2>
          <p style={{ marginBottom: '24px', color: '#666' }}>
            This page requires navigation context from the Invoices page.
            Please click on a chart element in the Invoice Breakdown by Product Category to view detailed consumption data.
          </p>
          <a 
            href="/invoices"
            style={{ 
              display: 'inline-block',
              padding: '12px 24px', 
              backgroundColor: '#ae0a46', 
              color: 'white', 
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: '500'
            }}
          >
            Go to Invoices Page
          </a>
        </div>
      );
    }
    
    const invoiceMonth = navigationContext.month;
    
    // Calculate consumption month (one month before invoice month)
    // Example: Invoice month 202508 (Aug) -> Consumption month 202507 (Jul)
    const invoiceYear = parseInt(invoiceMonth.substring(0, 4));
    const invoiceMonthNum = parseInt(invoiceMonth.substring(4, 6));
    let consumptionYear = invoiceYear;
    let consumptionMonthNum = invoiceMonthNum - 1;
    
    if (consumptionMonthNum === 0) {
      consumptionMonthNum = 12;
      consumptionYear = invoiceYear - 1;
    }
    
    const consumptionMonth = `${consumptionYear}${String(consumptionMonthNum).padStart(2, '0')}`;
    
    console.log('🔍 SERVER: Building filters:', filters);
    console.log('📅 SERVER: Invoice Month:', invoiceMonth);
    console.log('📅 SERVER: Consumption Month:', consumptionMonth);
    
    // Fetch consolidated data using caching on the server
    // Note: Pass both months in filters object for proper caching
    const consolidatedData = await fetchConsolidatedBilledConsumptionData(
      soldToId,
      invoiceMonth,
      { ...filters, consumptionMonth }
    );
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ SERVER: Data fetched in ${fetchTime}ms`);
    
    if (consolidatedData.error) {
      // Check for 401 authentication errors - throw error, let client handle redirect
      if (consolidatedData.error.includes('401') || 
          consolidatedData.error.includes('Authentication required') ||
          consolidatedData.error.includes('Unauthorized')) {
        console.log('🔒 SERVER: 401 Authentication error - client will handle logout');
      }
      throw new Error(`Consolidated data fetch failed: ${consolidatedData.error}`);
    }
    
    // Extract data from consolidated response
    const { totalsResponse, creditsResponse, summaryResponse, gridResponse, errors } = consolidatedData.data;
    
    initialData = {
      totalsResponse,
      creditsResponse,
      summaryResponse,
      gridResponse,
      errors,
      navigationContext,
      month: invoiceMonth,
      fetchTime
    };
    
    console.log('✅ SERVER: Initial data prepared:', {
      hasTotals: !!totalsResponse,
      hasCredits: !!creditsResponse,
      hasSummary: !!summaryResponse,
      hasGrid: !!gridResponse,
      gridRecords: gridResponse?.content?.length || 0,
      month: invoiceMonth
    });
  } catch (error) {
    console.error('❌ SERVER: Data fetch error:', error);
    ssrError = error.message;
  }
  
  // Always pass data to client component, including errors
  // Client will detect 401 and redirect, or show error UI for other errors
  return (
    <AzureBilledConsumptionDetailClient 
      mode="ssr"
      initialData={initialData}
      userContext={userContext}
      ssrError={ssrError}
      ssrPerformance={{
        dataFetchTime: initialData ? initialData.fetchTime || 0 : 0,
        totalSSRTime: initialData ? initialData.fetchTime || 0 : 0,
        cacheStatus: 'FRESH_SSR',
        timestamp: new Date().toLocaleTimeString()
      }}
    />
  );
}

// Enable Next.js caching for this page
export const revalidate = 600; // 10 minutes cache
