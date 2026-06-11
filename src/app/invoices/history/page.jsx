// src/app/invoices/history/page.jsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isJwtExpired } from '@/lib/auth-utils';
import InvoiceHistoryClientContent from './InvoiceHistoryClientContent';
import { fetchConsolidatedInvoiceHistory, fetchInvoiceHistoryProviders } from './actions';

export const metadata = {
  title: 'Invoice History',
};

export default async function InvoiceHistoryPage() {
  console.log('🎯 SERVER: Rendering Invoice History page with SSR...');

  const cookieStore = await cookies();
  const userContextCookie   = cookieStore.get('user_context');
  const soldToIdCookie      = cookieStore.get('soldToId');
  const accessTokenCookie   = cookieStore.get('access_token');

  const hasSoldToId  = soldToIdCookie?.value || userContextCookie?.value;
  const tokenValue   = accessTokenCookie?.value;
  const hasAccessToken = tokenValue && tokenValue !== '{}' && tokenValue.length > 100 && !isJwtExpired(tokenValue);

  if (!hasSoldToId || !hasAccessToken) {
    const expired = tokenValue && isJwtExpired(tokenValue);
    console.log('⚠️ SERVER: Missing or expired authentication — redirecting to login', {
      hasSoldToId: !!hasSoldToId,
      hasAccessToken: !!hasAccessToken,
      tokenExpired: !!expired,
    });
    redirect('/');
  }

  // ─── Resolve soldToId ───────────────────────────────────────────────────
  let soldToId = soldToIdCookie?.value;
  let userContext = null;

  if (!soldToId && userContextCookie) {
    try {
      userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
      soldToId = userContext?.userProfile?.defaultContext?.[0]?.soldToId || userContext?.soldToId;
    } catch (error) {
      console.error('❌ SERVER: Failed to parse user_context cookie:', error);
      return <InvoiceHistoryClientContent mode="client-side" />;
    }
  } else if (userContextCookie && !userContext) {
    try {
      userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
    } catch {
      userContext = { soldToId };
    }
  }

  if (!userContext && soldToId) userContext = { soldToId };

  if (!soldToId) {
    console.log('⚠️ SERVER: No soldToId, falling back to client-side mode');
    return <InvoiceHistoryClientContent mode="client-side" />;
  }

  // ─── SSR data fetch ─────────────────────────────────────────────────────
  let initialData = null;

  try {
    const result = await fetchConsolidatedInvoiceHistory(soldToId);
    if (result.error) {
      console.error('❌ SERVER: Consolidated fetch error:', result.error);
    } else {
      // Prepend "All" provider
      const providers = result.data?.providers || [];
      initialData = {
        ...result.data,
        providers: providers, // All option added client-side
      };
    }
  } catch (err) {
    console.error('❌ SERVER: Invoice History SSR fetch failed:', err);
  }

  console.log('✅ SERVER: Invoice History SSR complete', {
    hasInitialData: !!initialData,
    providers: initialData?.providers?.length ?? 0,
    months: initialData?.months?.length ?? 0,
    trendPoints: initialData?.trend?.chartData?.length ?? 0,
    gridRecords: initialData?.detail?.content?.length ?? 0,
  });

  if (!initialData) {
    return <InvoiceHistoryClientContent mode="client-side" userContext={userContext} />;
  }

  return (
    <InvoiceHistoryClientContent
      mode="ssr"
      initialData={initialData}
      userContext={userContext}
    />
  );
}
