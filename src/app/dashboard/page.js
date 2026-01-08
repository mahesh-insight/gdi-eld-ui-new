// src/app/dashboard/page.js
import { cookies } from 'next/headers';
import DashboardClient from './DashboardClient';
import { fetchConsolidatedDashboardData } from './actions';

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
 * - Each widget API call is cached individually for optimal performance
 * - Consolidated dashboard data is also cached to avoid redundant mpsaStatus calls
 */

export const metadata = {
  title: 'Dashboard',
  description: 'User dashboard with authentication.',
};

// Force dynamic rendering to disable caching and see loading.js
// export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 [SERVER PAGE.JS] Dashboard page render started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Get authentication data from server-side cookies (same pattern as invoices/azure-invoice)
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  const soldToIdCookie = cookieStore.get('soldToId');
  const accessTokenCookie = cookieStore.get('access_token');
  
  console.log('🔍 [SERVER] Cookies inspection:');
  console.log('  - user_context exists:', !!userContextCookie);
  console.log('  - soldToId exists:', !!soldToIdCookie);
  console.log('  - access_token exists:', !!accessTokenCookie);
  console.log('  - access_token length:', accessTokenCookie?.value?.length || 0);
  console.log('  - access_token preview:', accessTokenCookie?.value?.substring(0, 50) + '...');
  
  // Check if we have enough data for SSR
  const hasSoldToId = soldToIdCookie?.value || userContextCookie?.value;
  const hasAccessToken = accessTokenCookie?.value && accessTokenCookie.value !== '{}' && accessTokenCookie.value.length > 100;
  
  console.log('🔍 [SERVER] SSR readiness check:');
  console.log('  - hasSoldToId:', !!hasSoldToId);
  console.log('  - hasAccessToken:', !!hasAccessToken);
  console.log('  - Will use SSR:', !!(hasSoldToId && hasAccessToken));
  
  if (!hasSoldToId || !hasAccessToken) {
    console.log('⚠️ [SERVER] Missing authentication data - rendering client fallback');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return <DashboardClient mode="client-side" />;
  }

  // Extract soldToId from cookies
  let soldToId = soldToIdCookie?.value;
  let userContext = null;
  
  // If we have user_context, extract data for component props
  if (userContextCookie?.value) {
    try {
      const parsedUserContext = JSON.parse(decodeURIComponent(userContextCookie.value));
      userContext = parsedUserContext;
      
      // Extract soldToId if not already set
      if (!soldToId) {
        soldToId = parsedUserContext?.userProfile?.defaultContext?.[0]?.soldToId || parsedUserContext?.soldToId;
        console.log('🔍 SERVER: Extracted soldToId from user_context:', soldToId);
      }
    } catch (e) {
      console.error('❌ SERVER: Failed to parse user_context cookie:', e);
    }
  }
  
  // Get access token
  const accessToken = accessTokenCookie?.value;
  
  if (!soldToId || !accessToken) {
    console.log('⚠️ SERVER: Missing soldToId or access token - rendering client fallback');
    return <DashboardClient mode="client-side" />;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 SERVER PAGE: About to call fetchConsolidatedDashboardData');
  console.log('   soldToId:', soldToId.substring(0, 20) + '...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // TESTING: Add artificial delay to see loading.js in action
  // await new Promise(resolve => setTimeout(resolve, 300));
  
  // Fetch consolidated dashboard data (mpsaStatus + all enabled widgets)
  const result = await fetchConsolidatedDashboardData(accessToken, soldToId);
  
  if (result.error) {
    console.error('❌ SERVER: Failed to fetch dashboard data:', result.error);
    return <DashboardClient mode="client-side" error={result.error} />;
  }
  
  console.log('✅ SERVER: Dashboard data fetched successfully', {
    cached: result.cached,
    hasData: !!result.data,
    widgetCount: result.data?.widgets ? Object.keys(result.data.widgets).length : 0
  });
  
  // Pass SSR data to client component
  return (
    <DashboardClient 
      mode="ssr" 
      ssrData={result.data}
      userContext={userContext}
      cached={result.cached}
    />
  );
}


// src/app/dashboard/page.jsx

/*import WidgetColumns from "./WidgetColumns";


export const dynamic = "force-dynamic"; // optional: ensure fresh SSR shell

export default function DashboardPage() {
  // This page is server-rendered, but all widget calls run in the
  // client-side WidgetColumns component.
  return <WidgetColumns />;
} */
