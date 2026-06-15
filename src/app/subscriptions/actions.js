// src/app/subscriptions/actions.js
'use server';

import { cookies } from 'next/headers';
import { getOrSetCached, invalidateCache } from '@/lib/cache/serverCache';
import { CacheTTL } from '@/lib/cache/cacheKeys';
import { getService } from '@/lib/api/services';

function getBaseURL() {
  return getService('providers').baseURL;
}

async function getAccessToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) throw new Error('Authentication required');
  return token;
}

async function apiPost(url, soldToId, accessToken) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(soldToId ? [soldToId] : []),
    cache: 'no-store',
  });
  if (response.status === 401) throw new Error('Authentication required - 401');
  if (!response.ok) throw new Error(`API error ${response.status}: ${url}`);
  return response.json();
}

/**
 * Build query string for subscription / license-detail APIs.
 * Filter operator: "equals" (e.g. filter=Status%20equals%20Active)
 */
function buildSubFilterQS({ status = 'Active', productNames, renewalPeriods, autoRenews, tenantId, page = 0, size = 20 } = {}) {
  const parts = [];
  if (page !== undefined) parts.push(`page=${page}`);
  if (size !== undefined) parts.push(`size=${size}`);
  if (tenantId && tenantId !== 'All') parts.push(`filter=limittenantid%3D${encodeURIComponent(tenantId)}`);
  parts.push(`filter=Status%20equals%20${encodeURIComponent(status)}`);
  if (productNames?.length) productNames.forEach(n => parts.push(`filter=offername%20equals%20${encodeURIComponent(n)}`));
  if (renewalPeriods?.length) renewalPeriods.forEach(r => parts.push(`filter=renewalperiod%20equals%20${encodeURIComponent(r)}`));
  if (autoRenews?.length) autoRenews.forEach(a => parts.push(`filter=autorenew%20equals%20${encodeURIComponent(a)}`));
  return parts.join('&');
}

/**
 * Build query string for history APIs.
 * Filter operator: "eq" (e.g. filter=Status%20eq%20Active)
 */
function buildHistoryFilterQS({
  status = 'Active',
  commitmentPeriod = 'Monthly',
  productNames,
  lookbackMonths = 12,
  includeUnchanged = true,
  page = 0,
  size = 20,
  forDetail = false,
} = {}) {
  const parts = [];
  if (forDetail) {
    parts.push(`page=${page}`);
    parts.push(`size=${size}`);
  }
  parts.push(`filter=Status%20eq%20${encodeURIComponent(status)}`);
  parts.push(`filter=commitmentperiod%20eq%20${encodeURIComponent(commitmentPeriod)}`);
  if (productNames?.length) productNames.forEach(n => parts.push(`filter=offerName%20eq%20${encodeURIComponent(n)}`));
  if (forDetail) {
    parts.push(`filter=includeunchanged%3D${includeUnchanged}`);
  } else {
    parts.push(`includeunchanged=${includeUnchanged}`);
    parts.push(`lookbackmonths=${lookbackMonths}`);
  }
  return parts.join('&');
}

// ─── Public server actions ──────────────────────────────────────────────────

/**
 * Fetch subscription + license summary (shared across all tabs).
 * POST /ccr-subscription-service/microsoft/summary?filter=Status%20equals%20{status}
 */
export async function fetchSubscriptionSummary(soldToId, status = 'Active') {
  try {
    const accessToken = await getAccessToken();
    const cacheKey = `sub-summary:${soldToId}:${status}`;
    const data = await getOrSetCached(cacheKey, async () => {
      const url = `${getBaseURL()}/ccr-subscription-service/microsoft/summary?filter=Status%20equals%20${encodeURIComponent(status)}`;
      return apiPost(url, soldToId, accessToken);
    }, CacheTTL.SHORT);
    return { error: null, data };
  } catch (e) {
    return { error: e.message, data: null };
  }
}

/**
 * Fetch paginated subscription detail (Tab 1 grid).
 * POST /ccr-subscription-service/microsoft/detail?page=0&size=20&filter=...
 */
export async function fetchSubscriptionDetail(soldToId, filters = {}) {
  try {
    const accessToken = await getAccessToken();
    const qs = buildSubFilterQS(filters);
    const cacheKey = `sub-detail:${soldToId}:${qs}`;
    const data = await getOrSetCached(cacheKey, async () => {
      const url = `${getBaseURL()}/ccr-subscription-service/microsoft/detail?${qs}`;
      return apiPost(url, soldToId, accessToken);
    }, CacheTTL.SHORT);
    return { error: null, data };
  } catch (e) {
    return { error: e.message, data: null };
  }
}

/**
 * Fetch paginated license summary detail (Tab 2 grid).
 * POST /ccr-subscription-service/microsoft/license/detail?page=0&size=20&filter=...
 */
export async function fetchLicenseDetail(soldToId, filters = {}) {
  try {
    const accessToken = await getAccessToken();
    const qs = buildSubFilterQS(filters);
    const cacheKey = `license-detail:${soldToId}:${qs}`;
    const data = await getOrSetCached(cacheKey, async () => {
      const url = `${getBaseURL()}/ccr-subscription-service/microsoft/license/detail?${qs}`;
      return apiPost(url, soldToId, accessToken);
    }, CacheTTL.SHORT);
    return { error: null, data };
  } catch (e) {
    return { error: e.message, data: null };
  }
}

/**
 * Fetch subscription history summary (Tab 3 chart data).
 * POST /ccr-subscription-service/microsoft/history/summary?includeunchanged=true&filter=...&lookbackmonths=12
 */
export async function fetchHistorySummary(soldToId, filters = {}) {
  try {
    const accessToken = await getAccessToken();
    const qs = buildHistoryFilterQS({ ...filters, forDetail: false });
    const cacheKey = `history-summary:${soldToId}:${qs}`;
    const data = await getOrSetCached(cacheKey, async () => {
      const url = `${getBaseURL()}/ccr-subscription-service/microsoft/history/summary?${qs}`;
      return apiPost(url, soldToId, accessToken);
    }, CacheTTL.SHORT);
    return { error: null, data };
  } catch (e) {
    return { error: e.message, data: null };
  }
}

/**
 * Fetch paginated subscription history detail (Tab 3 grid).
 * POST /ccr-subscription-service/microsoft/history/detail?page=0&size=20&filter=...
 */
export async function fetchHistoryDetail(soldToId, filters = {}) {
  try {
    const accessToken = await getAccessToken();
    const qs = buildHistoryFilterQS({ ...filters, forDetail: true });
    const cacheKey = `history-detail:${soldToId}:${qs}`;
    const data = await getOrSetCached(cacheKey, async () => {
      const url = `${getBaseURL()}/ccr-subscription-service/microsoft/history/detail?${qs}`;
      return apiPost(url, soldToId, accessToken);
    }, CacheTTL.VERY_SHORT);
    return { error: null, data };
  } catch (e) {
    return { error: e.message, data: null };
  }
}

/**
 * Consolidated initial page load – Summary + Subscription Detail + License Detail in parallel.
 * History (Tab 3) is deferred until the tab is clicked.
 */
export async function fetchConsolidatedSubscriptionsData(soldToId, status = 'Active') {
  try {
    const accessToken = await getAccessToken();
    const cacheKey = `sub-consolidated:${soldToId}:${status}`;

    const data = await getOrSetCached(cacheKey, async () => {
      const base = getBaseURL();
      const statusQS = `filter=Status%20equals%20${encodeURIComponent(status)}`;
      const detailQS = buildSubFilterQS({ status, page: 0, size: 20 });
      const licenseQS = buildSubFilterQS({ status, page: 0, size: 100 });

      const [summaryRes, detailRes, licenseRes] = await Promise.allSettled([
        apiPost(`${base}/ccr-subscription-service/microsoft/summary?${statusQS}`, soldToId, accessToken),
        apiPost(`${base}/ccr-subscription-service/microsoft/detail?${detailQS}`, soldToId, accessToken),
        apiPost(`${base}/ccr-subscription-service/microsoft/license/detail?${licenseQS}`, soldToId, accessToken),
      ]);

      const has401 = [summaryRes, detailRes, licenseRes].some(
        r => r.status === 'rejected' && r.reason?.message?.includes('401')
      );
      if (has401) throw new Error('Authentication required - 401');

      return {
        summary:        summaryRes.status  === 'fulfilled' ? summaryRes.value  : null,
        subscriptions:  detailRes.status   === 'fulfilled' ? detailRes.value   : null,
        licenses:       licenseRes.status  === 'fulfilled' ? licenseRes.value  : null,
        errors: {
          summary:       summaryRes.status  === 'rejected' ? summaryRes.reason?.message  : null,
          subscriptions: detailRes.status   === 'rejected' ? detailRes.reason?.message   : null,
          licenses:      licenseRes.status  === 'rejected' ? licenseRes.reason?.message  : null,
        },
      };
    }, CacheTTL.SHORT);

    return { error: null, data };
  } catch (e) {
    try { await invalidateCache(`sub-consolidated:${soldToId}:${status}`); } catch { /**/ }
    return { error: e.message, data: null };
  }
}
