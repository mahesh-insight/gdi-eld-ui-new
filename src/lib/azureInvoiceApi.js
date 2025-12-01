// src/lib/azureInvoiceApi.js
import "server-only";

const CCR_API_BASE_URL = process.env.CCR_API_BASE_URL || "http://localhost:80"; 
// e.g. http://localhost:80 or whatever your backend base is

async function ccrPost(path, payload) {
  const res = await fetch(`${CCR_API_BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // add auth headers / cookies if needed
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`CCR POST ${path} failed: ${res.status} ${res.statusText}`);
    throw new Error(`CCR_POST_ERROR_${res.status}`);
  }

  return res.json();
}

export async function fetchInvoiceMonths({ soldToId }) {
  return ccrPost("invoiceMonths", { data: soldToId });
}

export async function fetchInvoiceSummary({ soldToId, value, filter }) {
  return ccrPost("invoiceSummary", {
    data: soldToId,
    url: value,
    params: {
      ...(filter && filter.length ? { filter } : {}),
    },
  });
}

export async function fetchInvoiceMonthDetail({
  soldToId,
  value,
  filter,
  monthlyDifference,
}) {
  const apiEndPoint = monthlyDifference
    ? "invoiceMonthlyDifferenceDetail"
    : "invoiceMonthDetail";

  return ccrPost(apiEndPoint, {
    data: soldToId,
    url: value,
    params: {
      ...(filter ? { filter } : {}),
    },
  });
}

export async function fetchInvoiceCredits({ soldToId, value, filter }) {
  return ccrPost("invoiceCredits", {
    data: soldToId,
    url: `${value}?creditsonly=true`,
    params: {
      ...(filter ? { filter } : {}),
    },
  });
}

export async function fetchInvoiceTrend({ soldToId, months, filter }) {
  return ccrPost("invoiceTrend", {
    data: soldToId,
    params: {
      months,
      limit: 6,
      ...(filter ? { filter } : {}),
    },
  });
}

/**
 * Used for the initial SSR render of the page
 * (what you are currently doing in useEffect(fetchInitialInvoiceMonths)).
 */
export async function getInitialAzureInvoiceData({
  soldToId,
  locationState, // optional – replacing useLocation().state
}) {
  // 1. Get months
  const invoiceMonths = await fetchInvoiceMonths({ soldToId });

  if (!invoiceMonths?.length) {
    return {
      pageExistsError: true,
      invoiceMonths: [],
    };
  }

  // Decide which month (similar to your current logic)
  const currentMonthObject =
    locationState?.currentMonthObject || invoiceMonths[0];
  const currentMonthValue = currentMonthObject.value;

  // Build 2-month string for monthly difference
  const moment = (await import("moment")).default;
  const date = new Date(currentMonthObject.date);
  const prevMonth = moment(date).subtract(1, "month").format("YYYYMM");
  const usageMonthDifference = `${prevMonth}/${currentMonthValue}`;

  const filterQuery = []; // initially none for SSR
  const trendFilter = ""; // or `limittenantid=...` if you have a default tenant

  // 2. Summary
  const summary = await fetchInvoiceSummary({
    soldToId,
    value: currentMonthValue,
    filter: filterQuery,
  });

  // 3. Credits
  const credits = await fetchInvoiceCredits({
    soldToId,
    value: currentMonthValue,
    filter: filterQuery,
  });

  // 4. Trend
  const trend = await fetchInvoiceTrend({
    soldToId,
    months: 6,
    filter: trendFilter,
  });

  return {
    pageExistsError: false,
    invoiceMonths,
    currentMonthObject,
    usageMonth: currentMonthValue,
    usageMonthDifference,
    summary,
    credits,
    trend,
  };
}
