// src/app/subscriptions/page.jsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isJwtExpired } from '@/lib/auth-utils';
import SubscriptionsClient from './SubscriptionsClient';
import { fetchConsolidatedSubscriptionsData } from './actions';

export const metadata = {
  title: 'Subscriptions',
};

export default async function SubscriptionsPage() {
  // ─── Auth check ─────────────────────────────────────────────────────────────
  const cookieStore     = await cookies();
  const userContextCookie  = cookieStore.get('user_context');
  const soldToIdCookie     = cookieStore.get('soldToId');
  const accessTokenCookie  = cookieStore.get('access_token');

  const hasSoldToId    = soldToIdCookie?.value || userContextCookie?.value;
  const tokenValue     = accessTokenCookie?.value;
  const hasAccessToken =
    tokenValue && tokenValue !== '{}' && tokenValue.length > 100 && !isJwtExpired(tokenValue);

  if (!hasSoldToId || !hasAccessToken) {
    redirect('/');
  }

  // ─── Resolve soldToId / userContext ─────────────────────────────────────────
  let soldToId    = soldToIdCookie?.value;
  let userContext = null;

  if (!soldToId && userContextCookie) {
    try {
      userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
      soldToId    = userContext?.userProfile?.defaultContext?.[0]?.soldToId || userContext?.soldToId;
    } catch {
      return <SubscriptionsClient mode="client-side" />;
    }
  } else if (userContextCookie && !userContext) {
    try {
      userContext = JSON.parse(decodeURIComponent(userContextCookie.value));
    } catch {
      userContext = { soldToId };
    }
  }
  if (!userContext && soldToId) userContext = { soldToId };
  if (!soldToId) return <SubscriptionsClient mode="client-side" />;

  // ─── SSR data fetch ──────────────────────────────────────────────────────────
  let initialData = null;

  try {
    const res = await fetchConsolidatedSubscriptionsData(soldToId, 'Active');
    if (!res.error && res.data) {
      initialData = res.data;
    }
  } catch (error) {
    console.error('❌ SERVER: Subscriptions SSR fetch failed:', error);
  }

  // Fall back to client-side mode when SSR didn't produce useful data.
  // This ensures the client retries the API calls from the browser.
  if (!initialData?.summary) {
    return <SubscriptionsClient mode="client-side" userContext={userContext} />;
  }

  return (
    <SubscriptionsClient
      mode="ssr"
      initialData={initialData}
      userContext={userContext}
    />
  );
}
