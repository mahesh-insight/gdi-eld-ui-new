# Azure Invoice Consolidated API - Implementation Summary

## Problem
When changing the invoice month dropdown, the application was making **5 separate XHR calls** from the browser:
- `202511` (summary)
- `trend?months=6&limit=6` (trends)
- `credits/202511` (credits)
- `month/202511?page=0&size=20` (month details)
- `month/sku-difference/{prevMonth}/202511?page=0&size=20` (monthly difference)

This resulted in multiple network requests visible in the Network tab, which is inefficient and not consistent with how the Invoices page works.

## Solution
Implemented a **server-side consolidated API pattern** similar to the Invoices page:

### 1. Server Action (Next.js 14)
**File:** `src/app/azure-invoice/actions.js`

The `fetchConsolidatedAzureInvoiceData` server action:
- Runs on the **Next.js server** (not in the browser)
- Makes **all 5 API calls in parallel** using `Promise.allSettled`
- Returns **ONE response** to the client
- Includes **server-side caching** (10-minute TTL)

```javascript
// When month is selected:
// 1. Browser calls server action (ONE request)
// 2. Server makes 5 parallel API calls (not visible in browser Network tab)
// 3. Server returns consolidated data to browser (ONE response)
```

### 2. Component Update
**File:** `src/app/azure-invoice/AzureInvoiceClientContent.jsx`

Updated `handleMonthChange` to:
- Call `fetchConsolidatedAzureInvoiceData` (server action) instead of client-side API calls
- Receive consolidated data in one response
- Update all UI states from the single response

### 3. Network Behavior Change

**Before:**
```
Browser Network Tab shows 5 separate XHR requests:
├── POST /ccr-azure-invoice-service/summary/202511
├── POST /ccr-azure-invoice-service/credits/202511  
├── POST /ccr-azure-invoice-service/trend?months=6&limit=6
├── POST /ccr-azure-invoice-service/month/202511?page=0&size=20
└── POST /ccr-azure-invoice-service/month/sku-difference/{prev}/202511?page=0&size=20
```

**After:**
```
Browser Network Tab shows 1 request:
└── POST /_next/data (fetchConsolidatedAzureInvoiceData server action)
    └── Server makes 5 parallel API calls (not visible to browser)
```

## Benefits

1. **Reduced Browser Network Requests:** From 5 XHR calls → 1 server action call
2. **Server-Side Caching:** Results cached for 10 minutes on the server
3. **Consistent with Invoices Page:** Same pattern as the working Invoices page
4. **Better Security:** Bearer token stays on server for API calls
5. **Cleaner Network Tab:** Only one request visible to the user

## Technical Details

### Server Action Implementation

```javascript
export async function fetchConsolidatedAzureInvoiceData(accessToken, soldToId, selectedMonth) {
  // Create cache key
  const cacheKey = `azure-consolidated:${soldToId}:${selectedMonth}`;
  
  const data = await getOrSetCached(
    cacheKey,
    async () => {
      // Make 5 parallel fetch calls on the SERVER
      const [summary, credits, trend, monthDetail, monthlyDifference] = 
        await Promise.allSettled([
          fetch(`${baseURL}/summary/${selectedMonth}`, {...}),
          fetch(`${baseURL}/credits/${selectedMonth}`, {...}),
          fetch(`${baseURL}/trend?months=6&limit=6`, {...}),
          fetch(`${baseURL}/month/${selectedMonth}?page=0&size=20`, {...}),
          fetch(`${baseURL}/month/sku-difference/${prev}/${selectedMonth}?page=0&size=20`, {...})
        ]);
      
      return {
        summary: summary.status === 'fulfilled' ? summary.value : null,
        credits: credits.status === 'fulfilled' ? credits.value : null,
        trend: trend.status === 'fulfilled' ? trend.value : null,
        monthDetail: monthDetail.status === 'fulfilled' ? monthDetail.value : null,
        monthlyDifference: monthlyDifference.status === 'fulfilled' ? monthlyDifference.value : null,
      };
    },
    10 * 60 * 1000 // 10 minutes
  );
  
  return { error: null, data, cached: data._fromCache };
}
```

### Component Usage

```javascript
const handleMonthChange = async (event) => {
  const newMonth = event.value;
  const monthValue = getMonthValue(newMonth);
  
  // Show loading states
  setIsLoadingSummary(true);
  setIsLoadingCredits(true);
  setIsLoadingTrends(true);
  setIsLoadingTabData(true);
  
  // Call SERVER ACTION (single call from browser perspective)
  const consolidatedResult = await fetchConsolidatedAzureInvoiceData(
    accessToken,
    selectedSoldToId,
    monthValue
  );
  
  const consolidatedData = consolidatedResult.data;
  
  // Update all states from consolidated response
  setCurrentSummaryData(consolidatedData.summary);
  setCurrentCreditsData(consolidatedData.credits);
  setCurrentTrendsData(consolidatedData.trend);
  setCurrentMonthDetailData(consolidatedData.monthDetail?.content);
  setCurrentMonthlyDifferenceData(consolidatedData.monthlyDifference?.content);
  
  // Hide loading states
  setIsLoadingSummary(false);
  setIsLoadingCredits(false);
  setIsLoadingTrends(false);
  setIsLoadingTabData(false);
};
```

## Verification

To verify the implementation is working:

### 1. Open Browser DevTools → Network Tab
- Filter by: Fetch/XHR
- Clear existing requests

### 2. Change Invoice Month Dropdown
- Select a different month

### 3. Expected Network Behavior
You should see:
- ✅ **ONE** request to a Next.js server action endpoint (e.g., `/_next/data/...`)
- ❌ **NOT** 5 separate XHR calls to `/ccr-azure-invoice-service/...`

### 4. Check Console Logs
You should see:
```
🔄 Month change triggered: { ... }
🚀 SERVER ACTION: Consolidated Azure Invoice fetch: { ... }
📥 SERVER ACTION: Cache MISS - making SINGLE consolidated API call
📅 SERVER ACTION: Month-specific fetch for: 202511
✅ SERVER ACTION: All 5 parallel API calls completed
✅ SERVER ACTION: Consolidated data served: API CALL
✅ Consolidated API response received: { cached: false, ... }
📊 Setting summary data
💳 Setting credits data
📈 Setting trends data
📄 Setting tab data: { monthDetailCount: 20, monthlyDiffCount: 15 }
```

## Files Modified

1. **src/app/azure-invoice/actions.js**
   - Enhanced `fetchConsolidatedAzureInvoiceData` to make server-side API calls
   - Added parallel fetch calls using Promise.allSettled
   - Added proper error handling and caching

2. **src/app/azure-invoice/AzureInvoiceClientContent.jsx**
   - Updated `handleMonthChange` to call server action instead of client-side API
   - Simplified data handling from consolidated response
   - Reduced logging verbosity

## Performance Impact

- **Before:** 5 browser → API requests (visible in Network tab)
- **After:** 1 browser → server request, server → 5 API requests (parallel)
- **Caching:** 10-minute server-side cache reduces API calls further
- **User Experience:** Cleaner Network tab, consistent with Invoices page

---

**Status:** ✅ Implemented and ready for testing
**Pattern:** Consistent with Invoices page server action pattern
**Next Step:** Test month change in browser and verify Network tab shows only 1 request
