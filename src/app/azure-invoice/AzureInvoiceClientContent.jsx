// src/app/azure-invoice/AzureInvoiceClientContent.jsx
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/ErrorBoundary';
import CachePerformanceIndicator from '@/components/CachePerformanceIndicator';
import { fetchAzureInvoiceDataForMonth } from './actions';
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
    } else {
      // Clear all Azure Invoice related cache
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('azure-invoice-') || key.startsWith('azure-session-')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Client component that receives SSR data and handles interactivity
 * NO initial data fetching - data comes from server as props!
 */
import { useDispatch, useSelector } from 'react-redux';
import { 
  setInitialSSRData,
  setMonthData,
  setProcessedChartData as setProcessedChartDataRedux,
  setSelectListOptions as setSelectListOptionsRedux,
  setInvoiceMonths as setInvoiceMonthsRedux,
  setSelectedMonth as setSelectedMonthRedux,
  getCachedMonthData,
  validateSession,
  selectAzureInvoiceData,
  selectProcessedChartData,
  selectInvoiceMonths,
  selectSelectedMonth,
  selectSelectListOptions,
  selectCacheMetadata,
  selectMonthDataCache
} from '../../store/azureInvoiceSlice';
import { useHasRehydrated } from '@/hooks/useHasRehydrated';

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
  
  // Redux setup
  const dispatch = useDispatch();
  const isRehydrated = useHasRehydrated(); // NEW: Use the custom hook
  const reduxAzureData = useSelector(selectAzureInvoiceData);
  const reduxProcessedChartData = useSelector(selectProcessedChartData);
  const reduxInvoiceMonths = useSelector(selectInvoiceMonths);
  const reduxSelectedMonth = useSelector(selectSelectedMonth);
  const reduxSelectListOptions = useSelector(selectSelectListOptions);
  const cacheMetadata = useSelector(selectCacheMetadata);
  const monthDataCache = useSelector(selectMonthDataCache);
  
  
  // 🚨 CRITICAL DEBUG: Check if Redux persist is working
  
  // Handle new true-ssr mode with initialData structure
  // Server actions return { error, data } - extract .data property
  const actualInitialMonthsData = mode === 'true-ssr' ? initialData?.monthsResponse?.data : initialMonthsData;
  const actualInitialSummaryData = mode === 'true-ssr' ? initialData?.summaryResponse?.data : initialSummaryData;
  const actualInitialCreditsData = mode === 'true-ssr' ? initialData?.creditsResponse?.data : initialCreditsData;
  const actualInitialTrendsData = mode === 'true-ssr' ? initialData?.trendsResponse?.data : initialTrendsData;

  
  // CRITICAL DEBUG: See what server actually sent
  
  if (initialData?.monthsResponse) {
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
  
  // Check if we have valid cached data for current session
  const sessionValid = !userContext?.soldToId || cacheMetadata?.soldToId === userContext?.soldToId;
  const hasCachedRawData = reduxAzureData?.monthsData && cacheMetadata?.lastUpdated;
  const hasCachedProcessedData = reduxProcessedChartData?.invoiceBreakdownData?.length > 0;
  const hasCachedSelectLists = reduxSelectListOptions?.productCategory?.length > 1;
  const hasCachedInvoiceMonths = reduxInvoiceMonths?.length > 0;
  
  // 🔥 EXTREMELY AGGRESSIVE CACHE VALIDATION - Check for ANY cached data
  const hasAnyReduxData = !!(
    reduxAzureData?.monthsData ||
    reduxAzureData?.summaryData ||
    reduxAzureData?.creditsData ||
    reduxAzureData?.trendsData ||
    reduxProcessedChartData?.invoiceBreakdownData?.length ||
    reduxSelectListOptions?.productCategory?.length ||
    reduxInvoiceMonths?.length
  );
  
  
  // 🚀 ULTRA-AGGRESSIVE CACHE STRATEGY - Use cached data immediately if available
  const cacheAge = cacheMetadata?.lastUpdated ? Date.now() - cacheMetadata.lastUpdated : null;
  
  // FORCE cache usage if we have ANY cached data at all (ignore age for now)
  const forceCacheUsage = hasAnyReduxData && sessionValid; // Only use cache if session is valid
  
  // Override cache decision - use cache aggressively
  const isCacheValid = forceCacheUsage;
  

  // 🔍 DEEP REDUX STORE INSPECTION

  // Performance timing
  const componentStartTime = Date.now();
  
  
  // Check localStorage as fallback if Redux isn't working
  let hasLocalStorageCache = false;
  if (typeof window !== 'undefined') {
    try {
      const persistedState = localStorage.getItem('persist:ccr-azure-invoice');
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        hasLocalStorageCache = !!(parsed.monthsData || parsed.processedChartData);
      }
    } catch (error) {
      console.warn('📱 LocalStorage check failed:', error);
    }
  }
  
  // 🚀 FORCE CACHE USAGE - Use cached data aggressively, BUT ONLY IF REHYDRATED
  const useReduxData = isRehydrated && (isCacheValid || hasLocalStorageCache || hasAnyReduxData);
  const dataSource = useReduxData ? 
    (isCacheValid ? '⚡ REDUX_INSTANT_CACHE' : (hasLocalStorageCache ? '📱 LOCALSTORAGE_FALLBACK' : '🔥 EMERGENCY_REDUX_OVERRIDE')) : 
    (isRehydrated ? '🐌 SSR_SLOW_FRESH' : '⏳ AWAITING_REHYDRATION');
  
  
  // 🛑 IMMEDIATE EARLY TERMINATION FLAG - Skip if we have ANY cached data
  const shouldSkipAllProcessing = useReduxData && hasAnyReduxData;
  
  
  // ⚡ ULTRA-AGGRESSIVE STATE INITIALIZATION - Use cached data immediately, ignore SSR
  const [invoiceMonthsData] = useState(useReduxData ? reduxAzureData.monthsData : actualInitialMonthsData);
  const [summaryData, setSummaryData] = useState(useReduxData ? reduxAzureData.summaryData : actualInitialSummaryData);
  const [creditsData, setCreditsData] = useState(useReduxData ? reduxAzureData.creditsData : actualInitialCreditsData);
  const [trendsData, setTrendsData] = useState(useReduxData ? reduxAzureData.trendsData : actualInitialTrendsData);
  
  // 🚀 NEW: Dispatch initial data to Redux store to ensure cache is populated
  useEffect(() => {
    // Only run this on initial load when we have SSR data and no cache
    if (!useReduxData && mode === 'true-ssr' && initialData) {
      console.log('📦 Preparing to dispatch to Redux:', {
        hasInitialData: !!initialData,
        monthsResponse: !!initialData.monthsResponse,
        summaryResponse: !!initialData.summaryResponse,
        monthsData: !!initialData.monthsResponse?.data,
        summaryData: !!initialData.summaryResponse?.data,
      });
      
      const dataToDispatch = {
        monthsData: initialData.monthsResponse?.data,
        summaryData: initialData.summaryResponse?.data,
        creditsData: initialData.creditsResponse?.data,
        trendsData: initialData.trendsResponse?.data,
        userContext: userContext
      };
      
      console.log('📦 Data to dispatch:', {
        hasMonthsData: !!dataToDispatch.monthsData,
        hasSummaryData: !!dataToDispatch.summaryData,
        hasCreditsData: !!dataToDispatch.creditsData,
        hasTrendsData: !!dataToDispatch.trendsData,
        hasUserContext: !!dataToDispatch.userContext
      });
      
      dispatch(setInitialSSRData(dataToDispatch));
    }
  }, [useReduxData, mode, initialData, dispatch, userContext]);

  const [error] = useState(monthsError || summaryError || creditsError || trendsError);
  const [selectedMonth, setSelectedMonthLocal] = useState(() => {
    if (useReduxData && reduxSelectedMonth) {
      return reduxSelectedMonth;
    }
    const firstMonth = actualInitialMonthsData?.invoiceMonths?.[0] || actualInitialMonthsData?.[0];
    return firstMonth ? {
      label: firstMonth.text || firstMonth.label,
      value: firstMonth.value,
      date: firstMonth.date
    } : null;
  });
  const [monthDataLoading, setMonthDataLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // INSTANT LOADING STATE - No loading when using cache
  const [loading, setLoading] = useState(!isRehydrated); // Show loading until rehydrated
  const [dataPerformance, setDataPerformance] = useState(() => {
    const initialPerf = {
      ...ssrPerformance,
      componentInitTime: componentStartTime,
      dataLoadTime: useReduxData ? 5 : (ssrPerformance?.dataFetchTime || 0), // 5ms for cached data
      cacheStatus: useReduxData ? 'CLIENT_CACHED' : (isRehydrated ? 'SSR_PROCESSING' : 'REHYDRATING'), // Use expected cache status
      loadSource: useReduxData ? 'REDUX_INSTANT' : (isRehydrated ? 'SERVER_FRESH' : 'AWAITING_CACHE'),
      timestamp: new Date().toLocaleTimeString()
    };
    return initialPerf;
  });
  
  // Update loading state based on rehydration
  useEffect(() => {
    setLoading(!isRehydrated);
  }, [isRehydrated]);

  const [clientMonthsData, setClientMonthsData] = useState(null);
  
  // Chart and filter state
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [trendingChartType, setTrendingChartType] = useState('column');
  const [topExpensiveChartType, setTopExpensiveChartType] = useState('bar');
  const [productCategoryFilter, setProductCategoryFilter] = useState({ text: 'All', value: 'All' });
  const [productNameFilter, setProductNameFilter] = useState({ text: 'All', value: 'All' });
  const [skuNameFilter, setSkuNameFilter] = useState({ text: 'All', value: 'All' });
  
  // Processed data state - moved from render function to proper state management
  const [invoiceMonths, setInvoiceMonthsLocal] = useState(() => {
    // Initialize from Redux cache if available
    if (useReduxData && reduxInvoiceMonths?.length > 0) {
      return reduxInvoiceMonths;
    }
    return [];
  });
  // Initialize selectListOptions - process immediately if SSR data exists
  const initialSelectListOptions = (() => {
    
    // PRIORITY 1: Use cached data if available
    if (useReduxData && reduxSelectListOptions?.productCategory?.length > 1) {
      return reduxSelectListOptions;
    }
    
    // PRIORITY 2: Process SSR data - use actualInitialSummaryData (already extracted .data)
    if (actualInitialSummaryData?.selectLists && mode !== 'client-ssr') {
      
      // Simple inline processing to avoid function reference issues
      const lists = {
        productCategory: [{ text: 'All', value: 'All' }],
        productName: [{ text: 'All', value: 'All' }], 
        skuName: [{ text: 'All', value: 'All' }]
      };
      
      actualInitialSummaryData.selectLists.forEach((selectList, index) => {
        if (!selectList?.items || selectList.items.length === 0) return;
        
        const processedItems = selectList.items.map(item => ({
          text: item?.label || item?.text || item?.name || item?.value || String(item),
          value: item?.value || item?.label || item?.text || item?.name || String(item)
        }));
        
        const finalList = [{ text: 'All', value: 'All' }, ...processedItems];
        
        
        // Direct exact matching
        if (selectList.name === 'productcategory') {
          lists.productCategory = finalList;
        } else if (selectList.name === 'productname') {
          lists.productName = finalList;
        } else if (selectList.name === 'skuname') {
          lists.skuName = finalList;
        }
      });
      
      
      return lists;
    }
    
    return {
      productCategory: [{ text: 'All', value: 'All' }],
      productName: [{ text: 'All', value: 'All' }], 
      skuName: [{ text: 'All', value: 'All' }]
    };
  })();

  const [selectListOptions, setSelectListOptionsLocal] = useState(
    useReduxData && reduxSelectListOptions?.productCategory?.length > 1
      ? reduxSelectListOptions
      : initialSelectListOptions
  );
  
  // INSTANT STATE INITIALIZATION - Use cached data immediately
  const [processedChartData, setProcessedChartDataLocal] = useState(() => {
    if (useReduxData && reduxProcessedChartData?.invoiceBreakdownData?.length > 0) {
      return reduxProcessedChartData;
    }
    return {
      invoiceBreakdownData: [],
      monthlyTrendData: [],
      topExpensiveData: [],
      creditsApplied: 0
    };
  });
  
  // Helper function to update both local and Redux state
  const setProcessedChartData = (newData) => {
    setProcessedChartDataLocal(newData);
    dispatch(setProcessedChartDataRedux(newData));
  };
  
  const setSelectedMonth = (newMonth) => {
    setSelectedMonthLocal(newMonth);
    dispatch(setSelectedMonthRedux(newMonth));
  };
  
  const setInvoiceMonths = (newMonths) => {
    setInvoiceMonthsLocal(newMonths);
    dispatch(setInvoiceMonthsRedux(newMonths));
  };
  
  // Client-side mounting state for dynamic components
  const [chartsLoaded, setChartsLoaded] = useState(false);

  // ⚡ INSTANT CACHE INITIALIZATION - Set all state immediately if cache is available
  useEffect(() => {
    if (shouldSkipAllProcessing && useReduxData) {
      
      // Set invoice months from cache
      if (reduxInvoiceMonths?.length > 0 && invoiceMonths.length === 0) {
        setInvoiceMonths(reduxInvoiceMonths);
      }
      
      // Set selected month from cache
      if (reduxSelectedMonth && !selectedMonth) {
        setSelectedMonth(reduxSelectedMonth);
      }
      
      // Set select list options from cache
      if (reduxSelectListOptions?.productCategory?.length > 1) {
        setSelectListOptionsLocal(reduxSelectListOptions);
      }
      
      // Set processed chart data from cache
      if (reduxProcessedChartData?.invoiceBreakdownData?.length > 0) {
        setProcessedChartDataLocal(reduxProcessedChartData);
      }
      
      // Set raw data from cache for display (invoice total, etc.)
      if (reduxAzureData.summaryData) {
        setSummaryData(reduxAzureData.summaryData);
      }
      if (reduxAzureData.creditsData) {
        setCreditsData(reduxAzureData.creditsData);
      }
      if (reduxAzureData.trendsData) {
        setTrendsData(reduxAzureData.trendsData);
      }
      
      // Mark charts as loaded immediately for cached data
      if (reduxProcessedChartData?.invoiceBreakdownData?.length > 0) {
        setChartsLoaded(true);
      }
      
    }
  }, [shouldSkipAllProcessing, useReduxData]); // Run immediately when cache is detected

  // Track processedChartData changes for debugging
  useEffect(() => {
  }, [processedChartData]);

  // 🚨 PERFORMANCE ALERT - Show cache vs SSR decision prominently
  useEffect(() => {
    if (useReduxData) {
    } else {
    }
  }, [useReduxData]); // Run when cache decision is made

  // DEBUG LOGGING - Now that state is initialized

  // Initialize selectLists from server data on component mount
  useEffect(() => {
    
    // 🛑 IMMEDIATE CACHE CHECK - Skip if we have any cached data
    if (shouldSkipAllProcessing) {
      return;
    }
    
    // Skip this useEffect completely in true-ssr mode - let the TRUE-SSR useEffect handle everything
    if (mode === 'true-ssr') {
      return;
    }
    
    const summaryDataToProcess = initialSummaryData;
    
    if (mode !== 'client-ssr' && summaryDataToProcess?.selectLists) {
      
      try {
        // Call processSelectLists function directly
        const processedSelectLists = processSelectLists(summaryDataToProcess);
        
        setSelectListOptions(processedSelectLists);
        console.log('✅ SelectListOptions state updated - NO CLIENT API CALLS MADE!');
      } catch (error) {
        console.error('❌ Error processing server selectLists:', error);
      }
    } else {
    }
  }, []); // Run only once on mount

  // Track months state changes
  useEffect(() => {
  }, [invoiceMonths, selectedMonth]);

  // DEDICATED MONTHS PROCESSOR - SIMPLE AND DIRECT
  useEffect(() => {
    
    // 🛑 ULTIMATE CACHE CHECK - Skip if we have cached months data
    if (shouldSkipAllProcessing || (useReduxData && reduxInvoiceMonths?.length > 0)) {
      return;
    }
    
    
    // Try multiple possible data structures based on what we see in console
    if (mode === 'true-ssr') {
      
      let monthsArray = null;
      
      // Try different possible structures based on actual API response
      if (actualInitialMonthsData?.data?.invoiceMonths) {
        monthsArray = actualInitialMonthsData.data.invoiceMonths;
      } else if (initialData?.monthsResponse?.data?.invoiceMonths) {
        monthsArray = initialData.monthsResponse.data.invoiceMonths;
      } else if (actualInitialMonthsData?.invoiceMonths) {
        monthsArray = actualInitialMonthsData.invoiceMonths;
      } else if (initialData?.monthsResponse?.invoiceMonths) {
        monthsArray = initialData.monthsResponse.invoiceMonths;
      } else if (initialData?.monthsResponse) {
        monthsArray = initialData.monthsResponse;
      } else if (Array.isArray(actualInitialMonthsData)) {
        monthsArray = actualInitialMonthsData;
      }
      
      if (monthsArray && monthsArray.length > 0) {
        
        const months = monthsArray.map(month => ({
          text: month.text,
          value: month.value,
          date: month.date,
          __source: 'DEDICATED_PROCESSOR'
        }));
        
        setInvoiceMonths(months);
        setSelectedMonth(months[0]);
      } else {
      }
      
      // Aggressive verification - check state every 50ms for 1 second
      let checkCount = 0;
      const interval = setInterval(() => {
        checkCount++;
        
        if (checkCount >= 20) {
          clearInterval(interval);
        }
      }, 50);
    } else {
    }
  }, [mode, actualInitialMonthsData]); // Run when mode or monthsData changes

  // Ensure we're on the client side before rendering charts
  useEffect(() => {
    
    // Track performance
    const clientReadyTime = Date.now();
    const totalInitTime = clientReadyTime - componentStartTime;
    
    
    // Update performance data
    setDataPerformance(prev => ({
      ...prev,
      totalInitTime,
      clientReadyTime,
      performanceGain: useReduxData ? 'CACHE_HIT' : 'STANDARD_LOAD'
    }));
    
    // Always set isClient to true regardless of mode
    setIsClient(true);
    
    // Small delay to ensure dynamic components are loaded
    const timer = setTimeout(() => {
      setChartsLoaded(true);
    }, 100);
    
    // Expose cache clearing utility globally for logout handlers
    if (typeof window !== 'undefined') {
      window.clearAzureInvoiceCache = clearAzureInvoiceCache;
      
      // 🔧 DEBUG TOOLS - Expose cache inspection utilities
      window.debugCache = () => {
        
        try {
          const persistedState = localStorage.getItem('persist:ccr-azure-invoice');
        } catch (error) {
          console.error('🔧 LocalStorage error:', error);
        }
        
        return {
          useReduxData,
          dataSource,
          isCacheValid,
          componentStartTime
        };
      };
      
      window.forceReprocessCache = () => {
        if (actualInitialSummaryData) {
          const newSelectListOptions = processSelectLists(actualInitialSummaryData);
          setSelectListOptions(newSelectListOptions);
          dispatch(setSelectListOptionsRedux(newSelectListOptions));
        }
      };
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
    
    // Handle client-ssr mode with intelligent caching (DISABLED - using true-ssr instead)
    if (false && mode === 'client-ssr') {
      
      const loadDataWithCaching = async () => {
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
              setClientMonthsData(cachedData.monthsData || null);
              setSummaryData(cachedData.summaryData);
              setCreditsData(cachedData.creditsData);  
              setTrendsData(cachedData.trendsData);
              
              // Set invoice months and default selected month from cache
              if (cachedData.monthsData?.invoiceMonths && cachedData.monthsData.invoiceMonths.length > 0 && !selectedMonth) {
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
          localStorage.removeItem(cacheKey);
          localStorage.setItem(sessionKey, currentSessionId);
        }
        
        // Cache miss or expired - fetch fresh data
        console.log('📡 CACHE MISS - Fetching fresh data');
        setLoading(true);
        
        try {
          
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
            if (summaryResult.data.selectLists) {
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
          
          // Update state
      console.log('📊 Setting clientMonthsData:', monthsResult.data);
      console.log('📊 Setting creditsData:', creditsResult.data);
      console.log('📊 Setting trendsData:', trendsResult.data);
      
          setSummaryData(summaryResult.data || null);
          setCreditsData(creditsResult.data || null);
          setTrendsData(trendsResult.data || null);
          
          
          // Set default selected month from months API response
          if (monthsResult.data?.invoiceMonths && monthsResult.data.invoiceMonths.length > 0 && !selectedMonth) {
            setSelectedMonth(monthsResult.data.invoiceMonths[0]);
          }
          
          const perfData = {
            ...ssrPerformance,
            dataFetchTime: Date.now() - startTime,
            cacheStatus: 'FRESH_FETCH',
            timestamp: new Date().toLocaleTimeString()
          };
          setDataPerformance(perfData);
          
          
        } catch (error) {
          console.error('❌ Data fetch failed:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadDataWithCaching();
    }
    
    return () => clearTimeout(timer);
  }, [mode, ssrPerformance]);



  // Process API responses using useEffect to update state
  useEffect(() => {
    
    // 🛑 NUCLEAR CACHE CHECK - Absolutely no processing if cache exists
    if (shouldSkipAllProcessing) {
      return;
    }
    
    // Skip this useEffect completely in true-ssr mode - let the TRUE-SSR useEffect handle everything
    if (mode === 'true-ssr') {
      return;
    }
    
    // 🚨 DOUBLE-CHECK CACHE - Skip expensive processing if ANY cached data exists
    if (useReduxData) {
      return;
    }
    
    // Extra safety check
    if (processedChartData?.invoiceBreakdownData?.length > 0 && selectListOptions?.productCategory?.length > 1) {
      return;
    }
    
    
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
      newSelectListOptions = processSelectLists(summaryData);
      
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
    } else {
    }
    
    // Update all state at once
    
    
    setInvoiceMonths(finalInvoiceMonths);
    setSelectListOptions(newSelectListOptions);
    setProcessedChartData({
      invoiceBreakdownData,
      monthlyTrendData: trendingChartData,
      topExpensiveData,
      creditsApplied
    });
    
    
    // Add timeout to check state after React updates
    setTimeout(() => {
    }, 100);
    
    // Force a re-render check
    setTimeout(() => {
    }, 100);
  }, [clientMonthsData, initialMonthsData, invoiceMonthsData, summaryData, creditsData, trendsData, mode]);

  // Set default selected month when invoice months are available
  useEffect(() => {
    if (invoiceMonths && invoiceMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(invoiceMonths[0]);
    }
  }, [invoiceMonths]);

  // Set default filter values when selectLists are available
  useEffect(() => {
    if (selectListOptions.productCategory?.length > 1 && 
        (!productCategoryFilter || productCategoryFilter.value !== 'All')) {
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


  
  // Month changes now use server actions - no client-side API calls needed!

  // NO useEffect for initial data fetching - data is already here!
  // Only handle month selection changes
  
  const handleMonthChange = async (event) => {
    const newMonth = event.target.value;
    
    setSelectedMonth(newMonth);
    setMonthDataLoading(true);
    
    try {
      
      // Check Redux cache first for this specific month
      const monthValue = newMonth?.value || newMonth;
      const cachedMonthData = monthDataCache[monthValue];
      const monthCacheAge = cachedMonthData ? Date.now() - cachedMonthData.timestamp : null;
      const isMonthCacheValid = cachedMonthData && monthCacheAge < (15 * 60 * 1000); // 15 minutes
      
      let summary, credits, trend;
      
      if (isMonthCacheValid) {
        summary = cachedMonthData.summaryData;
        credits = cachedMonthData.creditsData;
        trend = cachedMonthData.trendsData;
        
        // Update current data state
        setSummaryData(summary);
        setCreditsData(credits);
        setTrendsData(trend);
      } else {
        
        // Use server action to fetch fresh data
        const result = await fetchAzureInvoiceDataForMonth(userContext?.soldToId, newMonth);
        
        console.log('🔍 Client: Server action result:', result);
        
        if (result.error) {
          console.error('❌ Server action returned error:', result.error);
          throw new Error(result.error);
        }
        
        const resultData = result.data;
        summary = resultData.summary;
        credits = resultData.credits;
        trend = resultData.trend;
        
        // Update current data state
        setSummaryData(summary);
        setCreditsData(credits);
        setTrendsData(trend);
        
        // Cache the new month data in Redux
        dispatch(setMonthData({
          monthValue,
          summaryData: summary,
          creditsData: credits,
          trendsData: trend
        }));
        
      }
      

      // Log the actual response data received from server action

      if (!summary || !credits || !trend) {
        throw new Error('One or more server responses failed for month data');
      }
      
      // Process the new data and update charts immediately
      const invoiceBreakdownData = summary ? processInvoiceBreakdownData(summary) : [];
      
      const monthlyTrendData = trend ? processTrendingData(trend) : [];
      
      const topExpensiveData = summary ? processTopExpensiveProducts(summary) : [];
      
      const creditsApplied = credits?.creditsApplied || credits?.totalSpend || 0;

      console.log('📊 Processing month change data:', {
        invoiceBreakdownData: invoiceBreakdownData.length,
        monthlyTrendData: monthlyTrendData.length, 
        topExpensiveData: topExpensiveData.length,
        creditsApplied
      });      // Update all chart data immediately
      const newChartData = {
        invoiceBreakdownData,
        monthlyTrendData,
        topExpensiveData,
        creditsApplied
      };
      setProcessedChartData(newChartData);

      // Update filter options if available
      if (summary?.selectLists) {
        const newSelectListOptions = {
          productCategory: [{ text: 'All', value: 'All' }],
          productName: [{ text: 'All', value: 'All' }],
          skuName: [{ text: 'All', value: 'All' }]
        };
        
        summary.selectLists.forEach(list => {
          if (list.name === 'productcategory') {
            newSelectListOptions.productCategory = [
              { text: 'All', value: 'All' },
              ...list.items.map(item => ({ text: item.label, value: item.value }))
            ];
          }
          if (list.name === 'productname') {
            newSelectListOptions.productName = [
              { text: 'All', value: 'All' },
              ...list.items.map(item => ({ text: item.label, value: item.value }))
            ];
          }
          if (list.name === 'skuname') {
            newSelectListOptions.skuName = [
              { text: 'All', value: 'All' },
              ...list.items.map(item => ({ text: item.label, value: item.value }))
            ];
          }
        });
        
        setSelectListOptions(newSelectListOptions);
      }
      
      
      setMonthDataLoading(false);
    } catch (error) {
      console.error('❌ Client: Server action month data fetch error:', error);
      setMonthDataLoading(false);
    }
  };

  // Data processing functions for mapping API responses to UI components
  const processInvoiceBreakdownData = (summaryData) => {
    
    if (!summaryData) {
      return [];
    }
    
    // Handle both possible data structures:
    // 1. summaryData.spendPeriod.spend (nested)
    // 2. summaryData.spend (direct)
    let spendArray = null;
    
    if (summaryData.spendPeriod && summaryData.spendPeriod.spend) {
      spendArray = summaryData.spendPeriod.spend;
    } else if (summaryData.spend && Array.isArray(summaryData.spend)) {
      spendArray = summaryData.spend;
    } else {
    }
    
    if (!spendArray || !Array.isArray(spendArray)) {
      return [];
    }
    
    const chartData = spendArray.map(item => ({
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
    
    const defaultLists = {
      productCategory: [{ text: 'All', value: 'All' }],
      productName: [{ text: 'All', value: 'All' }],
      skuName: [{ text: 'All', value: 'All' }]
    };

    if (!summaryData || !summaryData.selectLists) {
      return defaultLists;
    }

    
    // Log all selectList names for debugging
    const selectListNames = summaryData.selectLists.map(list => list?.name);
    
    // Log full structure of first few selectLists
    summaryData.selectLists.slice(0, 3).forEach((list, index) => {
    });

    const lists = { ...defaultLists };
    
    summaryData.selectLists.forEach((selectList, index) => {
      // Declare variables at function scope so they're accessible throughout
      let listName = '';
      let items = [];
      
      try {
        if (!selectList || typeof selectList !== 'object') {
          console.warn(`⚠️ Invalid selectList at index ${index}:`, selectList);
          return;
        }
        
        listName = selectList.name?.toLowerCase() || '';
        items = selectList.items || [];
        
        // Debug: log the first few items to see their structure
        if (Array.isArray(items) && items.length > 0) {
        }
        
        // Process items into proper format first
        const processedItems = Array.isArray(items) ? items.map(item => {
          if (!item) return null;
          return { 
            text: typeof item === 'string' ? item : (item?.label || item?.text || item?.name || item?.value || JSON.stringify(item)), 
            value: typeof item === 'string' ? item : (item?.value || item?.label || item?.text || item?.name || JSON.stringify(item))
          };
        }).filter(Boolean) : [];
        
        
        // Direct name-based assignment - exact match first, then flexible
        if (processedItems.length > 0) {
          const finalList = [{ text: 'All', value: 'All' }, ...processedItems];
          
          // Direct exact matches for known API names
          if (selectList.name === 'productcategory') {
            lists.productCategory = finalList;
          }
          else if (selectList.name === 'productname') {
            lists.productName = finalList;
          }
          else if (selectList.name === 'skuname') {
            lists.skuName = finalList;
          }
          // Fallback flexible matching
          else if (listName.includes('category') && lists.productCategory.length === 1) {
            lists.productCategory = finalList;
          }
          else if ((listName.includes('product') || listName.includes('name')) && lists.productName.length === 1) {
            lists.productName = finalList;
          }
          else if (listName.includes('sku') && lists.skuName.length === 1) {
            lists.skuName = finalList;
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing selectList "${listName}":`, error);
        console.error('❌ Items that caused error:', items);
      }
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

  // Cache SSR data to Redux for fast subsequent loads
  useEffect(() => {
    if (mode === 'true-ssr' && !useReduxData && userContext?.soldToId) {
      
      // Validate session and cache data
      dispatch(validateSession({ soldToId: userContext.soldToId }));
      
      // Cache the initial SSR data
      dispatch(setInitialSSRData({
        monthsData: actualInitialMonthsData,
        summaryData: actualInitialSummaryData,
        creditsData: actualInitialCreditsData,
        trendsData: actualInitialTrendsData,
        userContext
      }));
      
      
      // Also cache processed data to avoid reprocessing on refresh
      setTimeout(() => {
        
        // Cache processed chart data if available
        if (processedChartData?.invoiceBreakdownData?.length > 0) {
          dispatch(setProcessedChartDataRedux(processedChartData));
        }
        
        // Cache select list options if available  
        if (selectListOptions?.productCategory?.length > 1) {
          dispatch(setSelectListOptionsRedux(selectListOptions));
        }
        
        // Cache invoice months if available
        if (invoiceMonths?.length > 0) {
          dispatch(setInvoiceMonthsRedux(invoiceMonths));
        }
        
        // Cache selected month if available
        if (selectedMonth) {
          dispatch(setSelectedMonthRedux(selectedMonth));
        }
        
      }, 100); // Small delay to ensure state is updated
      
    } else if (useReduxData) {
    }
  }, [mode, useReduxData, userContext?.soldToId, processedChartData, selectListOptions, invoiceMonths, selectedMonth]);
  
  // Process server data on mount or mode change
  useEffect(() => {
    if (mode === 'true-ssr' || !useReduxData) {
      // Skip if cache is available
      if (shouldSkipAllProcessing) {
        return;
      }
      
      try {
        // Process all data from server
        const invoiceBreakdownData = actualInitialSummaryData ? processInvoiceBreakdownData(actualInitialSummaryData) : [];
        const monthlyTrendData = actualInitialTrendsData ? processTrendingData(actualInitialTrendsData) : [];
        const topExpensiveData = actualInitialSummaryData ? processTopExpensiveProducts(actualInitialSummaryData) : [];
        const creditsApplied = actualInitialCreditsData?.totalSpend || 0;
        
        const monthsSource = actualInitialMonthsData?.invoiceMonths || actualInitialMonthsData;
        const processedMonths = processInvoiceMonths(monthsSource) || [];
        
        const processedSelectLists = processSelectLists(actualInitialSummaryData);
        
        // Update all state at once
        setProcessedChartData({
          invoiceBreakdownData,
          monthlyTrendData,
          topExpensiveData,
          creditsApplied
        });
        
        setInvoiceMonths(processedMonths);
        
        setSelectListOptions(processedSelectLists);
        
        // Set default selected month
        if (processedMonths.length > 0) {
          setSelectedMonth(processedMonths[0]);
        }
        
      } catch (error) {
        console.error('❌ Error processing server data:', error);
      }
    }
  }, [mode, shouldSkipAllProcessing, useReduxData, actualInitialSummaryData, actualInitialTrendsData, actualInitialCreditsData, actualInitialMonthsData, dispatch]);

  // Separate useEffect to verify processedChartData state updates
  useEffect(() => {
  }, [processedChartData]);

  // Track invoiceMonths state updates
  useEffect(() => {
  }, [invoiceMonths]);

  // Helper function to update both local and Redux state
  const setSelectListOptions = (newOptions) => {
    setSelectListOptionsLocal(newOptions);
    dispatch(setSelectListOptionsRedux(newOptions));
  };

  // If the store is not rehydrated yet, show a loading indicator.
  // This prevents the component from rendering with incomplete data.
  if (!isRehydrated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚙️</div>
        <div>Loading cached data...</div>
        <small>(This should be instant on subsequent visits)</small>
      </div>
    );
  }

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
      {/* Enhanced Cache Performance Indicator */}
      <CachePerformanceIndicator 
        dataSource={dataSource}
        cacheAge={cacheAge}
        loadTime={dataPerformance?.dataFetchTime}
        isCacheValid={isCacheValid}
        cacheMetadata={cacheMetadata}
      />
      
      {/* Legacy Caching Performance Indicator (keeping for reference) */}
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
            Total Time: {dataPerformance.totalSSRTime}ms

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
                  const selected = selectListOptions.productCategory.find(item => item.value === e.target.value);
                  setProductCategoryFilter(selected);
                }}
                style={{ width: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {(() => {
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
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>Invoice Total</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
            ${(() => {
              const summaryValue = summaryData?.spendPeriod?.totalSpend?.toFixed(2);
              const creditsValue = creditsData?.totalSpend?.toFixed(2);
              console.log('💰 INVOICE TOTAL DEBUG:', {
                summaryData_spendPeriod_totalSpend: summaryData?.spendPeriod?.totalSpend,
                summaryValue,
                creditsValue,
                result: summaryValue || creditsValue || '0.00'
              });
              return summaryValue || creditsValue || '0.00';
            })()}
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

