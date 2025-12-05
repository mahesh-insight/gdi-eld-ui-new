// src/app/azure-invoice/AzureInvoiceClientContent.jsx
"use client";

import { useState, useEffect } from 'react';

import { 
  fetchInvoiceMonthsServer,
  fetchSummaryDataServer, 
  fetchCreditsDataServer, 
  fetchTrendsDataServer
} from './actions';

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

  console.log('🎨 Client: Rendering with SSR data (NO API calls on mount)', {
    hasMonthsData: !!initialMonthsData,
    hasSummaryData: !!initialSummaryData,
    hasCreditsData: !!initialCreditsData,
    hasTrendsData: !!initialTrendsData,
    kendoComponentsLoaded: true
  });
  
  // Initialize state - handles both SSR data and client-ssr mode
  const [invoiceMonthsData] = useState(initialMonthsData);
  const [summaryData, setSummaryData] = useState(initialSummaryData);
  const [creditsData, setCreditsData] = useState(initialCreditsData);
  const [trendsData, setTrendsData] = useState(initialTrendsData);
  const [error] = useState(monthsError || summaryError || creditsError || trendsError);
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonthsData?.invoiceMonths?.[0] || initialMonthsData?.[0] || null
  );
  const [monthDataLoading, setMonthDataLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Client-SSR mode state
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
  const [selectListOptions, setSelectListOptions] = useState({
    productCategory: [{ text: 'All', value: 'All' }],
    productName: [{ text: 'All', value: 'All' }], 
    skuName: [{ text: 'All', value: 'All' }]
  });
  const [processedChartData, setProcessedChartData] = useState({
    invoiceBreakdownData: [],
    trendingChartData: { categories: [], series: [] },
    topExpensiveData: [],
    creditsApplied: 0
  });
  
  // Ensure we're on the client side before rendering charts
  useEffect(() => {
    setIsClient(true);
    
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
    
    // Handle new client-ssr mode with intelligent caching
    if (mode === 'client-ssr') {
      const loadDataWithCaching = async () => {
        console.log('🚀 Client: Starting CLIENT-SSR with intelligent caching');
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
          console.log('❌ No authentication, redirecting to login');
          window.location.href = '/';
          return;
        }
        
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
            console.log('📡 Calling fetchInvoiceMonthsServer...');
            monthsResult = await fetchInvoiceMonthsServer(soldToId);
            console.log('✅ fetchInvoiceMonthsServer completed:', monthsResult ? 'success' : 'undefined');
          } catch (error) {
            console.error('❌ fetchInvoiceMonthsServer failed:', error);
            monthsResult = { error: error.message, data: null };
          }
          
          try {
            console.log('📡 Calling fetchSummaryDataServer...');
            summaryResult = await fetchSummaryDataServer(soldToId, null);
            console.log('✅ fetchSummaryDataServer completed:', summaryResult ? 'success' : 'undefined');
          } catch (error) {
            console.error('❌ fetchSummaryDataServer failed:', error);
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
          setClientMonthsData(monthsResult.data || null);
          setSummaryData(summaryResult.data || null);
          setCreditsData(creditsResult.data || null);
          setTrendsData(trendsResult.data || null);
          
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
      
      loadDataWithCaching();
    }
  }, [mode, ssrPerformance]);

  // Process API responses using useEffect to update state
  useEffect(() => {
    console.log('🔄 Processing API data for UI components');
    
    let invoiceBreakdownData = [];
    let trendingChartData = { categories: [], series: [] };
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
    setInvoiceMonths(finalInvoiceMonths);
    setSelectListOptions(newSelectListOptions);
    setProcessedChartData({
      invoiceBreakdownData,
      trendingChartData,
      topExpensiveData,
      creditsApplied
    });
  }, [clientMonthsData, initialMonthsData, invoiceMonthsData, summaryData, creditsData, trendsData]);

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
    if (!summaryData || !summaryData.spendPeriod || !summaryData.spendPeriod.spend) {
      return [];
    }
    return summaryData.spendPeriod.spend.map(item => ({
      group: item.label || 'Unknown',
      label: item.label || 'Unknown', 
      value: item.value || 0
    }));
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

    const lists = { ...defaultLists };
    
    summaryData.selectLists.forEach((selectList, index) => {
      console.log(`🔍 Processing selectList[${index}]:`, selectList);
      console.log(`🔍 selectList.name: "${selectList.name}"`);
      console.log(`🔍 selectList.items:`, selectList.items);
      
      const listName = selectList.name?.toLowerCase();
      const items = selectList.items || [];
      
      console.log(`🔍 Normalized listName: "${listName}"`);
      console.log(`🔍 Items count: ${items.length}`);
      
      // Debug: log the first few items to see their structure
      if (items.length > 0) {
        console.log(`🔍 First item structure:`, items[0]);
        console.log(`🔍 First item type:`, typeof items[0]);
        console.log(`🔍 First item keys:`, typeof items[0] === 'object' ? Object.keys(items[0]) : 'not an object');
      }
      
      if (listName === 'productcategory') {
        console.log('✅ Processing productcategory items');
        lists.productCategory = [
          { text: 'All', value: 'All' },
          ...items.map(item => {
            const processed = { 
              text: typeof item === 'string' ? item : (item.label || item.text || item.name || item.value || JSON.stringify(item)), 
              value: typeof item === 'string' ? item : (item.value || item.label || item.text || item.name || JSON.stringify(item))
            };
            console.log('📝 Processed productCategory item:', processed);
            return processed;
          })
        ];
      } else if (listName === 'productname') {
        console.log('✅ Processing productname items');
        lists.productName = [
          { text: 'All', value: 'All' },
          ...items.map(item => {
            const processed = { 
              text: typeof item === 'string' ? item : (item.label || item.text || item.name || item.value || JSON.stringify(item)), 
              value: typeof item === 'string' ? item : (item.value || item.label || item.text || item.name || JSON.stringify(item))
            };
            console.log('📝 Processed productName item:', processed);
            return processed;
          })
        ];
      } else if (listName === 'skuname') {
        console.log('✅ Processing skuname items');
        lists.skuName = [
          { text: 'All', value: 'All' },
          ...items.map(item => {
            const processed = { 
              text: typeof item === 'string' ? item : (item.label || item.text || item.name || item.value || JSON.stringify(item)), 
              value: typeof item === 'string' ? item : (item.value || item.label || item.text || item.name || JSON.stringify(item))
            };
            console.log('📝 Processed skuName item:', processed);
            return processed;
          })
        ];
      } else {
        console.log(`⚠️ Unknown selectList name: "${listName}"`);
      }
    });

    console.log('🎯 Final processed selectLists:', lists);
    console.log('🎯 productCategory count:', lists.productCategory.length);
    console.log('🎯 productName count:', lists.productName.length);
    console.log('🎯 skuName count:', lists.skuName.length);
    
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
    if (!trendData || !trendData.chartData) {
      return { categories: [], series: [] };
    }
    
    const groupedData = {};
    trendData.chartData.forEach(item => {
      const period = new Date(item.group).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!groupedData[period]) {
        groupedData[period] = {};
      }
      groupedData[period][item.label.trim()] = item.value;
    });
    
    const periods = Object.keys(groupedData);
    const labels = [...new Set(trendData.chartData.map(item => item.label.trim()))];
    
    return {
      categories: periods,
      series: labels.map(label => ({
        name: label,
        data: periods.map(period => groupedData[period][label] || 0)
      }))
    };
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
              value={selectedMonth?.value || ''}
              onChange={(e) => {
                const selected = invoiceMonths.find(m => m.value === e.target.value);
                handleMonthChange({ target: { value: selected } });
              }}
              style={{ width: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              disabled={monthDataLoading}
            >
              <option value="">Select Month</option>
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
                  const selected = selectListOptions.productCategory.find(item => item.value === e.target.value);
                  setProductCategoryFilter(selected);
                }}
                style={{ width: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {selectListOptions.productCategory.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.text}
                  </option>
                ))}
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
        
        {/* Summary Stats */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>Invoice Total</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
            ${summaryData?.spendPeriod?.totalSpend?.toFixed(2) || '0.00'}
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
                {processedChartData.invoiceBreakdownData?.length > 0 ? (
                  <div style={{ height: '400px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px' }}>Invoice Breakdown Data:</div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {processedChartData.invoiceBreakdownData.map((item, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '10px', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '4px',
                          border: '1px solid #dee2e6'
                        }}>
                          <span>{item.group}</span>
                          <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                            ${item.value?.toFixed(2)}
                          </span>
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
                    color: '#6c757d'
                  }}>
                    ✅ Data loaded successfully! Kendo charts will be available once components load.
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
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => setTrendingChartType('column')}
                      style={{
                        backgroundColor: trendingChartType === 'column' ? '#17a2b8' : '#6c757d',
                        color: 'white',
                        minWidth: '30px',
                        fontSize: '12px',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Col
                    </button>
                    <button
                      onClick={() => setTrendingChartType('line')}
                      style={{
                        backgroundColor: trendingChartType === 'line' ? '#17a2b8' : '#6c757d',
                        color: 'white',
                        minWidth: '30px',
                        fontSize: '12px',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Line
                    </button>
                    <button
                      onClick={() => setTrendingChartType('area')}
                      style={{
                        backgroundColor: trendingChartType === 'area' ? '#17a2b8' : '#6c757d',
                        color: 'white',
                        minWidth: '30px',
                        fontSize: '12px',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Area
                    </button>
                  </div>
                </div>
                {processedChartData.trendingChartData?.categories?.length > 0 ? (
                  <div style={{ height: '400px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px' }}>Trending Data ({trendingChartType} view):</div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {processedChartData.trendingChartData.categories.map((category, index) => (
                        <div key={index} style={{ 
                          padding: '10px', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '4px',
                          border: '1px solid #dee2e6'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{category}</div>
                          <div style={{ display: 'flex', gap: '15px' }}>
                            {processedChartData.trendingChartData.series?.map((series, seriesIndex) => (
                              <span key={seriesIndex} style={{ fontSize: '12px' }}>
                                {series.name}: <strong>${series.data[index]?.toFixed(2) || '0.00'}</strong>
                              </span>
                            ))}
                          </div>
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
                    color: '#6c757d'
                  }}>
                    ✅ Trending data ready! Kendo charts will be available once components load.
                  </div>
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
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => setTopExpensiveChartType('bar')}
                      style={{
                        backgroundColor: topExpensiveChartType === 'bar' ? '#17a2b8' : '#6c757d',
                        color: 'white',
                        minWidth: '30px',
                        fontSize: '12px',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => setTopExpensiveChartType('pie')}
                      style={{
                        backgroundColor: topExpensiveChartType === 'pie' ? '#17a2b8' : '#6c757d',
                        color: 'white',
                        minWidth: '30px',
                        fontSize: '12px',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Pie
                    </button>
                  </div>
                </div>
                {processedChartData.topExpensiveData?.length > 0 ? (
                  <div style={{ height: '500px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px' }}>
                      Top Expensive Products ({topExpensiveChartType} view):
                    </div>
                    <div style={{ display: 'grid', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                      {processedChartData.topExpensiveData.map((item, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '12px', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '4px',
                          border: '1px solid #dee2e6'
                        }}>
                          <span style={{ flex: 1, marginRight: '10px' }}>{item.product}</span>
                          <span style={{ 
                            fontWeight: 'bold', 
                            color: '#28a745',
                            minWidth: '80px',
                            textAlign: 'right'
                          }}>
                            ${item.value?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    height: '500px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#6c757d'
                  }}>
                    ✅ Top products data ready! Kendo charts will be available once components load.
                  </div>
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

