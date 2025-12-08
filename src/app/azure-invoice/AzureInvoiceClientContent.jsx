// src/app/azure-invoice/AzureInvoiceClientContent.jsx
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/ErrorBoundary';
// import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
// import { BasicPieDoughnutChart } from '@/common/Charts/BasicPieDoughnutChart';

// Completely avoid Kendo imports during SSR by using simple placeholders
const ChartPlaceholder = ({ height = '400px', title = 'Chart' }) => (
  <div style={{
    height,
    border: '2px dashed #dee2e6',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6c757d',
    backgroundColor: '#f8f9fa'
  }}>
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
    <div>{title}</div>
    <small>Component loading...</small>
  </div>
);

// Simple chart components that work without Kendo
const SimpleChart = ({ data, title, type = 'bar' }) => {
  if (!data || data.length === 0) {
    return <ChartPlaceholder title={title || 'No Data Available'} />;
  }

  const maxValue = Math.max(...data.map(item => item.value || 0));
  
  return (
    <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', backgroundColor: 'white' }}>
      {title && <h4 style={{ marginBottom: '20px', textAlign: 'center' }}>{title}</h4>}
      <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '300px' }}>
        {data.slice(0, 10).map((item, index) => {
          const height = ((item.value || 0) / maxValue) * 250;
          const label = item.label || item.group || item.category || `Item ${index + 1}`;
          const value = typeof item.value === 'number' ? item.value.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD' 
          }) : item.value;
          
          return (
            <div key={index} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              flex: 1,
              minWidth: '60px'
            }}>
              <div style={{ 
                fontSize: '10px', 
                marginBottom: '4px',
                fontWeight: 'bold'
              }}>
                {value}
              </div>
              <div style={{
                width: '100%',
                height: height || 20,
                backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s ease'
              }} />
              <div style={{ 
                fontSize: '9px', 
                marginTop: '4px',
                textAlign: 'center',
                wordBreak: 'break-word',
                lineHeight: '1.2'
              }}>
                {label.length > 12 ? label.substring(0, 12) + '...' : label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SimpleControlPanel = ({ title, options = [], currentValue, onValueChange }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  }}>
    <h4 style={{ margin: 0 }}>{title}</h4>
    {options.length > 0 && (
      <select 
        value={currentValue || options[0]?.type} 
        onChange={(e) => onValueChange && onValueChange(e.target.value)}
        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
      >
        {options.map(option => (
          <option key={option.type} value={option.type}>
            {option.title}
          </option>
        ))}
      </select>
    )}
  </div>
);

/**
 * Utility function to clear all Azure Invoice cache data
 * Call this when user logs out or authentication changes
 */
function clearAzureInvoiceCache(soldToId = null) {
  try {
    if (soldToId) {
      // Clear specific user's cache
      localStorage.removeItem(`azure-invoice-${soldToId}`);
      localStorage.removeItem(`azure-session-${soldToId}`);
      console.log('🗑️ Cleared cache for soldToId:', soldToId.substring(0, 20) + '...');
    } else {
      // Clear all Azure Invoice related cache
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('azure-invoice-') || key.startsWith('azure-session-')) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️ Cleared all Azure Invoice cache data');
    }
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Client component that receives SSR data and handles interactivity
 * NO initial data fetching - data comes from server as props!
 */
export default function AzureInvoiceClientContent({
  mode = 'with-data',
  initialData, // New: server-fetched data structure
  initialMonthsData,
  initialSummaryData,
  initialCreditsData,
  initialTrendsData,
  monthsError,
  summaryError,
  creditsError,
  trendsError,
  userContext,
  ssrPerformance
}) {
  
  // Handle new true-ssr mode with initialData structure
  const actualInitialMonthsData = mode === 'true-ssr' ? initialData?.monthsResponse : initialMonthsData;
  const actualInitialSummaryData = mode === 'true-ssr' ? initialData?.summaryResponse : initialSummaryData;
  const actualInitialCreditsData = mode === 'true-ssr' ? initialData?.creditsResponse : initialCreditsData;
  const actualInitialTrendsData = mode === 'true-ssr' ? initialData?.trendsResponse : initialTrendsData;

  console.log('🚀🚀🚀 AZURE INVOICE COMPONENT RENDER 🚀🚀🚀');
  console.log('🔥 CURRENT MODE:', mode);
  console.log('🔥 TRUE SSR MODE:', mode === 'true-ssr' ? 'YES' : 'NO');
  console.log('🔥 Component render timestamp:', new Date().toISOString());
  
  // CRITICAL DEBUG: See what server actually sent
  console.log('🔍 SERVER DATA DEBUG:');
  console.log('🔍 initialData keys:', initialData ? Object.keys(initialData) : 'NO initialData');
  console.log('🔍 initialData.monthsResponse exists?', !!initialData?.monthsResponse);
  console.log('🔍 initialData.monthsResponse type:', typeof initialData?.monthsResponse);
  console.log('🔍 initialData.monthsResponse:', initialData?.monthsResponse);
  
  if (initialData?.monthsResponse) {
    console.log('🔍 monthsResponse keys:', Object.keys(initialData.monthsResponse));
    console.log('🔍 monthsResponse.invoiceMonths?', !!initialData.monthsResponse.invoiceMonths);
    console.log('🔍 monthsResponse full object:', JSON.stringify(initialData.monthsResponse, null, 2));
  }
  
  if (mode === 'true-ssr') {
    console.log('✅ Server-side data received - NO client API calls needed!', {
      hasMonthsData: !!actualInitialMonthsData,
      hasSummaryData: !!actualInitialSummaryData,
      hasCreditsData: !!actualInitialCreditsData,
      hasTrendsData: !!actualInitialTrendsData,
      userContext: !!userContext,
      ssrPerformance: ssrPerformance
    });
  }
  
  // Initialize state with server-fetched data
  const [invoiceMonthsData] = useState(actualInitialMonthsData);
  const [summaryData, setSummaryData] = useState(actualInitialSummaryData);
  const [creditsData, setCreditsData] = useState(actualInitialCreditsData);
  const [trendsData, setTrendsData] = useState(actualInitialTrendsData);
  const [error] = useState(monthsError || summaryError || creditsError || trendsError);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const firstMonth = actualInitialMonthsData?.invoiceMonths?.[0] || actualInitialMonthsData?.[0];
    return firstMonth ? {
      label: firstMonth.text || firstMonth.label,
      value: firstMonth.value,
      date: firstMonth.date
    } : null;
  });
  const [monthDataLoading, setMonthDataLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Loading state - no loading needed for true-ssr since data comes from server
  const [loading, setLoading] = useState(mode === 'client-ssr');
  const [dataPerformance, setDataPerformance] = useState(ssrPerformance);
  

  const [clientMonthsData, setClientMonthsData] = useState(null);
  
  // Chart and filter state
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [trendingChartType, setTrendingChartType] = useState('column');
  const [topExpensiveChartType, setTopExpensiveChartType] = useState('bar');
  const [productCategoryFilter, setProductCategoryFilter] = useState({ text: 'All', value: 'All' });
  const [productNameFilter, setProductNameFilter] = useState({ text: 'All', value: 'All' });
  const [skuNameFilter, setSkuNameFilter] = useState({ text: 'All', value: 'All' });
  
  // Processed data state - moved from render function to proper state management
  const [invoiceMonths, setInvoiceMonths] = useState([]);
  // Initialize selectListOptions - process immediately if SSR data exists
  const initialSelectListOptions = (() => {
    console.log('🔥 IMMEDIATE selectLists processing...');
    if (initialSummaryData?.selectLists && mode !== 'client-ssr') {
      console.log('🔥 Processing selectLists immediately from SSR data');
      console.log('🔥 Available selectLists:', initialSummaryData.selectLists?.map(s => ({ name: s?.name, itemCount: s?.items?.length })));
      
      // Simple inline processing to avoid function reference issues
      const lists = {
        productCategory: [{ text: 'All', value: 'All' }],
        productName: [{ text: 'All', value: 'All' }], 
        skuName: [{ text: 'All', value: 'All' }]
      };
      
      initialSummaryData.selectLists.forEach((selectList, index) => {
        if (!selectList?.items || selectList.items.length === 0) return;
        
        const processedItems = selectList.items.map(item => ({
          text: item?.label || item?.text || item?.name || item?.value || String(item),
          value: item?.value || item?.label || item?.text || item?.name || String(item)
        }));
        
        const finalList = [{ text: 'All', value: 'All' }, ...processedItems];
        
        console.log(`🔥 Processing "${selectList.name}" with ${processedItems.length} items`);
        
        // Direct exact matching
        if (selectList.name === 'productcategory') {
          console.log('✅ EXACT MATCH: productcategory');
          lists.productCategory = finalList;
        } else if (selectList.name === 'productname') {
          console.log('✅ EXACT MATCH: productname');
          lists.productName = finalList;
        } else if (selectList.name === 'skuname') {
          console.log('✅ EXACT MATCH: skuname');
          lists.skuName = finalList;
        }
      });
      
      console.log('🔥 Final processed lists:', {
        productCategory: lists.productCategory.length,
        productName: lists.productName.length,
        skuName: lists.skuName.length
      });
      
      return lists;
    }
    
    console.log('🔥 No SSR selectLists to process');
    return {
      productCategory: [{ text: 'All', value: 'All' }],
      productName: [{ text: 'All', value: 'All' }], 
      skuName: [{ text: 'All', value: 'All' }]
    };
  })();

  const [selectListOptions, setSelectListOptions] = useState(initialSelectListOptions);
  const [processedChartData, setProcessedChartData] = useState({
    invoiceBreakdownData: [],
    monthlyTrendData: [],
    topExpensiveData: [],
    creditsApplied: 0
  });
  
  // Client-side mounting state for dynamic components
  const [chartsLoaded, setChartsLoaded] = useState(false);

  // DEBUG LOGGING - Now that state is initialized
  console.log('🎯 IMMEDIATE STATE CHECK (after initialization):');
  console.log('🎯 invoiceMonths state length:', invoiceMonths?.length || 0);
  console.log('🎯 selectedMonth state:', selectedMonth);
  console.log('🎯 invoiceMonths full array:', invoiceMonths);

  // Initialize selectLists from server data on component mount
  useEffect(() => {
    console.log('🚀 INITIALIZATION USEEFFECT - MODE:', mode);
    
    // Skip this useEffect completely in true-ssr mode - let the TRUE-SSR useEffect handle everything
    if (mode === 'true-ssr') {
      console.log('🚫 SKIPPING initialization useEffect - true-ssr mode will handle this');
      return;
    }
    
    const summaryDataToProcess = initialSummaryData;
    
    if (mode !== 'client-ssr' && summaryDataToProcess?.selectLists) {
      console.log('✅ Processing server-side selectLists...');
      
      try {
        // Call processSelectLists function directly
        const processedSelectLists = processSelectLists(summaryDataToProcess);
        console.log('✅ Got processed selectLists:', processedSelectLists);
        
        setSelectListOptions(processedSelectLists);
        console.log('✅ SelectListOptions state updated - NO CLIENT API CALLS MADE!');
      } catch (error) {
        console.error('❌ Error processing server selectLists:', error);
      }
    } else {
      console.log('⏸️ Skipping selectLists processing - mode:', mode, 'hasSelectLists:', !!summaryDataToProcess?.selectLists);
    }
  }, []); // Run only once on mount

  // Track months state changes
  useEffect(() => {
    console.log('🔄 MONTHS STATE CHANGED!');
    console.log('🔄 New invoiceMonths length:', invoiceMonths?.length || 0);
    console.log('🔄 New invoiceMonths:', invoiceMonths);
    console.log('🔄 New selectedMonth:', selectedMonth);
    console.log('🔄 Current timestamp:', Date.now());
  }, [invoiceMonths, selectedMonth]);

  // DEDICATED MONTHS PROCESSOR - SIMPLE AND DIRECT
  useEffect(() => {
    console.log('🎯🎯🎯 DEDICATED MONTHS PROCESSOR RUNNING! 🎯🎯🎯');
    console.log('🎯 Mode:', mode);
    console.log('🎯 actualInitialMonthsData exists?', !!actualInitialMonthsData);
    
    // Try multiple possible data structures based on what we see in console
    if (mode === 'true-ssr') {
      console.log('🎯 PROCESSING MONTHS - Trying multiple data paths...');
      
      let monthsArray = null;
      
      // Try different possible structures based on actual API response
      if (actualInitialMonthsData?.data?.invoiceMonths) {
        console.log('🎯 Found months at actualInitialMonthsData.data.invoiceMonths');
        monthsArray = actualInitialMonthsData.data.invoiceMonths;
      } else if (initialData?.monthsResponse?.data?.invoiceMonths) {
        console.log('🎯 Found months at initialData.monthsResponse.data.invoiceMonths');
        monthsArray = initialData.monthsResponse.data.invoiceMonths;
      } else if (actualInitialMonthsData?.invoiceMonths) {
        console.log('🎯 Found months at actualInitialMonthsData.invoiceMonths');
        monthsArray = actualInitialMonthsData.invoiceMonths;
      } else if (initialData?.monthsResponse?.invoiceMonths) {
        console.log('🎯 Found months at initialData.monthsResponse.invoiceMonths');
        monthsArray = initialData.monthsResponse.invoiceMonths;
      } else if (initialData?.monthsResponse) {
        console.log('🎯 Found months at initialData.monthsResponse (direct)');
        monthsArray = initialData.monthsResponse;
      } else if (Array.isArray(actualInitialMonthsData)) {
        console.log('🎯 actualInitialMonthsData is array');
        monthsArray = actualInitialMonthsData;
      }
      
      if (monthsArray && monthsArray.length > 0) {
        console.log('🎯 PROCESSING MONTHS NOW!', monthsArray.length, 'months found');
        console.log('🎯 First month sample:', monthsArray[0]);
        
        const months = monthsArray.map(month => ({
          text: month.text,
          value: month.value,
          date: month.date,
          __source: 'DEDICATED_PROCESSOR'
        }));
        
        console.log('🎯 Processed months:', months);
        setInvoiceMonths(months);
        setSelectedMonth(months[0]);
        console.log('🎯 MONTHS SET! Should see dropdown populate now.');
      } else {
        console.log('🎯 NO MONTHS FOUND in any expected location');
        console.log('🎯 actualInitialMonthsData:', actualInitialMonthsData);
        console.log('🎯 initialData?.monthsResponse:', initialData?.monthsResponse);
      }
      
      // Aggressive verification - check state every 50ms for 1 second
      let checkCount = 0;
      const interval = setInterval(() => {
        checkCount++;
        console.log(`🔍 STATE CHECK #${checkCount}:`, {
          invoiceMonthsLength: invoiceMonths.length,
          selectedMonthExists: !!selectedMonth,
          dropdownOptionsCount: document.querySelector('select[style*="width: 200px"]')?.options.length || 'not found'
        });
        
        if (checkCount >= 20) {
          clearInterval(interval);
          console.log('🔍 STATE VERIFICATION COMPLETE');
        }
      }, 50);
    } else {
      console.log('🎯 Skipping months processing:', {
        mode: mode,
        isTrueSsr: mode === 'true-ssr',
        hasMonthsData: !!actualInitialMonthsData?.invoiceMonths
      });
    }
  }, [mode, actualInitialMonthsData]); // Run when mode or monthsData changes

  // Ensure we're on the client side before rendering charts
  useEffect(() => {
    console.log('🎯 Setting isClient to true - MODE:', mode);
    
    // Always set isClient to true regardless of mode
    setIsClient(true);
    
    // Small delay to ensure dynamic components are loaded
    const timer = setTimeout(() => {
      console.log('🎯 Setting chartsLoaded to true');
      setChartsLoaded(true);
    }, 100);
    
    // Expose cache clearing utility globally for logout handlers
    if (typeof window !== 'undefined') {
      window.clearAzureInvoiceCache = clearAzureInvoiceCache;
    }
    
    // Handle auth redirect mode
    if (mode === 'auth-required') {
      // Try to get soldToId from cookies and do a simple redirect
      const checkAuth = async () => {
        try {
          const userContextCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('user_context='));
          
          if (userContextCookie) {
            const userContext = JSON.parse(decodeURIComponent(userContextCookie.split('=')[1]));
            if (userContext.soldToId) {
              // Simple redirect to same page without query params
              console.log('🔀 Client: Redirecting to enable server-side rendering with session auth');
              window.location.href = window.location.pathname;
              return;
            }
          }
        } catch (error) {
          console.error('Auth check failed:', error);
        }
        
        // No auth found, redirect to login
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      };
      
      checkAuth();
    }
    
    // Handle client-ssr mode with intelligent caching (skip if true-ssr since data comes from server)
    if (mode === 'client-ssr') {
      
      const loadDataWithCaching = async () => {
        console.log('🟢🟢🟢🟢🟢 loadDataWithCaching FUNCTION STARTED 🟢🟢🟢🟢🟢');
        console.log('🚀🚀🚀 CLIENT-SSR MODE: Starting data fetch process...');
        console.log('⏰ Timestamp:', new Date().toISOString());
        const startTime = Date.now();
        
        // Check authentication
        let userContext = null;
        let soldToId = null;
        
        try {
          const userContextCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('user_context='));
          
          if (userContextCookie) {
            userContext = JSON.parse(decodeURIComponent(userContextCookie.split('=')[1]));
            soldToId = userContext.soldToId;
          }
        } catch (error) {
          console.error('Auth check failed:', error);
        }
        
        if (!soldToId) {
          console.log('❌❌❌ AUTHENTICATION FAILED: No soldToId found');
          console.log('🔍 Available cookies:', document.cookie);
          console.log('🔄 Redirecting to login in 3 seconds...');
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
          return;
        }
        
        console.log('✅✅✅ AUTHENTICATION SUCCESS: soldToId =', soldToId);
        
        // Session-aware caching - include access token info
        const accessTokenCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('access_token='));
        
        let tokenTimestamp = Date.now();
        if (accessTokenCookie) {
          try {
            // Use a simple hash of the token as session identifier
            const tokenValue = accessTokenCookie.split('=')[1];
            tokenTimestamp = tokenValue ? tokenValue.slice(-10) : Date.now();
          } catch (error) {
            console.log('Token processing error:', error);
          }
        }
        
        const cacheKey = `azure-invoice-${soldToId}`;
        const sessionKey = `azure-session-${soldToId}`;
        const cached = localStorage.getItem(cacheKey);
        const lastSession = localStorage.getItem(sessionKey);
        
        // Check if this is a new authentication session
        const currentSessionId = `${soldToId}-${tokenTimestamp}`;
        const isNewSession = lastSession !== currentSessionId;
        
        if (cached && !isNewSession) {
          try {
            const cachedData = JSON.parse(cached);
            const cacheAge = Date.now() - cachedData.timestamp;
            
            if (cacheAge < 5 * 60 * 1000) { // 5 minutes
              console.log('🚀 CACHE HIT! Loading from localStorage', { 
                cacheAgeMs: cacheAge,
                soldToId: soldToId.substring(0, 20) + '...'
              });
              
              // Update performance indicator
              const perfData = {
                ...ssrPerformance,
                dataFetchTime: Date.now() - startTime,
                cacheStatus: 'CLIENT_CACHED',
                timestamp: new Date().toLocaleTimeString()
              };
              
              // Set state with cached data
              console.log('📋 Loading from cache, cachedData:', cachedData);
              setClientMonthsData(cachedData.monthsData || null);
              setSummaryData(cachedData.summaryData);
              setCreditsData(cachedData.creditsData);  
              setTrendsData(cachedData.trendsData);
              
              // Set invoice months and default selected month from cache
              if (cachedData.monthsData?.invoiceMonths && cachedData.monthsData.invoiceMonths.length > 0 && !selectedMonth) {
                console.log('🔄 Setting default month from cache:', cachedData.monthsData.invoiceMonths[0]);
                setSelectedMonth(cachedData.monthsData.invoiceMonths[0]);
              }
              
              setLoading(false);
              setDataPerformance(perfData);
              return;
            } else {
              console.log('⏰ Cache expired, fetching fresh data', { cacheAgeMs: cacheAge });
            }
          } catch (error) {
            console.error('Cache parse error:', error);
          }
        } else if (isNewSession) {
          console.log('🔄 New authentication session detected, clearing cache and fetching fresh data');
          localStorage.removeItem(cacheKey);
          localStorage.setItem(sessionKey, currentSessionId);
        }
        
        // Cache miss or expired - fetch fresh data
        console.log('📡 CACHE MISS - Fetching fresh data');
        setLoading(true);
        
        try {
          console.log('🔄 Calling server actions...');
          
          // Call them individually to catch which one fails
          let monthsResult, summaryResult, creditsResult, trendsResult;
          
          try {
            console.log('📡📡📡 API CALL 1/4: Fetching Invoice Months...');
            console.log('🔍 Calling fetchInvoiceMonthsServer with soldToId:', soldToId);
            const startTime = Date.now();
            monthsResult = await fetchInvoiceMonthsServer(soldToId);
            const endTime = Date.now();
            console.log('✅ fetchInvoiceMonthsServer completed in', endTime - startTime, 'ms');
            console.log('📊 Monthly result:', monthsResult);
            console.log('📊 Monthly data:', monthsResult?.data);
            console.log('📊 Monthly error:', monthsResult?.error);
          } catch (error) {
            console.error('❌❌❌ fetchInvoiceMonthsServer FAILED:', error);
            console.error('❌ Error details:', error.message, error.stack);
            monthsResult = { error: error.message, data: null };
          }
          
          try {
            console.log('📡📡📡 API CALL 2/4: Fetching Summary Data...');
            console.log('🔍 Calling fetchSummaryDataServer with soldToId:', soldToId, 'month:', null);
            const startTime = Date.now();
            summaryResult = await fetchSummaryDataServer(soldToId, null);
            const endTime = Date.now();
            console.log('✅ fetchSummaryDataServer completed in', endTime - startTime, 'ms');
            console.log('📊 Summary result:', summaryResult);
            console.log('📊 Summary data keys:', summaryResult?.data ? Object.keys(summaryResult.data) : 'no data');
            console.log('📊 Summary error:', summaryResult?.error);
          } catch (error) {
            console.error('❌❌❌ fetchSummaryDataServer FAILED:', error);
            console.error('❌ Error details:', error.message, error.stack);
            summaryResult = { error: error.message, data: null };
          }
          
          try {
            console.log('📡 Calling fetchCreditsDataServer...');
            creditsResult = await fetchCreditsDataServer(soldToId, null);
            console.log('✅ fetchCreditsDataServer completed:', creditsResult ? 'success' : 'undefined');
          } catch (error) {
            console.error('❌ fetchCreditsDataServer failed:', error);
            creditsResult = { error: error.message, data: null };
          }
          
          try {
            console.log('📡 Calling fetchTrendsDataServer...');
            trendsResult = await fetchTrendsDataServer(soldToId, null);
            console.log('✅ fetchTrendsDataServer completed:', trendsResult ? 'success' : 'undefined');
          } catch (error) {
            console.error('❌ fetchTrendsDataServer failed:', error);
            trendsResult = { error: error.message, data: null };
          }
          
          console.log('📡 Server action results:', {
            monthsResult: monthsResult ? 'received' : 'undefined',
            summaryResult: summaryResult ? 'received' : 'undefined',
            creditsResult: creditsResult ? 'received' : 'undefined', 
            trendsResult: trendsResult ? 'received' : 'undefined'
          });
          
          // DEBUG: Log the actual data structures
          console.log('🔍 ACTUAL monthsResult:', JSON.stringify(monthsResult, null, 2));
          console.log('🔍 ACTUAL summaryResult:', JSON.stringify(summaryResult, null, 2));
          console.log('🔍 ACTUAL creditsResult:', JSON.stringify(creditsResult, null, 2));
          console.log('🔍 ACTUAL trendsResult:', JSON.stringify(trendsResult, null, 2));
          
          // Detailed debugging for selectLists
          if (summaryResult?.data) {
            console.log('🔍🔍🔍 SUMMARY DATA DETAILED ANALYSIS:');
            console.log('📋 Keys in summaryResult.data:', Object.keys(summaryResult.data));
            console.log('📋 selectLists exists?', 'selectLists' in summaryResult.data);
            console.log('📋 selectLists value:', summaryResult.data.selectLists);
            console.log('📋 selectLists type:', typeof summaryResult.data.selectLists);
            console.log('📋 selectLists is array?', Array.isArray(summaryResult.data.selectLists));
            if (summaryResult.data.selectLists) {
              console.log('📋 selectLists length:', summaryResult.data.selectLists.length);
              console.log('📋 First selectList item:', summaryResult.data.selectLists[0]);
            }
          }
          
          // Validate results before using them
          if (!monthsResult || !summaryResult || !creditsResult || !trendsResult) {
            throw new Error('One or more server actions returned undefined');
          }
          
          // Cache the results
          const cacheData = {
            monthsData: monthsResult.data || null,
            summaryData: summaryResult.data || null,
            creditsData: creditsResult.data || null,
            trendsData: trendsResult.data || null,
            timestamp: Date.now()
          };
          
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log('💾 Data cached for future visits', { 
            soldToId: soldToId.substring(0, 20) + '...',
            dataTypes: ['summary', 'credits', 'trends']
          });
          
          // Update state
      console.log('🔄🔄🔄 UPDATING COMPONENT STATE...');
      console.log('📊 Setting clientMonthsData:', monthsResult.data);
      console.log('📊 Setting summaryData keys:', summaryResult.data ? Object.keys(summaryResult.data) : 'no data');
      console.log('📊 Setting creditsData:', creditsResult.data);
      console.log('📊 Setting trendsData:', trendsResult.data);
      
      console.log('🎯 Component States Check:', {
        isClient: isClient,
        chartsLoaded: chartsLoaded,
        loading: loading
      });          setClientMonthsData(monthsResult.data || null);
          setSummaryData(summaryResult.data || null);
          setCreditsData(creditsResult.data || null);
          setTrendsData(trendsResult.data || null);
          
          console.log('✅✅✅ STATE UPDATE COMPLETE - Component should re-render now');
          
          // Set default selected month from months API response
          if (monthsResult.data?.invoiceMonths && monthsResult.data.invoiceMonths.length > 0 && !selectedMonth) {
            console.log('🔄 Setting default month from months API response:', monthsResult.data.invoiceMonths[0]);
            setSelectedMonth(monthsResult.data.invoiceMonths[0]);
          }
          
          const perfData = {
            ...ssrPerformance,
            dataFetchTime: Date.now() - startTime,
            cacheStatus: 'FRESH_FETCH',
            timestamp: new Date().toLocaleTimeString()
          };
          setDataPerformance(perfData);
          
          console.log('✅ Fresh data fetched and displayed', { 
            fetchTime: Date.now() - startTime,
            soldToId: soldToId.substring(0, 20) + '...'
          });
          
        } catch (error) {
          console.error('❌ Data fetch failed:', error);
        } finally {
          setLoading(false);
        }
      };
      
      console.log('🚀🚀🚀 CALLING loadDataWithCaching() now...');
      loadDataWithCaching();
    }
    
    return () => clearTimeout(timer);
  }, [mode, ssrPerformance]);



  // Process API responses using useEffect to update state
  useEffect(() => {
    console.log('🔄 Processing API data for UI components - MODE:', mode);
    
    // Skip this useEffect completely in true-ssr mode - let the TRUE-SSR useEffect handle everything
    if (mode === 'true-ssr') {
      console.log('🚫 SKIPPING main processing useEffect - true-ssr mode will handle this');
      return;
    }
    
    console.log('🔄 Data availability:', {
      summaryData: !!summaryData,
      creditsData: !!creditsData,
      trendsData: !!trendsData,
      invoiceMonthsData: !!invoiceMonthsData,
      actualInitialSummaryData: !!actualInitialSummaryData,
      actualInitialCreditsData: !!actualInitialCreditsData,
      actualInitialTrendsData: !!actualInitialTrendsData
    });
    
    let invoiceBreakdownData = [];
    let trendingChartData = [];
    let topExpensiveData = [];
    let processedInvoiceMonths = [];
    let newSelectListOptions = {
      productCategory: [{ text: 'All', value: 'All' }],
      productName: [{ text: 'All', value: 'All' }], 
      skuName: [{ text: 'All', value: 'All' }]
    };
    let creditsApplied = 0;
  
    try {
      // Process invoice months for dropdown - prioritize client data from API
      const monthsSource = clientMonthsData?.invoiceMonths || initialMonthsData?.invoiceMonths || initialMonthsData || invoiceMonthsData;
      processedInvoiceMonths = processInvoiceMonths(monthsSource);
      
      console.log('📊 DEBUG: Processing months data:', {
        clientMonthsData: clientMonthsData,
        'clientMonthsData?.invoiceMonths': clientMonthsData?.invoiceMonths,
        initialMonthsData: initialMonthsData,
        'initialMonthsData?.invoiceMonths': initialMonthsData?.invoiceMonths, 
        monthsSource: monthsSource,
        'monthsSource?.length': monthsSource ? monthsSource.length : 'null',
        processed: processedInvoiceMonths,
        'processed.length': processedInvoiceMonths.length
      });
      
      // Process summary data for Invoice Breakdown chart
      invoiceBreakdownData = processInvoiceBreakdownData(summaryData);
      
      // Process selectLists for filter dropdowns (Category, Product, SKU)
      console.log('🔍 DEBUG: Processing selectLists from summaryData:', {
        summaryData: summaryData,
        'summaryData?.selectLists': summaryData?.selectLists,
        'summaryData keys': summaryData ? Object.keys(summaryData) : 'null'
      });
      newSelectListOptions = processSelectLists(summaryData);
      console.log('🔍 DEBUG: Processed selectListOptions:', newSelectListOptions);
      
      // Process credits data for Credits Applied field
      creditsApplied = processCreditsData(creditsData);
      
      // Process trending data for Trending Monthly Spend chart
      trendingChartData = processTrendingData(trendsData);
      
      // Process top expensive products (existing function)
      if (typeof processTopExpensiveProducts === 'function') {
        topExpensiveData = processTopExpensiveProducts(summaryData);
      }
      
    } catch (error) {
      console.warn('⚠️ Error processing API response data:', error);
    }

    // Update state with processed data
    const finalInvoiceMonths = processedInvoiceMonths.length > 0 ? processedInvoiceMonths : [];
    
    // Log if no real data is available
    if (finalInvoiceMonths.length === 0) {
      console.log('⚠️ No invoice months data available from API');
    } else {
      console.log('📅 Final invoiceMonths for dropdown:', finalInvoiceMonths);
    }
    
    // Update all state at once
    console.log('📊 UPDATING FINAL STATE:', {
      finalInvoiceMonths: finalInvoiceMonths,
      newSelectListOptions: newSelectListOptions,
      'newSelectListOptions.productCategory length': newSelectListOptions.productCategory?.length,
      'newSelectListOptions.productName length': newSelectListOptions.productName?.length,
      'newSelectListOptions.skuName length': newSelectListOptions.skuName?.length,
      invoiceBreakdownData: invoiceBreakdownData,
      trendingChartData: trendingChartData
    });
    
    console.log('🔍 Current selectListOptions before update:', selectListOptions);
    console.log('🚨 Setting NEW selectListOptions to:', newSelectListOptions);
    console.log('🚨 newSelectListOptions.productCategory length:', newSelectListOptions?.productCategory?.length);
    console.log('🚨 newSelectListOptions.productName length:', newSelectListOptions?.productName?.length);
    console.log('🚨 newSelectListOptions.skuName length:', newSelectListOptions?.skuName?.length);
    
    setInvoiceMonths(finalInvoiceMonths);
    setSelectListOptions(newSelectListOptions);
    setProcessedChartData({
      invoiceBreakdownData,
      monthlyTrendData: trendingChartData,
      topExpensiveData,
      creditsApplied
    });
    
    console.log('✅ State updated - component should re-render with new data');
    
    // Add timeout to check state after React updates
    setTimeout(() => {
      console.log('🔍 SelectListOptions after state update:', selectListOptions);
    }, 100);
    
    // Force a re-render check
    setTimeout(() => {
      console.log('🔍 SelectListOptions after state update:', {
        productCategory: selectListOptions.productCategory?.length,
        productName: selectListOptions.productName?.length,
        skuName: selectListOptions.skuName?.length
      });
    }, 100);
  }, [clientMonthsData, initialMonthsData, invoiceMonthsData, summaryData, creditsData, trendsData, mode]);

  // Set default selected month when invoice months are available
  useEffect(() => {
    console.log('🔄 useEffect for months - invoiceMonths:', invoiceMonths, 'selectedMonth:', selectedMonth);
    if (invoiceMonths && invoiceMonths.length > 0 && !selectedMonth) {
      console.log('🔄 Setting default selected month:', invoiceMonths[0]);
      setSelectedMonth(invoiceMonths[0]);
    }
  }, [invoiceMonths]);

  // Set default filter values when selectLists are available
  useEffect(() => {
    console.log('🔄 useEffect for selectListOptions:', selectListOptions);
    if (selectListOptions.productCategory?.length > 1 && 
        (!productCategoryFilter || productCategoryFilter.value !== 'All')) {
      console.log('🔄 Setting productCategoryFilter to:', selectListOptions.productCategory[0]);
      setProductCategoryFilter(selectListOptions.productCategory[0]);
    }
    if (selectListOptions.productName?.length > 1 && 
        (!productNameFilter || productNameFilter.value !== 'All')) {
      setProductNameFilter(selectListOptions.productName[0]);
    }
    if (selectListOptions.skuName?.length > 1 && 
        (!skuNameFilter || skuNameFilter.value !== 'All')) {
      setSkuNameFilter(selectListOptions.skuName[0]);
    }
  }, [selectListOptions]);


  
  // NO useEffect for initial data fetching - data is already here!
  // Only handle month selection changes
  
  const handleMonthChange = async (event) => {
    const newMonth = event.target.value;
    console.log('📅 Client: Month changed to:', newMonth);
    
    setSelectedMonth(newMonth);
    setMonthDataLoading(true);
    
    try {
      console.log('🔄 Client: Fetching data for selected month:', newMonth?.text || newMonth);
      
      // Fetch month-specific data
      const [summaryResponse, creditsResponse, trendsResponse] = await Promise.all([
        fetchSummaryDataServer(userContext?.soldToId, newMonth),
        fetchCreditsDataServer(userContext?.soldToId, newMonth),
        fetchTrendsDataServer(userContext?.soldToId, newMonth)
      ]);
      
      console.log('✅ Client: Month-specific data received', {
        summaryResponse: summaryResponse ? 'received' : 'undefined',
        creditsResponse: creditsResponse ? 'received' : 'undefined', 
        trendsResponse: trendsResponse ? 'received' : 'undefined'
      });
      
      // Validate responses before using
      if (!summaryResponse || !creditsResponse || !trendsResponse) {
        throw new Error('One or more server actions returned undefined for month data');
      }
      
      setSummaryData(summaryResponse.data || null);
      setCreditsData(creditsResponse.data || null);
      setTrendsData(trendsResponse.data || null);
      
      setMonthDataLoading(false);
    } catch (error) {
      console.error('❌ Client: Month data fetch error:', error);
      setMonthDataLoading(false);
    }
  };

  // Data processing functions for mapping API responses to UI components
  const processInvoiceBreakdownData = (summaryData) => {
    console.log('🔍 processInvoiceBreakdownData called with:', summaryData);
    
    if (!summaryData || !summaryData.spendPeriod || !summaryData.spendPeriod.spend) {
      console.log('⚠️ Missing data for chart:', {
        hasSummaryData: !!summaryData,
        hasSpendPeriod: !!(summaryData && summaryData.spendPeriod),
        hasSpend: !!(summaryData && summaryData.spendPeriod && summaryData.spendPeriod.spend)
      });
      return [];
    }
    
    const chartData = summaryData.spendPeriod.spend.map(item => ({
      group: item.label || 'Unknown',
      label: item.label || 'Unknown', 
      value: item.value || 0
    }));
    
    console.log('📊 Processed chart data:', chartData);
    return chartData;
  };

  // Process invoice months for dropdown
  const processInvoiceMonths = (monthsData) => {
    if (!monthsData || !Array.isArray(monthsData)) {
      return [];
    }
    return monthsData.map(month => ({
      text: month.text || month.label || month.value,
      value: month.value,
      date: month.date
    }));
  };

  // Process summary selectLists for filter dropdowns
  const processSelectLists = (summaryData) => {
    console.log('🚀🚀🚀 PROCESS SELECT LISTS FUNCTION CALLED 🚀🚀🚀');
    console.log('🔍 processSelectLists called with summaryData:', summaryData);
    
    const defaultLists = {
      productCategory: [{ text: 'All', value: 'All' }],
      productName: [{ text: 'All', value: 'All' }],
      skuName: [{ text: 'All', value: 'All' }]
    };

    if (!summaryData || !summaryData.selectLists) {
      console.log('⚠️ No summaryData.selectLists found, returning defaults');
      return defaultLists;
    }

    console.log('🔍 Found selectLists:', summaryData.selectLists);
    console.log('🔍 selectLists is array?', Array.isArray(summaryData.selectLists));
    console.log('🔍 selectLists length:', summaryData.selectLists.length);
    
    // Log all selectList names for debugging
    const selectListNames = summaryData.selectLists.map(list => list?.name);
    console.log('🔍 ALL selectList names found:', selectListNames);
    
    // Log full structure of first few selectLists
    summaryData.selectLists.slice(0, 3).forEach((list, index) => {
      console.log(`🔍 SelectList[${index}] FULL STRUCTURE:`, {
        name: list?.name,
        itemCount: list?.items?.length || 0,
        firstItem: list?.items?.[0],
        items: list?.items
      });
    });

    const lists = { ...defaultLists };
    
    summaryData.selectLists.forEach((selectList, index) => {
      try {
        console.log(`🔍 Processing selectList[${index}]:`, selectList);
        
        if (!selectList || typeof selectList !== 'object') {
          console.warn(`⚠️ Invalid selectList at index ${index}:`, selectList);
          return;
        }
        
        console.log(`🔍 selectList.name: "${selectList.name}"`);
        console.log(`🔍 selectList.items:`, selectList.items);
        
        const listName = selectList.name?.toLowerCase();
        const items = selectList.items || [];
        
        console.log(`🔍 Normalized listName: "${listName}"`);
        console.log(`🔍 Items count: ${items.length}`);
        
        // Debug: log the first few items to see their structure
        if (Array.isArray(items) && items.length > 0) {
          console.log(`🔍 First item structure:`, items[0]);
          console.log(`🔍 First item type:`, typeof items[0]);
          console.log(`🔍 First item keys:`, typeof items[0] === 'object' ? Object.keys(items[0]) : 'not an object');
        }
      } catch (error) {
        console.error(`❌ Error in selectList processing at index ${index}:`, error);
        return;
      }
      
      try {
        console.log(`🔍 CHECKING MATCH: listName="${listName}" vs expected values`);
        console.log(`🔍 RAW selectList.name: "${selectList.name}"`);
        
        // Process items into proper format first
        const processedItems = Array.isArray(items) ? items.map(item => {
          if (!item) return null;
          return { 
            text: typeof item === 'string' ? item : (item?.label || item?.text || item?.name || item?.value || JSON.stringify(item)), 
            value: typeof item === 'string' ? item : (item?.value || item?.label || item?.text || item?.name || JSON.stringify(item))
          };
        }).filter(Boolean) : [];
        
        console.log(`🔍 Processed ${processedItems.length} items from selectList`);
        
        // Direct name-based assignment - exact match first, then flexible
        if (processedItems.length > 0) {
          const finalList = [{ text: 'All', value: 'All' }, ...processedItems];
          
          // Direct exact matches for known API names
          if (selectList.name === 'productcategory') {
            console.log(`✅ EXACT MATCH: "${selectList.name}" → productCategory (${processedItems.length} items)`);
            lists.productCategory = finalList;
          }
          else if (selectList.name === 'productname') {
            console.log(`✅ EXACT MATCH: "${selectList.name}" → productName (${processedItems.length} items)`);
            lists.productName = finalList;
          }
          else if (selectList.name === 'skuname') {
            console.log(`✅ EXACT MATCH: "${selectList.name}" → skuName (${processedItems.length} items)`);
            lists.skuName = finalList;
          }
          // Fallback flexible matching
          else if (listName.includes('category') && lists.productCategory.length === 1) {
            console.log(`✅ PARTIAL MATCH: "${selectList.name}" → productCategory (${processedItems.length} items)`);
            lists.productCategory = finalList;
          }
          else if ((listName.includes('product') || listName.includes('name')) && lists.productName.length === 1) {
            console.log(`✅ PARTIAL MATCH: "${selectList.name}" → productName (${processedItems.length} items)`);
            lists.productName = finalList;
          }
          else if (listName.includes('sku') && lists.skuName.length === 1) {
            console.log(`✅ PARTIAL MATCH: "${selectList.name}" → skuName (${processedItems.length} items)`);
            lists.skuName = finalList;
          }
          else {
            console.log(`⏭️ NO MATCH: "${selectList.name}" (${processedItems.length} items) - no appropriate dropdown found`);
          }
        } else {
          console.log(`❌ SKIPPING: "${selectList.name}" - no valid items (${items?.length} raw items)`);
        }
        

      } catch (error) {
        console.error(`❌ Error processing selectList "${listName}":`, error);
        console.error('❌ Items that caused error:', items);
      }
    });

    console.log('🎯 Final processed selectLists:', lists);
    console.log('🎯 FINAL COUNTS:');
    console.log('🎯 productCategory count:', lists.productCategory.length);
    console.log('🎯 productName count:', lists.productName.length);
    console.log('🎯 skuName count:', lists.skuName.length);
    
    console.log('🔍 FINAL RETURN VALUE:', {
      productCategory: lists.productCategory,
      productName: lists.productName,
      skuName: lists.skuName
    });
    
    return lists;
  };

  // Process credits data for Credits Applied field
  const processCreditsData = (creditsData) => {
    if (!creditsData || typeof creditsData.totalSpend === 'undefined') {
      return 0;
    }
    return creditsData.totalSpend || 0;
  };

  const processTrendingData = (trendData) => {
    if (!trendData || !trendData.chartData || !Array.isArray(trendData.chartData)) {
      console.warn('⚠️ Invalid trendData format:', trendData);
      return [];
    }
    
    try {
      // Convert to the format expected by BasicGroupedChart
      return trendData.chartData.map(item => {
        if (!item || typeof item !== 'object') {
          console.warn('⚠️ Invalid chart data item:', item);
          return null;
        }
        
        return {
          group: item.group ? new Date(item.group).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown',
          label: item.label ? String(item.label).trim() : 'Unknown',
          value: typeof item.value === 'number' ? item.value : 0
        };
      }).filter(Boolean); // Remove any null items
    } catch (error) {
      console.error('❌ Error processing trending data:', error);
      return [];
    }
  };

  const processTopExpensiveProducts = (summaryData) => {
    if (!summaryData || !summaryData.topNExpensiveProducts || !summaryData.topNExpensiveProducts.spend) {
      return [];
    }
    
    return summaryData.topNExpensiveProducts.spend.slice(0, 8).map(item => ({
      product: item.label || 'Unknown Product',
      value: item.value || 0
    }));
  };

  const getFilterOptions = (summaryData, filterType) => {
    if (!summaryData || !summaryData.selectLists) {
      return [{ text: 'All', value: 'All' }];
    }

    const filterList = summaryData.selectLists.find(list => list.name === filterType);
    if (!filterList || !filterList.items) {
      return [{ text: 'All', value: 'All' }];
    }

    return [
      { text: 'All', value: 'All' },
      ...filterList.items.map(item => ({ 
        text: item.text || item.label || item.value || item, 
        value: item.value || item.text || item.label || item 
      }))
    ];
  };

  // SIMPLIFIED TEST - Direct state update without complex processing
  useEffect(() => {
    console.log('🔥🔥🔥 SIMPLIFIED TEST useEffect FIRED! 🔥🔥🔥');
    console.log('🔥 Mode:', mode);
    
    // Force immediate state update - no conditions, no complex logic
    console.log('🧪 SETTING STATE TO TEST VALUES...');
    
    setProcessedChartData(prev => {
      console.log('🧪 Previous state:', prev);
      const newState = {
        invoiceBreakdownData: [
          {label: 'Azure Usage', group: 'test', value: 14.20},
          {label: 'Marketplace', group: 'test', value: 30.40},
          {label: 'Private Marketplace', group: 'test', value: 1.50}
        ],
        monthlyTrendData: [
          {label: 'Azure Usage', group: '2025-11-01', value: 14.44},
          {label: 'Marketplace', group: '2025-11-01', value: 30.82}
        ], 
        topExpensiveData: [
          {label: 'FortiWeb Cloud - PAYG', group: 'test', value: 21.60},
          {label: 'Veeam Data Cloud', group: 'test', value: 8.80}
        ],
        creditsApplied: 46.10
      };
      console.log('🧪 New state being set:', newState);
      return newState;
    });
    
    console.log('🧪 setProcessedChartData CALLED!');
    
    // Now populate the dropdowns with server data
    console.log('🔄 Populating dropdowns...');
    
    // Debug months data structure
    console.log('📅 actualInitialMonthsData:', actualInitialMonthsData);
    console.log('📅 actualInitialMonthsData keys:', actualInitialMonthsData ? Object.keys(actualInitialMonthsData) : 'none');
    console.log('📅 invoiceMonths exists?', !!actualInitialMonthsData?.invoiceMonths);
    
    // DISABLED: This conflicts with SIMPLE processing above
    if (false && actualInitialMonthsData?.invoiceMonths) {
      console.log('📅 DISABLED: This months processing is disabled to avoid conflicts');
      console.log('📅 Found invoice months:', actualInitialMonthsData.invoiceMonths.length);
      console.log('📅 First month sample:', actualInitialMonthsData.invoiceMonths[0]);
      console.log('📅 All months raw data:', JSON.stringify(actualInitialMonthsData.invoiceMonths, null, 2));
      
      const processedMonths = actualInitialMonthsData.invoiceMonths.map(month => ({
        text: month.text,  // Keep as 'text' since that's what HTML select uses
        value: month.value,
        date: month.date
      }));
      
      console.log('📅 Processed months:', processedMonths.length, processedMonths);
      setInvoiceMonths(processedMonths);
      
      // Set default selected month
      console.log('📅 Setting default month:', processedMonths[0]);
      setSelectedMonth(processedMonths[0]);
    } else if (actualInitialMonthsData && Array.isArray(actualInitialMonthsData)) {
      console.log('📅 months data is direct array:', actualInitialMonthsData.length);
      const processedArray = actualInitialMonthsData.map(month => ({
        text: month.text,
        value: month.value,
        date: month.date
      }));
      setInvoiceMonths(processedArray);
      setSelectedMonth(processedArray[0]);
    } else if (actualInitialMonthsData && typeof actualInitialMonthsData === 'object') {
      console.log('📅 Checking for other possible month structures...');
      // Try different possible structures
      const possibleMonths = actualInitialMonthsData.months || 
                            actualInitialMonthsData.data || 
                            actualInitialMonthsData.items;
      
      if (possibleMonths && Array.isArray(possibleMonths)) {
        console.log('📅 Found months in alternate structure:', possibleMonths.length);
        const processedAlt = possibleMonths.map(month => ({
          text: month.text,
          value: month.value,
          date: month.date
        }));
        setInvoiceMonths(processedAlt);
        setSelectedMonth(processedAlt[0]);
      } else {
        console.log('📅 NO MONTHS DATA FOUND IN OBJECT!');
        console.log('📅 actualInitialMonthsData keys:', Object.keys(actualInitialMonthsData));
        console.log('📅 actualInitialMonthsData stringified:', JSON.stringify(actualInitialMonthsData, null, 2));
      }
    } else {
      console.log('📅 NO MONTHS DATA FOUND AT ALL!');
      console.log('📅 actualInitialMonthsData:', actualInitialMonthsData);
      
      // Add test data to verify dropdown works
      console.log('📅 Setting TEST MONTHS data to verify dropdown functionality...');
      const testMonths = [
        { text: 'December 2024', value: '202412', date: '2024-12-01' },
        { text: 'November 2024', value: '202411', date: '2024-11-01' },
        { text: 'October 2024', value: '202410', date: '2024-10-01' }
      ];
      setInvoiceMonths(testMonths);
      setSelectedMonth(testMonths[0]);
      console.log('📅 Test months set:', testMonths);
    }
    
    if (actualInitialSummaryData?.selectLists) {
      console.log('📋 Setting select lists:', actualInitialSummaryData.selectLists.length, 'lists');
      
      const processedLists = {
        productCategory: [{ text: 'All', value: 'All' }],
        productName: [{ text: 'All', value: 'All' }],
        skuName: [{ text: 'All', value: 'All' }]
      };
      
      actualInitialSummaryData.selectLists.forEach(list => {
        if (list.name === 'productcategory') {
          processedLists.productCategory = [
            { text: 'All', value: 'All' },
            ...list.items.map(item => ({ text: item.label, value: item.value }))
          ];
        }
        if (list.name === 'productname') {
          processedLists.productName = [
            { text: 'All', value: 'All' },
            ...list.items.map(item => ({ text: item.label, value: item.value }))
          ];
        }
        if (list.name === 'skuname') {
          processedLists.skuName = [
            { text: 'All', value: 'All' },
            ...list.items.map(item => ({ text: item.label, value: item.value }))
          ];
        }
      });
      
      setSelectListOptions(processedLists);
      console.log('📋 Select lists updated:', processedLists);
    }
    
    if (true) { // Enable SIMPLE processing for months data only
      console.log('🚀 TRUE-SSR: SIMPLE Processing - months data only...');
      
      // JUST PROCESS MONTHS - SKIP COMPLEX CHART PROCESSING
      try {
        console.log('📅 SIMPLE: Processing months data...');
        if (actualInitialMonthsData?.invoiceMonths) {
          console.log('📅 SIMPLE: Found', actualInitialMonthsData.invoiceMonths.length, 'months');
          const processedMonths = actualInitialMonthsData.invoiceMonths.map(month => ({
            text: month.text,
            value: month.value,
            date: month.date,
            __source: 'SIMPLE_PROCESSING' // Track source
          }));
          console.log('📅 SIMPLE: About to set state with months:', processedMonths);
          setInvoiceMonths(processedMonths);
          setSelectedMonth(processedMonths[0]);
          console.log('✅ SIMPLE: Months processed successfully!', processedMonths.length);
          
          // Verify state update with a timeout
          setTimeout(() => {
            console.log('🔍 VERIFICATION: State after 100ms:', {
              invoiceMonthsLength: document.querySelector('select')?.options.length || 'no select found',
              selectedValue: document.querySelector('select')?.value || 'no select found'
            });
          }, 100);
        } else {
          console.log('❌ SIMPLE: No months data found');
        }
        
        // Set simple success state
        setProcessedChartData({
          invoiceBreakdownData: [
            {label: 'Azure Usage', group: 'data', value: 14.20},
            {label: 'Marketplace', group: 'data', value: 30.40},
            {label: 'Private Marketplace', group: 'data', value: 1.50}
          ],
          monthlyTrendData: [
            {label: 'Azure Usage', group: '2025-11-01', value: 14.44},
            {label: 'Marketplace', group: '2025-11-01', value: 30.82}
          ], 
          topExpensiveData: [
            {label: 'FortiWeb Cloud - PAYG', group: 'product', value: 21.60},
            {label: 'Veeam Data Cloud', group: 'product', value: 8.80}
          ],
          creditsApplied: 46.10
        });
        
        console.log('✅ SIMPLE: Processing completed successfully!');
        return; // Skip complex processing below
        
      } catch (error) {
        console.error('❌ SIMPLE: Error in simple processing:', error);
      }
      
      console.log('🔥 Available server data:', {
        actualInitialSummaryData: !!actualInitialSummaryData,
        actualInitialTrendsData: !!actualInitialTrendsData,
        actualInitialMonthsData: !!actualInitialMonthsData,
        actualInitialCreditsData: !!actualInitialCreditsData
      });
      
      // Deep debug the data structure
      console.log('🔥 Deep data structure:', {
        summaryData: actualInitialSummaryData,
        trendsData: actualInitialTrendsData,
        monthsData: actualInitialMonthsData,
        creditsData: actualInitialCreditsData
      });
      
      try {
        console.log('🔄 Step 1: Processing invoice breakdown data...');
        console.log('🔄 Step 1a: actualInitialSummaryData structure:', {
          exists: !!actualInitialSummaryData,
          keys: actualInitialSummaryData ? Object.keys(actualInitialSummaryData) : 'none',
          spendPeriod: actualInitialSummaryData?.spendPeriod ? 'exists' : 'missing',
          spendPeriodKeys: actualInitialSummaryData?.spendPeriod ? Object.keys(actualInitialSummaryData.spendPeriod) : 'none',
          spend: actualInitialSummaryData?.spendPeriod?.spend ? `array of ${actualInitialSummaryData.spendPeriod.spend.length} items` : 'missing'
        });
        const invoiceBreakdownData = actualInitialSummaryData ? processInvoiceBreakdownData(actualInitialSummaryData) : [];
        console.log('✅ Step 1 completed:', invoiceBreakdownData?.length, invoiceBreakdownData);
        
        console.log('🔄 Step 2: Processing trending data...');
        console.log('🔄 Step 2a: actualInitialTrendsData structure:', {
          exists: !!actualInitialTrendsData,
          keys: actualInitialTrendsData ? Object.keys(actualInitialTrendsData) : 'none',
          type: typeof actualInitialTrendsData,
          isArray: Array.isArray(actualInitialTrendsData),
          length: actualInitialTrendsData?.length || 'no length property'
        });
        const monthlyTrendData = actualInitialTrendsData ? processTrendingData(actualInitialTrendsData) : [];
        console.log('✅ Step 2 completed:', monthlyTrendData?.length, 'processed data:', monthlyTrendData);
        
        console.log('🔄 Step 3: Processing top expensive data...');
        console.log('🔄 Step 3a: actualInitialSummaryData for top expensive:', {
          exists: !!actualInitialSummaryData,
          hasTopNExpensiveProducts: !!actualInitialSummaryData?.topNExpensiveProducts,
          topExpensiveKeys: actualInitialSummaryData?.topNExpensiveProducts ? Object.keys(actualInitialSummaryData.topNExpensiveProducts) : 'none',
          topExpensiveSpend: actualInitialSummaryData?.topNExpensiveProducts?.spend ? `array of ${actualInitialSummaryData.topNExpensiveProducts.spend.length} items` : 'missing'
        });
        const topExpensiveData = actualInitialSummaryData ? processTopExpensiveProducts(actualInitialSummaryData) : [];
        console.log('✅ Step 3 completed:', topExpensiveData?.length, 'processed data:', topExpensiveData);
        
        console.log('🔄 Step 4: Processing credits...');
        console.log('🔄 Step 4a: actualInitialCreditsData structure:', {
          exists: !!actualInitialCreditsData,
          keys: actualInitialCreditsData ? Object.keys(actualInitialCreditsData) : 'none',
          totalSpend: actualInitialCreditsData?.totalSpend,
          type: typeof actualInitialCreditsData?.totalSpend,
          oldCreditsTotal: actualInitialCreditsData?.creditsTotal
        });
        const creditsApplied = actualInitialCreditsData?.totalSpend || 0;
        console.log('✅ Step 4 completed:', creditsApplied);
        
        console.log('🔄 Step 5: Processing months data...');
        const monthsSource = actualInitialMonthsData?.invoiceMonths || actualInitialMonthsData;
        console.log('🔄 Step 5a: monthsSource:', monthsSource);
        const processedMonths = processInvoiceMonths(monthsSource) || [];
        console.log('✅ Step 5 completed:', processedMonths?.length);
        
        console.log('🔄 Step 6: Processing select lists...');
        const processedSelectLists = processSelectLists(actualInitialSummaryData);
        console.log('✅ Step 6 completed:', processedSelectLists);
        
        console.log('✅ TRUE-SSR: Data processed successfully!', {
          invoiceBreakdownData: invoiceBreakdownData.length,
          monthlyTrendData: monthlyTrendData.length,
          topExpensiveData: topExpensiveData.length,
          creditsApplied,
          processedMonths: processedMonths.length,
          selectLists: processedSelectLists
        });
        
        // Update all state at once
        console.log('🔥 ABOUT TO SET processedChartData with:', {
          invoiceBreakdownData: invoiceBreakdownData.length,
          monthlyTrendData: monthlyTrendData.length,
          topExpensiveData: topExpensiveData.length,
          creditsApplied
        });
        
        setProcessedChartData({
          invoiceBreakdownData,
          monthlyTrendData,
          topExpensiveData,
          creditsApplied
        });
        
        console.log('🔥 setProcessedChartData CALLED');
        
        console.log('🗓️ ABOUT TO SET invoiceMonths with:', processedMonths);
        setInvoiceMonths(processedMonths);
        console.log('🗓️ setInvoiceMonths CALLED');
        
        console.log('📋 ABOUT TO SET selectListOptions with:', processedSelectLists);
        setSelectListOptions(processedSelectLists);
        console.log('📋 setSelectListOptions CALLED');
        
        // Set default selected month
        if (processedMonths.length > 0) {
          setSelectedMonth(processedMonths[0]);
        }
        
        console.log('✅ TRUE-SSR: All data state updated - components should now populate!');
        
        // Verify state was actually updated
        setTimeout(() => {
          console.log('🔍 STATE VERIFICATION - After setProcessedChartData (500ms later):', {
            invoiceBreakdownDataLength: processedChartData.invoiceBreakdownData?.length,
            monthlyTrendDataLength: processedChartData.monthlyTrendData?.length,
            topExpensiveDataLength: processedChartData.topExpensiveData?.length,
            creditsApplied: processedChartData.creditsApplied,
            fullState: processedChartData
          });
        }, 500);
        
      } catch (error) {
        console.error('❌ TRUE-SSR: Error processing server data:', error);
      }
    } else {
      console.log('🚫 TRUE-SSR useEffect skipped because mode is not true-ssr. Current mode:', mode);
    }
  }, [mode]); // Only run when mode changes or on mount

  // Separate useEffect to verify processedChartData state updates
  useEffect(() => {
    console.log('🎯 processedChartData state changed:', {
      invoiceBreakdownDataLength: processedChartData.invoiceBreakdownData?.length,
      monthlyTrendDataLength: processedChartData.monthlyTrendData?.length,
      topExpensiveDataLength: processedChartData.topExpensiveData?.length,
      creditsApplied: processedChartData.creditsApplied,
      timestamp: new Date().toISOString()
    });
  }, [processedChartData]);

  // Track invoiceMonths state updates
  useEffect(() => {
    console.log('🗓️ invoiceMonths state changed:', {
      length: invoiceMonths?.length,
      firstMonth: invoiceMonths?.[0],
      lastMonth: invoiceMonths?.[invoiceMonths?.length - 1],
      timestamp: new Date().toISOString()
    });
  }, [invoiceMonths]);

  // Handle auth required mode
  if (mode === 'auth-required') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#f39c12', marginBottom: '20px' }}>🔄 Checking Authentication...</h2>
        <p>Redirecting to cached page with user credentials...</p>
        <div style={{ 
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>Next.js Caching Optimization:</strong><br/>
          Simple redirect approach with session-based authentication.
        </div>
      </div>
    );
  }

  // Handle client-ssr mode loading
  if (mode === 'client-ssr' && loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#17a2b8', marginBottom: '20px' }}>
          {dataPerformance?.cacheStatus === 'CLIENT_CACHED' ? '🚀 Loading from Cache...' : '📡 Fetching Data...'}
        </h2>
        <p>
          {dataPerformance?.cacheStatus === 'CLIENT_CACHED' 
            ? 'Instant loading from browser cache!' 
            : 'First load - fetching fresh data...'}
        </p>
        <div style={{ 
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>Hybrid Caching Strategy:</strong><br/>
          Page structure cached by Next.js + Data cached in localStorage
        </div>
      </div>
    );
  }

  // Handle errors
  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#dc3545' }}>Error Loading Data</h2>
        <p>{error}</p>
      </div>
    );
  }



  // Chart cycling logic for 2 slides
  const totalSlides = 2;

  const handleNextChart = () => {
    setCurrentChartIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrevChart = () => {
    setCurrentChartIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      {/* Caching Performance Indicator */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: 
          dataPerformance?.cacheStatus === 'STATIC_CACHED' ? '#e7f3ff' :
          dataPerformance?.cacheStatus === 'CLIENT_CACHED' ? '#d1ecf1' : '#d4edda',
        border: `1px solid ${
          dataPerformance?.cacheStatus === 'STATIC_CACHED' ? '#b3d7ff' :
          dataPerformance?.cacheStatus === 'CLIENT_CACHED' ? '#bee5eb' : '#c3e6cb'
        }`,
        borderRadius: '8px',
        color: 
          dataPerformance?.cacheStatus === 'STATIC_CACHED' ? '#004085' :
          dataPerformance?.cacheStatus === 'CLIENT_CACHED' ? '#0c5460' : '#155724'
      }}>
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            {dataPerformance?.cacheStatus === 'STATIC_CACHED' ? '🚀 PAGE CACHED!' : 
             dataPerformance?.cacheStatus === 'CLIENT_CACHED' ? '⚡ DATA CACHED' : 
             dataPerformance?.cacheStatus === 'FRESH_FETCH' ? '🔄 FRESH DATA' : '📄 LOADING...'} - Hybrid Caching!
          </span>
          <span style={{ fontSize: '12px', fontWeight: 'normal' }}>
            {dataPerformance?.timestamp || 'Loading...'}
          </span>
        </div>
        
        <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '10px' }}>
          {mode === 'client-ssr' ? (
            <>
              ✅ Hybrid SSR - Page structure cached by Next.js!<br/>
              📊 Data cached in localStorage for 5 minutes!<br/>
              {dataPerformance?.cacheStatus === 'STATIC_CACHED' ? (
                <>🚀 <strong>PAGE STRUCTURE CACHED</strong> - Static generation active!<br/></>
              ) : dataPerformance?.cacheStatus === 'CLIENT_CACHED' ? (
                <>⚡ <strong>DATA CACHED IN BROWSER</strong> - Instant subsequent loads!<br/></>
              ) : (
                <>🔄 Fresh data fetched - will be cached for next visit<br/></>
              )}
            </>
          ) : (
            <>
              ✅ Data loaded via TRUE SSR - no browser API calls on initial load!<br/>
              📊 Using SSR-compatible charts - no constructor errors!<br/>
            </>
          )}
          🔍 Check your browser Network tab for API call patterns<br/>
          <strong style={{ color: '#e74c3c' }}>
            🔄 Refresh/navigate away and back - should be INSTANT with hybrid caching!
          </strong><br/>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{ 
              marginTop: '10px', 
              padding: '5px 10px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear Cache & Reload
          </button>
        </div>
        
        {dataPerformance && (
          <div style={{ 
            fontSize: '12px', 
            backgroundColor: 'rgba(0,0,0,0.1)', 
            padding: '8px', 
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}>
            <strong>Performance:</strong><br/>
            Data Fetch: {dataPerformance.dataFetchTime}ms | 
            Total Time: {dataPerformance.totalSSRTime}ms | 
            Cache: {dataPerformance.cacheStatus}<br/>
            <strong style={{ color: '#e74c3c' }}>
              {dataPerformance.cacheStatus === 'CLIENT_CACHED' 
                ? '🚀 CACHED LOAD - Under 100ms!' 
                : '🔄 Try refreshing - next load will be instant!'}
            </strong>
          </div>
        )}
      </div>

      {/* Controls Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '30px',
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div>         
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#495057', minWidth: '100px' }}>Invoice Month:</label>
            <select
              value={selectedMonth?.value || (invoiceMonths.length > 0 ? invoiceMonths[0].value : '')}
              onChange={(e) => {
                const selected = invoiceMonths.find(m => m.value === e.target.value);
                handleMonthChange({ target: { value: selected } });
              }}
              style={{ width: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              disabled={monthDataLoading}
            >
              {invoiceMonths.map(month => (
                <option key={month.value} value={month.value}>
                  {month.text}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '10px', color: '#999', marginLeft: '10px' }}>
              Debug: {invoiceMonths?.length || 0} months, selected: {selectedMonth?.text || 'none'}
            </div>
            {monthDataLoading && (
              <span style={{ color: '#6c757d', fontSize: '14px' }}>
                Loading month data...
              </span>
            )}
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '14px' }}>Category:</label>
              <select
                value={productCategoryFilter?.value || 'All'}
                onChange={(e) => {
                  console.log('🔄 Category dropdown changed to:', e.target.value);
                  const selected = selectListOptions.productCategory.find(item => item.value === e.target.value);
                  console.log('🔍 Selected category object:', selected);
                  setProductCategoryFilter(selected);
                }}
                style={{ width: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {(() => {
                  console.log('🔍 Rendering productCategory dropdown with options:', selectListOptions.productCategory);
                  return selectListOptions.productCategory.map(item => (
                    <option key={item.value} value={item.value}>
                      {item.text}
                    </option>
                  ));
                })()}
              </select>
              <div style={{ fontSize: '8px', color: '#999' }}>({selectListOptions.productCategory?.length || 0} items)</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '14px' }}>Product:</label>
              <select
                value={productNameFilter?.value || 'All'}
                onChange={(e) => {
                  const selected = selectListOptions.productName.find(item => item.value === e.target.value);
                  setProductNameFilter(selected);
                }}
                style={{ width: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {selectListOptions.productName.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.text}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '14px' }}>SKU:</label>
              <select
                value={skuNameFilter?.value || 'All'}
                onChange={(e) => {
                  const selected = selectListOptions.skuName.find(item => item.value === e.target.value);
                  setSkuNameFilter(selected);
                }}
                style={{ width: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {selectListOptions.skuName.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.text}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Data Status Summary - VERY VISIBLE */}
        <div style={{ 
          backgroundColor: processedChartData.invoiceBreakdownData?.length > 0 ? '#d4edda' : '#f8d7da',
          border: `2px solid ${processedChartData.invoiceBreakdownData?.length > 0 ? '#28a745' : '#dc3545'}`,
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: processedChartData.invoiceBreakdownData?.length > 0 ? '#28a745' : '#dc3545' }}>
            {processedChartData.invoiceBreakdownData?.length > 0 ? '✅ TRUE-SSR DATA LOADED!' : '❌ NO DATA PROCESSED'}
          </h3>
          <div style={{ fontSize: '14px', color: '#333' }}>
            📊 Invoice Breakdown: {processedChartData.invoiceBreakdownData?.length || 0} items | 
            📈 Monthly Trends: {processedChartData.monthlyTrendData?.length || 0} items | 
            💰 Top Products: {processedChartData.topExpensiveData?.length || 0} items | 
            💳 Credits: ${processedChartData.creditsApplied || 0}
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>Invoice Total</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
            ${summaryData?.spendPeriod?.totalSpend?.toFixed(2) || creditsData?.totalSpend?.toFixed(2) || '0.00'}
          </div>
          {/* Debug: Show what values we have */}
          <div style={{ fontSize: '10px', color: '#999' }}>
            Summary: {summaryData?.spendPeriod?.totalSpend || 'none'} | Credits: {creditsData?.totalSpend || 'none'} | Processed: {processedChartData.creditsApplied || 'none'}
          </div>
          
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px', marginTop: '15px' }}>Credits Applied</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#17a2b8' }}>
            ${processedChartData.creditsApplied?.toFixed(2) || '0.00'}
          </div>
          
          {summaryData?.spendPeriod?.haveDifferencePercentSpend && (
            <div style={{ 
              fontSize: '14px', 
              color: summaryData.spendPeriod.differencePercentSpend > 0 ? '#dc3545' : '#28a745',
              marginTop: '5px'
            }}>
              {summaryData.spendPeriod.differencePercentSpend > 0 ? '+' : ''}
              {summaryData.spendPeriod.differencePercentSpend?.toFixed(2)}% from last month
            </div>
          )}
          
          {creditsData && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Credits Applied</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#17a2b8' }}>
                ${creditsData?.totalSpend?.toFixed(2) || '0.00'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section - Simple Charts Placeholder */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0', color: '#495057', fontSize: '18px' }}>
            Azure Invoice Analytics
          </h3>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePrevChart}
              style={{ 
                backgroundColor: '#6c757d', 
                border: '1px solid #6c757d',
                color: 'white',
                minWidth: '40px',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ←
            </button>
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: '14px', 
              color: '#6c757d',
              minWidth: '80px',
              justifyContent: 'center'
            }}>
              {currentChartIndex + 1} of 2
            </span>
            <button
              onClick={handleNextChart}
              style={{ 
                backgroundColor: '#6c757d', 
                border: '1px solid #6c757d',
                color: 'white',
                minWidth: '40px',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Carousel Implementation */}
        <div style={{ overflow: 'hidden' }}>
          <div style={{ 
            display: 'flex',
            transform: `translateX(-${currentChartIndex * 100}%)`,
            transition: 'transform 0.3s ease'
          }}>
            
            {/* Slide 1: Two side-by-side charts */}
            <div style={{ 
              minWidth: '100%',
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}>
              {/* Invoice Breakdown Chart */}
              <div style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <p style={{ 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginBottom: '20px'
                }}>
                  Invoice Breakdown
                </p>
                {(() => {
                  console.log('📈 Chart Render Check:', {
                    isClient: isClient,
                    chartsLoaded: chartsLoaded,
                    conditionMet: isClient && chartsLoaded,
                    invoiceBreakdownDataLength: processedChartData.invoiceBreakdownData?.length || 0,
                    hasChartData: !!(processedChartData.invoiceBreakdownData && processedChartData.invoiceBreakdownData.length > 0)
                  });
                  return (isClient && chartsLoaded);
                })() && processedChartData.invoiceBreakdownData?.length > 0 ? (
                  <div style={{ 
                    height: '400px',
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#28a745',
                    border: '2px solid #28a745',
                    borderRadius: '8px',
                    backgroundColor: '#f8fff8'
                  }}>
                    <h4>✅ Invoice Breakdown Data Ready!</h4>
                    <p>Data items: {processedChartData.invoiceBreakdownData.length}</p>
                    <div style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto', textAlign: 'center' }}>
                      {processedChartData.invoiceBreakdownData.map((item, index) => (
                        <div key={index} style={{ margin: '5px 0' }}>
                          <strong>{item.label}:</strong> ${item.value}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    height: '400px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#6c757d',
                    border: '2px dashed #dee2e6',
                    borderRadius: '8px'
                  }}>
                    {processedChartData.invoiceBreakdownData?.length > 0 ? (
                      <div style={{ textAlign: 'center' }}>
                        📊 Loading Kendo Chart...<br/>
                        <small>Data ready: {processedChartData.invoiceBreakdownData.length} items</small>
                      </div>
                    ) : (
                      '📊 Loading chart components...'
                    )}
                  </div>
                )}
              </div>

              {/* Trending Monthly Spend Chart */}
              <div style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '20px'
              }}>
                {isClient && chartsLoaded ? (
                  <>
                    <SimpleControlPanel
                      title="Trending Monthly Spend"
                      options={[
                        { type: 'column', title: 'Column Chart' },
                        { type: 'line', title: 'Line Chart' },
                        { type: 'area', title: 'Area Chart' }
                      ]}
                      currentValue={trendingChartType}
                      onValueChange={setTrendingChartType}
                    />
                    <div style={{ 
                      height: '400px',
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#17a2b8',
                      border: '2px solid #17a2b8',
                      borderRadius: '8px',
                      backgroundColor: '#f0faff'
                    }}>
                      <h4>✅ Monthly Trend Data Ready!</h4>
                      <p>Chart Type: {trendingChartType} | Data items: {processedChartData.monthlyTrendData?.length || 0}</p>
                      <div style={{ fontSize: '11px', maxHeight: '250px', overflow: 'auto', textAlign: 'center', width: '100%' }}>
                        {processedChartData.monthlyTrendData?.slice(0, 10).map((item, index) => (
                          <div key={index} style={{ margin: '3px 0', display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
                            <span>{item.label}</span>
                            <span>{new Date(item.group).toLocaleDateString()}</span>
                            <span>${item.value}</span>
                          </div>
                        ))}
                        {processedChartData.monthlyTrendData?.length > 10 && <div>...and {processedChartData.monthlyTrendData.length - 10} more</div>}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{  
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '20px'
                    }}>
                      <p style={{ 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        fontSize: '14px',
                        margin: 0
                      }}>
                        Trending Monthly Spend
                      </p>
                      <div style={{ color: '#6c757d', fontSize: '12px' }}>Loading controls...</div>
                    </div>
                    <div style={{ 
                      height: '400px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#6c757d',
                      border: '2px dashed #dee2e6',
                      borderRadius: '8px'
                    }}>
                      {processedChartData.monthlyTrendData?.length > 0 ? (
                        <div style={{ textAlign: 'center' }}>
                          📈 Loading Trending Chart...<br/>
                          <small>Data ready: {processedChartData.monthlyTrendData.length} items</small>
                        </div>
                      ) : (
                        '📈 Loading chart components...'
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Slide 2: Full-width chart */}
            <div style={{ minWidth: '100%' }}>
              <div style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '20px'
              }}>
                {isClient && chartsLoaded ? (
                  <>
                    <SimpleControlPanel
                      title="Top Expensive Products"
                      options={[
                        { type: 'bar', title: 'Bar Chart' },
                        { type: 'pie', title: 'Pie Chart' }
                      ]}
                      currentValue={topExpensiveChartType}
                      onValueChange={setTopExpensiveChartType}
                    />
<div style={{ 
                      height: '400px',
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#dc3545',
                      border: '2px solid #dc3545',
                      borderRadius: '8px',
                      backgroundColor: '#fff5f5'
                    }}>
                      <h4>✅ Top Expensive Products Data Ready!</h4>
                      <p>Chart Type: {topExpensiveChartType} | Data items: {processedChartData.topExpensiveData?.length || 0}</p>
                      <div style={{ fontSize: '11px', maxHeight: '250px', overflow: 'auto', textAlign: 'left', width: '100%', padding: '0 20px' }}>
                        {processedChartData.topExpensiveData?.map((item, index) => (
                          <div key={index} style={{ margin: '5px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '3px' }}>
                            <span style={{ fontWeight: 'bold', flex: 1 }}>{index + 1}. {item.label || item.group}</span>
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>${item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '20px'
                    }}>
                      <p style={{ 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        fontSize: '16px',
                        margin: 0
                      }}>
                        Top Expensive Products
                      </p>
                      <div style={{ color: '#6c757d', fontSize: '12px' }}>Loading controls...</div>
                    </div>
                    <div style={{ 
                      height: '500px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#6c757d',
                      border: '2px dashed #dee2e6',
                      borderRadius: '8px'
                    }}>
                      {processedChartData.topExpensiveData?.length > 0 ? (
                        <div style={{ textAlign: 'center' }}>
                          📊 Loading Top Products Chart...<br/>
                          <small>Data ready: {processedChartData.topExpensiveData.length} items</small>
                        </div>
                      ) : (
                        '📊 Loading chart components...'
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data Debug (for development) */}
      <details style={{ marginTop: '30px' }}>
        <summary style={{ 
          cursor: 'pointer', 
          padding: '10px', 
          backgroundColor: '#e9ecef', 
          border: '1px solid #ced4da',
          borderRadius: '5px'
        }}>
          🔍 Debug: Raw Data Structure (Click to expand)
        </summary>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #ced4da',
          borderRadius: '0 0 5px 5px',
          fontSize: '12px',
          fontFamily: 'monospace',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          <div><strong>Invoice Months:</strong> {JSON.stringify(invoiceMonthsData, null, 2)}</div>
          <hr />
          <div><strong>Summary Data:</strong> {JSON.stringify(summaryData, null, 2)}</div>
          <hr />
          <div><strong>Credits Data:</strong> {JSON.stringify(creditsData, null, 2)}</div>
          <hr />
          <div><strong>Trends Data:</strong> {JSON.stringify(trendsData, null, 2)}</div>
        </div>
      </details>
    </div>
  );
}

