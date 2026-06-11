// src/app/cloud/azure-unbilled/page.jsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isJwtExpired } from '@/lib/auth-utils';
import AzureConsumptionUnbilledClient from './AzureConsumptionUnbilledClient';
import { fetchUnbilledMonths, fetchConsolidatedUnbilledData } from './actions';

export const metadata = {
  title: 'Azure Consumption Unbilled',
};

export default async function AzureConsumptionUnbilled() {
  // ─── Auth check ────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const userContextCookie    = cookieStore.get('user_context');
  const soldToIdCookie       = cookieStore.get('soldToId');
  const accessTokenCookie    = cookieStore.get('access_token');

  const hasSoldToId    = soldToIdCookie?.value || userContextCookie?.value;
  const tokenValue     = accessTokenCookie?.value;
  const hasAccessToken =
    tokenValue && tokenValue !== '{}' && tokenValue.length > 100 && !isJwtExpired(tokenValue);

  if (!hasSoldToId || !hasAccessToken) {
    redirect('/');
  }

  // ─── Resolve soldToId + userContext ────────────────────────────────────────
  let soldToId   = soldToIdCookie?.value;
  let userContext = null;

  if (!soldToId && userContextCookie) {
    try {
      userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
      soldToId    = userContext?.userProfile?.defaultContext?.[0]?.soldToId || userContext?.soldToId;
    } catch {
      return <AzureConsumptionUnbilledClient mode="client-side" />;
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
    return <AzureConsumptionUnbilledClient mode="client-side" />;
  }

  // ─── SSR data fetch ─────────────────────────────────────────────────────────
  let initialData = null;

  try {
    // Fetch available months first
    const monthsRes = await fetchUnbilledMonths(soldToId);
    const months    = monthsRes.data || [];
    const firstMonth = months[0]?.value || null;

    if (firstMonth) {
      const consolidated = await fetchConsolidatedUnbilledData(soldToId, firstMonth);
      if (!consolidated.error) {
        initialData = { months, ...consolidated.data };
      } else {
        initialData = { months };
      }
    } else {
      initialData = { months: [] };
    }
  } catch (error) {
    console.error('❌ SERVER: Azure Unbilled SSR fetch failed:', error);
    // Fall back to client-side loading
    return <AzureConsumptionUnbilledClient mode="client-side" userContext={userContext} />;
  }

  return (
    <AzureConsumptionUnbilledClient
      mode="ssr"
      initialData={initialData}
      userContext={userContext}
    />
  );
}
