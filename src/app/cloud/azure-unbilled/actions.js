// src/app/cloud/azure-unbilled/actions.js
'use server';

import { cookies } from 'next/headers';
import { getOrSetCached, invalidateCache } from '@/lib/cache/serverCache';
import { CacheTTL } from '@/lib/cache/cacheKeys';
import { getService } from '@/lib/api/services';

/** Shared helper – returns the configured API base URL */
function getBaseURL() {
  return getService('providers').baseURL;
}

/** Shared helper – POST with Bearer token, throws on auth error */
async function apiPost(url, soldToId, accessToken) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify([soldToId]),
  });
  if (response.status === 401) throw new Error('Authentication required - 401');
  if (!response.ok) throw new Error(`API error ${response.status}: ${url}`);
  return response.json();
}

/** Build query-string for filter params */
function buildFilterParams(filters = {}) {
  const params = [];
  if (filters.limittenantid) {
    params.push(`filter=limittenantid%3D${encodeURIComponent(filters.limittenantid)}`);
  }
  if (filters.entitlementid) {
    filters.entitlementid.split(',').forEach(id =>
      params.push(`filter=entitlementid%20eq%20${encodeURIComponent(id.trim())}`)
    );
  }
  if (filters.metercategory) {
    filters.metercategory.split(',').forEach(cat =>
      params.push(`filter=metercategory%20eq%20${encodeURIComponent(cat.trim())}`)
    );
  }
  return params;
}

/** Append &unbilledonly=true (or ?unbilledonly=true if no QS yet) */
function withUnbilled(url) {
  return url.includes('?') ? `${url}&unbilledonly=true` : `${url}?unbilledonly=true`;
}

// ─── Public server actions ──────────────────────────────────────────────────

/**
 * Fetch available months for unbilled consumption.
 * GET /ccr-consumption-service/microsoft/daily/months?unbilledonly=true
 */
export async function fetchUnbilledMonths(soldToId) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    if (!accessToken) return { error: 'Authentication required', data: null };

    const cacheKey = `unbilled-months:${soldToId}`;
    const data = await getOrSetCached(cacheKey, async () => {
      const url = withUnbilled(`${getBaseURL()}/ccr-consumption-service/microsoft/daily/months`);
      return apiPost(url, soldToId, accessToken);
    }, CacheTTL.SHORT);

    return { error: null, data };
  } catch (e) {
    return { error: e.message, data: null };
  }
}

/**
 * Consolidated initial page load – runs in parallel:
 *   months, totals, daily-summary, daily-grid, entitlement-summary, entitlement-trend, entitlement-grid
 */
export async function fetchConsolidatedUnbilledData(soldToId, usageMonth) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    if (!accessToken) return { error: 'Authentication required', data: null };

    const cacheKey = `unbilled-consolidated:${soldToId}:${usageMonth}`;
    const data = await getOrSetCached(cacheKey, async () => {
      const base = getBaseURL();

      const [
        totalsRes, dailySummaryRes, dailyGridRes,
        entSummaryRes, entTrendRes, entGridRes,
      ] = await Promise.allSettled([
        apiPost(withUnbilled(`${base}/ccr-consumption-service/microsoft/daily/totals/${usageMonth}`), soldToId, accessToken),
        apiPost(withUnbilled(`${base}/ccr-consumption-service/microsoft/daily/summary/${usageMonth}`), soldToId, accessToken),
        apiPost(withUnbilled(`${base}/ccr-consumption-service/microsoft/daily/month/${usageMonth}?page=0&size=20`), soldToId, accessToken),
        apiPost(withUnbilled(`${base}/ccr-consumption-service/microsoft/entitlement/summary/${usageMonth}`), soldToId, accessToken),
        apiPost(`${base}/ccr-consumption-service/microsoft/entitlement/trend?months=6&includeunbilled=false&limit=6`, soldToId, accessToken),
        apiPost(withUnbilled(`${base}/ccr-consumption-service/microsoft/entitlement/month/${usageMonth}?page=0&size=20`), soldToId, accessToken),
      ]);

      const has401 = [totalsRes, dailySummaryRes, dailyGridRes, entSummaryRes, entTrendRes, entGridRes]
        .some(r => r.status === 'rejected' && r.reason?.message?.includes('401'));
      if (has401) throw new Error('Authentication required - 401');

      return {
        totalsResponse:      totalsRes.status      === 'fulfilled' ? totalsRes.value      : null,
        dailySummaryResponse: dailySummaryRes.status === 'fulfilled' ? dailySummaryRes.value : null,
        dailyGridResponse:   dailyGridRes.status   === 'fulfilled' ? dailyGridRes.value   : null,
        entSummaryResponse:  entSummaryRes.status  === 'fulfilled' ? entSummaryRes.value  : null,
        entTrendResponse:    entTrendRes.status     === 'fulfilled' ? entTrendRes.value    : null,
        entGridResponse:     entGridRes.status      === 'fulfilled' ? entGridRes.value     : null,
        errors: {
          totals:       totalsRes.status      === 'rejected' ? totalsRes.reason?.message      : null,
          dailySummary: dailySummaryRes.status === 'rejected' ? dailySummaryRes.reason?.message : null,
          dailyGrid:    dailyGridRes.status   === 'rejected' ? dailyGridRes.reason?.message   : null,
          entSummary:   entSummaryRes.status  === 'rejected' ? entSummaryRes.reason?.message  : null,
          entTrend:     entTrendRes.status    === 'rejected' ? entTrendRes.reason?.message    : null,
          entGrid:      entGridRes.status     === 'rejected' ? entGridRes.reason?.message     : null,
        },
      };
    }, CacheTTL.SHORT);

    return { error: null, data };
  } catch (e) {
    try { await invalidateCache(`unbilled-consolidated:${soldToId}`); } catch { /**/ }
    return { error: e.message, data: null };
  }
}

/**
 * Fetch Daily Consumption tab data with filters + pagination
 */
export async function fetchUnbilledDailyData(soldToId, usageMonth, filters = {}, page = 0, size = 20) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    if (!accessToken) return { error: 'Authentication required', data: null };

    const filterParams = buildFilterParams(filters);
    const filterQuery  = filterParams.length ? `&${filterParams.join('&')}` : '';
    const cacheKey = `unbilled-daily:${soldToId}:${usageMonth}:${page}:${JSON.stringify(filters)}`;

    const data = await getOrSetCached(cacheKey, async () => {
      const base = getBaseURL();
      const [summaryRes, gridRes] = await Promise.allSettled([
        apiPost(
          withUnbilled(`${base}/ccr-consumption-service/microsoft/daily/summary/${usageMonth}`) + filterQuery,
          soldToId, accessToken
        ),
        apiPost(
          withUnbilled(`${base}/ccr-consumption-service/microsoft/daily/month/${usageMonth}?page=${page}&size=${size}`) + filterQuery,
          soldToId, accessToken
        ),
      ]);
      return {
        dailySummaryResponse: summaryRes.status === 'fulfilled' ? summaryRes.value : null,
        dailyGridResponse:    gridRes.status    === 'fulfilled' ? gridRes.value    : null,
      };
    }, CacheTTL.VERY_SHORT);

    return { error: null, data };
  } catch (e) {
    return { error: e.message, data: null };
  }
}

/**
 * Fetch Azure Subscription Summary tab data with filters + pagination
 */
export async function fetchUnbilledEntitlementData(soldToId, usageMonth, filters = {}, page = 0, size = 20, trendMonths = 6) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    if (!accessToken) return { error: 'Authentication required', data: null };

    const filterParams = buildFilterParams(filters);
    const filterQuery  = filterParams.length ? `&${filterParams.join('&')}` : '';
    const cacheKey = `unbilled-entitlement:${soldToId}:${usageMonth}:${page}:${trendMonths}:${JSON.stringify(filters)}`;

    const data = await getOrSetCached(cacheKey, async () => {
      const base = getBaseURL();
      const [summaryRes, trendRes, gridRes] = await Promise.allSettled([
        apiPost(
          withUnbilled(`${base}/ccr-consumption-service/microsoft/entitlement/summary/${usageMonth}`) + filterQuery,
          soldToId, accessToken
        ),
        apiPost(
          `${base}/ccr-consumption-service/microsoft/entitlement/trend?months=${trendMonths}&includeunbilled=false&limit=6${filterQuery}`,
          soldToId, accessToken
        ),
        apiPost(
          withUnbilled(`${base}/ccr-consumption-service/microsoft/entitlement/month/${usageMonth}?page=${page}&size=${size}`) + filterQuery,
          soldToId, accessToken
        ),
      ]);
      return {
        entSummaryResponse: summaryRes.status === 'fulfilled' ? summaryRes.value : null,
        entTrendResponse:   trendRes.status   === 'fulfilled' ? trendRes.value   : null,
        entGridResponse:    gridRes.status    === 'fulfilled' ? gridRes.value    : null,
      };
    }, CacheTTL.VERY_SHORT);

    return { error: null, data };
  } catch (e) {
    return { error: e.message, data: null };
  }
}
