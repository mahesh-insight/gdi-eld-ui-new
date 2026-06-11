// src/app/invoices/history/actions.js
'use server';

import { cookies } from 'next/headers';
import { getOrSetCached } from '@/lib/cache/serverCache';
import { CacheTTL } from '@/lib/cache/cacheKeys';
import { getService } from '@/lib/api/services';
import { serverApiClient } from '@/lib/api/request';

function getBaseURL() {
  const serviceConfig = getService('invoiceHistoryProviders');
  return serviceConfig.baseURL;
}

async function getAccessToken() {
  const cookieStore = await cookies();
  const accessTokenCookie = cookieStore.get('access_token');
  if (!accessTokenCookie) throw new Error('Authentication required');
  return accessTokenCookie.value;
}

/**
 * Fetch the list of providers available for Invoice History.
 * GET /ccr-billableitem-service/provider
 * Body: [soldToId]
 */
export async function fetchInvoiceHistoryProviders(soldToId) {
  try {
    const accessToken = await getAccessToken();
    const cacheKey = `invoice-history-providers:${soldToId}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        const url = `${getBaseURL()}/ccr-billableitem-service/provider`;
        const response = await serverApiClient.post(url, [soldToId], accessToken);
        return response.data;
      },
      CacheTTL.MEDIUM
    );
    return { error: null, data };
  } catch (error) {
    console.error('❌ fetchInvoiceHistoryProviders error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Fetch available history months.
 * GET /ccr-billableitem-service/history/months
 * Body: [soldToId]
 */
export async function fetchInvoiceHistoryMonths(soldToId) {
  try {
    const accessToken = await getAccessToken();
    const cacheKey = `invoice-history-months:${soldToId}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        const url = `${getBaseURL()}/ccr-billableitem-service/history/months`;
        const response = await serverApiClient.post(url, [soldToId], accessToken);
        return response.data;
      },
      CacheTTL.MEDIUM
    );
    return { error: null, data };
  } catch (error) {
    console.error('❌ fetchInvoiceHistoryMonths error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Fetch trend data for the Invoice History chart.
 * GET /ccr-billableitem-service/history/trend?months=12&isYearly=0&limit=6&provider=All
 * Body: [soldToId]
 */
export async function fetchInvoiceHistoryTrend(soldToId, { months = 12, isYearly = 0, limit = 6, provider = 'All' } = {}) {
  try {
    const accessToken = await getAccessToken();
    const cacheKey = `invoice-history-trend:${soldToId}:${months}:${isYearly}:${provider}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        const qs = new URLSearchParams({
          months: String(months),
          isYearly: String(isYearly),
          limit: String(limit),
          provider,
        }).toString();
        const url = `${getBaseURL()}/ccr-billableitem-service/history/trend?${qs}`;
        const response = await serverApiClient.post(url, [soldToId], accessToken);
        return response.data;
      },
      CacheTTL.MEDIUM
    );
    return { error: null, data };
  } catch (error) {
    console.error('❌ fetchInvoiceHistoryTrend error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Fetch history summary for the selected date range.
 * GET /ccr-billableitem-service/history/summary/{startMonth}/{endMonth}?provider=All&limitMonths=120&keepMonthsWithNoData=false
 * Body: [soldToId]
 */
export async function fetchInvoiceHistorySummary(soldToId, startMonth, endMonth, { provider = 'All', limitMonths = 120, keepMonthsWithNoData = false } = {}) {
  try {
    const accessToken = await getAccessToken();
    const cacheKey = `invoice-history-summary:${soldToId}:${startMonth}:${endMonth}:${provider}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        const qs = new URLSearchParams({
          provider,
          limitMonths: String(limitMonths),
          keepMonthsWithNoData: String(keepMonthsWithNoData),
        }).toString();
        const url = `${getBaseURL()}/ccr-billableitem-service/history/summary/${startMonth}/${endMonth}?${qs}`;
        const response = await serverApiClient.post(url, [soldToId], accessToken);
        return response.data;
      },
      CacheTTL.AZURE_INVOICE_DATA
    );
    return { error: null, data };
  } catch (error) {
    console.error('❌ fetchInvoiceHistorySummary error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Fetch the paged invoice grid data.
 * GET /ccr-billableitem-service/history/range/{startMonth}/{endMonth}?page=0&size=20&filter=provider%3DAll&filter=invoicenumber%3Dall
 * Body: [soldToId]
 */
export async function fetchInvoiceHistoryDetail(soldToId, startMonth, endMonth, { page = 0, size = 20, provider = 'All', invoiceNumber = 'all' } = {}) {
  try {
    const accessToken = await getAccessToken();
    const cacheKey = `invoice-history-detail:${soldToId}:${startMonth}:${endMonth}:${page}:${provider}:${invoiceNumber}`;
    const data = await getOrSetCached(
      cacheKey,
      async () => {
        const filterProvider = `filter=provider%3D${encodeURIComponent(provider)}`;
        const filterInvoice  = `filter=invoicenumber%3D${encodeURIComponent(invoiceNumber)}`;
        const url = `${getBaseURL()}/ccr-billableitem-service/history/range/${startMonth}/${endMonth}?page=${page}&size=${size}&${filterProvider}&${filterInvoice}`;
        const response = await serverApiClient.post(url, [soldToId], accessToken);
        return response.data;
      },
      CacheTTL.AZURE_INVOICE_DATA
    );
    return { error: null, data };
  } catch (error) {
    console.error('❌ fetchInvoiceHistoryDetail error:', error);
    return { error: error.message, data: null };
  }
}

/**
 * Consolidated initial load: providers + months + trend + summary + detail in parallel.
 */
export async function fetchConsolidatedInvoiceHistory(soldToId) {
  try {
    const [providersResult, monthsResult] = await Promise.allSettled([
      fetchInvoiceHistoryProviders(soldToId),
      fetchInvoiceHistoryMonths(soldToId),
    ]);

    const providers = providersResult.status === 'fulfilled' ? providersResult.value.data : [];
    const months    = monthsResult.status === 'fulfilled'    ? monthsResult.value.data    : [];

    if (!months || months.length === 0) {
      return { error: null, data: { providers, months: [], trend: null, summary: null, detail: null, startMonth: null, endMonth: null } };
    }

    // Default range: oldest available → newest available
    const startMonth = months[months.length - 1].value; // earliest
    const endMonth   = months[0].value;                  // latest

    const [trendResult, summaryResult, detailResult] = await Promise.allSettled([
      fetchInvoiceHistoryTrend(soldToId),
      fetchInvoiceHistorySummary(soldToId, startMonth, endMonth),
      fetchInvoiceHistoryDetail(soldToId, startMonth, endMonth),
    ]);

    return {
      error: null,
      data: {
        providers,
        months,
        startMonth,
        endMonth,
        trend:   trendResult.status   === 'fulfilled' ? trendResult.value.data   : null,
        summary: summaryResult.status === 'fulfilled' ? summaryResult.value.data : null,
        detail:  detailResult.status  === 'fulfilled' ? detailResult.value.data  : null,
      }
    };
  } catch (error) {
    console.error('❌ fetchConsolidatedInvoiceHistory error:', error);
    return { error: error.message, data: null };
  }
}
