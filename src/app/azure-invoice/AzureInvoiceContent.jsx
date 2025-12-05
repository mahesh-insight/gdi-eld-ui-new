// src/app/azure-invoice/AzureInvoiceContent.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues with Kendo Charts - with error handling
const DropDownList = dynamic(() => 
  import('@progress/kendo-react-dropdowns')
    .then(mod => ({ default: mod.DropDownList }))
    .catch(err => {
      console.error('❌ Error loading DropDownList:', err);
      return { default: () => <select /> }; // Fallback
    }), 
  { ssr: false }
);
const Button = dynamic(() => 
  import('@progress/kendo-react-buttons')
    .then(mod => ({ default: mod.Button }))
    .catch(err => {
      console.error('❌ Error loading Button:', err);
      return { default: (props) => <button {...props} /> }; // Fallback
    }), 
  { ssr: false }
);

// Dynamic Chart imports - with error handling
const Chart = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.Chart }))
    .catch(err => {
      console.error('❌ Error loading Chart:', err);
      return { default: () => <div>Chart unavailable</div> };
    }), 
  { ssr: false }
);
const ChartSeries = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.ChartSeries }))
    .catch(err => {
      console.error('❌ Error loading ChartSeries:', err);
      return { default: ({ children }) => <>{children}</> };
    }), 
  { ssr: false }
);
const ChartSeriesItem = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.ChartSeriesItem }))
    .catch(err => {
      console.error('❌ Error loading ChartSeriesItem:', err);
      return { default: () => null };
    }), 
  { ssr: false }
);
const ChartCategoryAxis = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.ChartCategoryAxis }))
    .catch(err => {
      console.error('❌ Error loading ChartCategoryAxis:', err);
      return { default: ({ children }) => <>{children}</> };
    }), 
  { ssr: false }
);
const ChartCategoryAxisItem = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.ChartCategoryAxisItem }))
    .catch(err => {
      console.error('❌ Error loading ChartCategoryAxisItem:', err);
      return { default: () => null };
    }), 
  { ssr: false }
);
const ChartValueAxis = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.ChartValueAxis }))
    .catch(err => {
      console.error('❌ Error loading ChartValueAxis:', err);
      return { default: ({ children }) => <>{children}</> };
    }), 
  { ssr: false }
);
const ChartValueAxisItem = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.ChartValueAxisItem }))
    .catch(err => {
      console.error('❌ Error loading ChartValueAxisItem:', err);
      return { default: () => null };
    }), 
  { ssr: false }
);
const ChartTooltip = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.ChartTooltip }))
    .catch(err => {
      console.error('❌ Error loading ChartTooltip:', err);
      return { default: () => null };
    }), 
  { ssr: false }
);
const ChartLegend = dynamic(() => 
  import('@progress/kendo-react-charts')
    .then(mod => ({ default: mod.ChartLegend }))
    .catch(err => {
      console.error('❌ Error loading ChartLegend:', err);
      return { default: () => null };
    }), 
  { ssr: false }
);
// Import proper auth hook
import { useAuth } from '../../hooks/useAuth';
import { syncAuthToCookies, checkCookieSync } from '../../lib/auth/cookieSync';
import { 
  fetchInvoiceMonthsServer, 
  fetchSummaryDataServer, 
  fetchCreditsDataServer, 
  fetchTrendsDataServer
} from './actions';

// Global flag to prevent multiple simultaneous calls across component re-renders
let globalFetchInProgress = false;
// Track if we've already successfully fetched data for this session
let dataFetchCompleted = false;
// Track number of useEffect executions for debugging
let useEffectCallCount = 0;
// Track total API calls made
let totalApiCalls = 0;
// Singleton pattern - ensure only one instance can fetch data
let instanceFetchingData = null;
const INSTANCE_ID = Math.random().toString(36).substr(2, 9);
// React Strict Mode safe deduplication - module-level state
let componentMountCount = 0;
let strictModeProtectionActive = false;

// Client component that fetches data once and displays it
export default function AzureInvoiceContent() {
  const [invoiceMonthsData, setInvoiceMonthsData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [creditsData, setCreditsData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true); // Start with loading state
  const [error, setError] = useState(null);
  const [fetchInitiated, setFetchInitiated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthDataLoading, setMonthDataLoading] = useState(false);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productNameFilter, setProductNameFilter] = useState('All');
  const [skuNameFilter, setSkuNameFilter] = useState('All');
  const { isAuthenticated, user, accessToken, isLoading } = useAuth();
  
  const [isClient, setIsClient] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial load to prevent duplicate API calls
  const apiCallsInProgress = useRef(false); // Use ref to prevent duplicate API calls across renders
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, resetting global flags');
      globalFetchInProgress = false;
      dataFetchCompleted = false;
      useEffectCallCount = 0;
      totalApiCalls = 0;
      if (instanceFetchingData === INSTANCE_ID) {
        instanceFetchingData = null;
      }
      // Reset module-level state for fresh component instances
      componentMountCount = Math.max(0, componentMountCount - 1);
      if (componentMountCount === 0) {
        strictModeProtectionActive = false;
      }
    };
  }, []);
  
  useEffect(() => {
    setIsClient(true);
    console.log('🔍 AzureInvoiceContent: Component mounted, auth state:', { 
      isAuthenticated, 
      user: !!user, 
      accessToken: !!accessToken, 
      isLoading 
    });
    
    // Set loading to false only after authentication is ready
    if (isAuthenticated && user) {
      // Keep loading true, will be set to false when data arrives
    } else {
      setLoading(false); // No auth, no need to load
    }
  }, [isAuthenticated, user]);

  // Monitor loading state changes
  useEffect(() => {
    console.log('🔄 AzureInvoiceContent: Loading state changed:', {
      loading,
      hasMonthsData: !!invoiceMonthsData,
      hasSummaryData: !!summaryData,
      hasCreditsData: !!creditsData,
      hasTrendsData: !!trendsData,
      hasError: !!error,
      isClient,
      fetchInitiated
    });
  }, [loading, invoiceMonthsData, summaryData, creditsData, trendsData, error, isClient, fetchInitiated]);

  // Auto-sync cookies whenever auth state changes
  useEffect(() => {
    if (isClient && isAuthenticated && user && accessToken) {
      const authState = { isAuthenticated, user, accessToken };
      if (!checkCookieSync(authState)) {
        console.log('🔄 Auto-syncing auth cookies due to state change...');
        syncAuthToCookies(authState);
      }
    }
  }, [isClient, isAuthenticated, user, accessToken]);

  useEffect(() => {
    useEffectCallCount++;
    console.log(`🔍 Client: useEffect triggered (#${useEffectCallCount})`, { 
      isAuthenticated, 
      hasUser: !!user, 
      userSoldToId: user?.soldToId,
      fetchInitiated, 
      hasMonthsData: !!invoiceMonthsData,
      hasSummaryData: !!summaryData,
      hasCreditsData: !!creditsData,
      hasTrendsData: !!trendsData,
      hasError: !!error,
      isClient,
      globalFetchInProgress,
      totalApiCalls
    });
    
    // Only fetch data ONCE: if authenticated, have user data, and haven't initiated fetch yet
    console.log('🔍 DEBUG - Fetch condition check:', {
      isClient,
      isAuthenticated,
      hasUser: !!user,
      fetchInitiated,
      hasMonthsData: !!invoiceMonthsData,
      hasSummaryData: !!summaryData,
      hasCreditsData: !!creditsData,
      hasTrendsData: !!trendsData,
      hasError: !!error,
      globalFetchInProgress,
      dataFetchCompleted,
      shouldFetch: isClient && isAuthenticated && user?.soldToId && !fetchInitiated && !invoiceMonthsData && !error && !globalFetchInProgress && !dataFetchCompleted
    });
    
    if (isClient && isAuthenticated && user?.soldToId && !fetchInitiated && !invoiceMonthsData && !error && !globalFetchInProgress && !dataFetchCompleted && !apiCallsInProgress.current) {
      // React Strict Mode protection - detect double mounting
      componentMountCount++;
      console.log(`🔍 Component mount count: ${componentMountCount}`);
      
      if (componentMountCount > 1 && !dataFetchCompleted) {
        console.log('⏭️ Skipping fetch - React Strict Mode double mount detected');
        strictModeProtectionActive = true;
        return;
      }
      
      // Singleton check - if another instance is already fetching, skip
      if (instanceFetchingData && instanceFetchingData !== INSTANCE_ID) {
        console.log(`⏭️ Skipping fetch - another instance (${instanceFetchingData}) is already fetching data`);
        return;
      }
      
      instanceFetchingData = INSTANCE_ID;
      const callId = Date.now();
      console.log(`🚀 Client: Starting authenticated data fetch (INSTANCE: ${INSTANCE_ID}, CALL ID: ${callId})`);
      console.log('🔍 DEBUG - User data before fetch:', { 
        user, 
        soldToId: user?.soldToId, 
        callId, 
        hasUser: !!user,
        userKeys: user ? Object.keys(user) : 'no user'
      });
      
      // Ensure authentication cookies are synced before server actions
      const authState = { isAuthenticated, user, accessToken };
      if (!checkCookieSync(authState)) {
        console.log('🔄 Syncing auth cookies before API calls...');
        syncAuthToCookies(authState);
      }
      
      setFetchInitiated(true); // Prevent any further calls
      globalFetchInProgress = true; // Prevent calls from other instances
      apiCallsInProgress.current = true; // Prevent calls using ref
      setIsInitialLoad(true); // Ensure we're in initial load state

      totalApiCalls += 4; // Track 4 initial API calls
      console.log(`📊 Total API calls made so far: ${totalApiCalls}`);
      
      Promise.all([
        fetchInvoiceMonthsServer(user?.soldToId),
        fetchSummaryDataServer(user?.soldToId, null), // Don't pass selectedMonth on initial load
        fetchCreditsDataServer(user?.soldToId, null),  // Don't pass selectedMonth on initial load
        fetchTrendsDataServer(user?.soldToId, null)    // Don't pass selectedMonth on initial load
      ]).then(([monthsResponse, summaryResponse, creditsResponse, trendsResponse]) => {
        console.log('✅ Client: All API data received successfully');
        
        // Defensive programming: ensure responses are objects
        const safeMonthsResponse = monthsResponse || {};
        const safeSummaryResponse = summaryResponse || {};
        const safeCreditsResponse = creditsResponse || {};
        const safeTrendsResponse = trendsResponse || {};
        
        console.log('🔍 DEBUG - Invoice Months response:', safeMonthsResponse);
        console.log('🔍 DEBUG - Summary response:', safeSummaryResponse);
        console.log('🔍 DEBUG - Credits response:', safeCreditsResponse);
        console.log('🔍 DEBUG - Trends response:', safeTrendsResponse);
        
        // Handle server action response structure with safe access
        const monthsData = safeMonthsResponse.data;
        const summaryApiData = safeSummaryResponse.data;
        const creditsApiData = safeCreditsResponse.data;
        const trendsApiData = safeTrendsResponse.data;
        
        const monthsError = safeMonthsResponse.error;
        const summaryError = safeSummaryResponse.error;
        const creditsError = safeCreditsResponse.error;
        const trendsError = safeTrendsResponse.error;
        
        console.log('Months Data:', !!monthsData);
        console.log('Summary Data:', !!summaryApiData);
        console.log('Credits Data:', !!creditsApiData);
        console.log('Trends Data:', !!trendsApiData);
        
        console.log('🔄 Client: Updating component state...');
        
        // Handle server action error responses
        if (monthsError) {
          console.error('❌ Server returned error for months data:', monthsError);
          setError(monthsError);
          setLoading(false);
          globalFetchInProgress = false;
          return;
        }
        
        if (summaryError) console.error('❌ Summary API error:', summaryError);
        if (creditsError) console.error('❌ Credits API error:', creditsError);
        if (trendsError) console.error('❌ Trends API error:', trendsError);
        
        // Set data for each API
        console.log('🎯 Setting invoice months data:', !!monthsData);
        console.log('🎯 Setting summary data:', !!summaryApiData);
        console.log('🎯 Setting credits data:', !!creditsApiData);
        console.log('🎯 Setting trends data:', !!trendsApiData);
        
        setInvoiceMonthsData(monthsData);
        setSummaryData(summaryApiData);
        setCreditsData(creditsApiData);
        setTrendsData(trendsApiData);
          
          // Set default selected month to first available month
          if (monthsData && monthsData.invoiceMonths && monthsData.invoiceMonths.length > 0) {
            console.log('📅 Client: Setting default month:', monthsData.invoiceMonths[0]);
            setSelectedMonth(monthsData.invoiceMonths[0]);
          }
          
          console.log('⏹️ Client: Setting loading to false');
          setLoading(false);
          setIsInitialLoad(false); // Mark initial load as complete
        
        globalFetchInProgress = false; // Reset flag
        apiCallsInProgress.current = false; // Reset ref flag
        instanceFetchingData = null; // Reset instance tracking
        dataFetchCompleted = true; // Mark as successfully completed
        strictModeProtectionActive = false; // Allow future fetches
      }).catch(error => {
        console.error('❌ Client: Data fetch error:', error);
        console.error('🔍 Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          cause: error?.cause
        });
        
        // Safe error message extraction
        const errorMessage = error?.message || error?.toString() || 'Failed to fetch data';
        console.log('❌ Client: Setting error state:', errorMessage);
        setError(errorMessage);
        setLoading(false);
        globalFetchInProgress = false; // Reset flag
        apiCallsInProgress.current = false; // Reset ref flag
        instanceFetchingData = null; // Reset instance tracking
        strictModeProtectionActive = false; // Allow retry on error
      });
    }
  }, [isClient, isAuthenticated, user?.soldToId, fetchInitiated, invoiceMonthsData]);

  // Handle month selection change
  const handleMonthChange = async (event) => {
    const newMonth = event.target.value;
    console.log('📅 Client: Month changed to:', newMonth);
    
    // Prevent API calls during initial load when selectedMonth is being set programmatically
    if (isInitialLoad) {
      console.log('🔍 Skipping month change API calls during initial load');
      setSelectedMonth(newMonth);
      return;
    }
    
    setSelectedMonth(newMonth);
    setMonthDataLoading(true);
    
    try {
      // Ensure authentication cookies are synced before server actions
      const authState = { isAuthenticated, user, accessToken };
      if (!checkCookieSync(authState)) {
        console.log('🔄 Syncing auth cookies before month change API calls...');
        syncAuthToCookies(authState);
      }
      
      console.log('🔄 Client: Fetching all APIs for month:', newMonth?.text || newMonth);
      
      totalApiCalls += 3; // Track 3 month-specific API calls
      console.log(`📊 Total API calls made so far: ${totalApiCalls}`);
      
      // Fetch all APIs with the selected month
      const [summaryResponse, creditsResponse, trendsResponse] = await Promise.all([
        fetchSummaryDataServer(user?.soldToId, newMonth),
        fetchCreditsDataServer(user?.soldToId, newMonth),
        fetchTrendsDataServer(user?.soldToId, newMonth)
      ]);
      
      console.log('✅ Client: Month-specific data received');
      
      // Safe response handling
      const safeSummaryResponse = summaryResponse || {};
      const safeCreditsResponse = creditsResponse || {};
      const safeTrendsResponse = trendsResponse || {};
      
      console.log('🔍 Summary for month:', safeSummaryResponse);
      console.log('🔍 Credits for month:', safeCreditsResponse);
      console.log('🔍 Trends for month:', safeTrendsResponse);
      
      // Update the data with month-specific responses using safe access
      setSummaryData(safeSummaryResponse.data || null);
      setCreditsData(safeCreditsResponse.data || null);
      setTrendsData(safeTrendsResponse.data || null);
      
      setMonthDataLoading(false);
    } catch (error) {
      console.error('❌ Client: Month data fetch error:', error);
      console.error('🔍 Month change error details:', {
        message: error?.message,
        stack: error?.stack,
        selectedMonth: newMonth
      });
      
      // Set safe error state without crashing
      const errorMessage = error?.message || 'Failed to fetch month data';
      console.warn('⚠️ Month data fetch failed, continuing with existing data');
      setMonthDataLoading(false);
    }
  };

  // Data processing functions
  const processInvoiceBreakdownData = (summaryData) => {
    if (!summaryData || !summaryData.spendPeriod || !summaryData.spendPeriod.spend) {
      return [];
    }
    
    return summaryData.spendPeriod.spend.map(item => ({
      category: item.label || 'Unknown',
      value: item.value || 0
    }));
  };

  const processTrendingData = (trendData) => {
    if (!trendData || !trendData.chartData) {
      return [];
    }

    // Group data by period (group field) and create series for each label
    const groupedData = {};
    trendData.chartData.forEach(item => {
      const period = new Date(item.group).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!groupedData[period]) {
        groupedData[period] = {};
      }
      groupedData[period][item.label.trim()] = item.value;
    });

    // Convert to format expected by Kendo Chart
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

  // Get filter options
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

  // Process data - using separate API state variables with error handling
  const chartSummaryData = summaryData;
  const chartCreditsData = creditsData;
  const chartTrendData = trendsData;

  // Safe data processing with try-catch blocks
  let invoiceBreakdownData = [];
  let trendingChartData = { categories: [], series: [] };
  let topExpensiveData = [];
  
  try {
    invoiceBreakdownData = processInvoiceBreakdownData(chartSummaryData);
  } catch (error) {
    console.warn('⚠️ Error processing invoice breakdown data:', error);
    invoiceBreakdownData = [];
  }
  
  try {
    trendingChartData = processTrendingData(chartTrendData);
  } catch (error) {
    console.warn('⚠️ Error processing trending data:', error);
    trendingChartData = { categories: [], series: [] };
  }
  
  try {
    topExpensiveData = processTopExpensiveProducts(chartSummaryData);
  } catch (error) {
    console.warn('⚠️ Error processing top expensive products:', error);
    topExpensiveData = [];
  }

  // Chart configurations
  const charts = [
    {
      title: 'Invoice Breakdown by Product Category',
      type: 'pie',
      data: invoiceBreakdownData
    },
    {
      title: 'Top Expensive Products',
      type: 'bar',
      data: topExpensiveData
    }
  ];

  // Prevent hydration mismatch by ensuring client-side rendering
  if (!isClient) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '16px',
        color: '#666'
      }}>
        Initializing...
      </div>
    );
  }

  // Handle authentication redirects - no manual auth debug interface
  if (!isAuthenticated || !user) {
    // Show debug info for current auth state before redirecting
    console.log('❌ Azure Invoice: Authentication check failed', {
      isAuthenticated,
      hasUser: !!user,
      user: user,
      accessToken: !!accessToken
    });
    
    // Redirect to home page for authentication
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  }
  
  // Additional debug for authenticated users without soldToId
  if (!user?.soldToId) {
    console.warn('⚠️ Azure Invoice: User authenticated but no soldToId found', {
      user: user,
      userKeys: user ? Object.keys(user) : 'no user',
      soldToId: user?.soldToId
    });
  }

  // Show loading state while data is being fetched
  const isLoadingData = loading || (isClient && isAuthenticated && user && !invoiceMonthsData && !error);
  
  if (isLoadingData) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
        {/* Header Section - Show immediately */}
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
            <h2 style={{ margin: '0 0 20px 0', color: '#212529', fontSize: '24px', fontWeight: '600' }}>
              Azure Invoice Dashboard
            </h2>
          </div>
        </div>
        
        {/* Loading Content */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #e3e3e3',
            borderTop: '5px solid #0d6efd',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <div style={{ fontSize: '18px', color: '#495057', fontWeight: '500' }}>
            Loading Azure Invoice Data...
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '8px' }}>
            Please wait while we fetch your billing information
          </div>
        </div>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        color: '#721c24', 
        backgroundColor: '#f8d7da', 
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        margin: '20px'
      }}>
        <strong>Error loading Azure Invoice data:</strong>
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          {error}
        </div>
        {error.includes('Authentication required') && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', color: '#856404' }}>
            <strong>Troubleshooting:</strong><br/>
            • Please ensure you are logged in with valid credentials<br/>
            • Try refreshing the page or logging in again<br/>
            • Contact support if the issue persists
          </div>
        )}
      </div>
    );
  }

  // Only show "no data" if we have months data but empty invoiceMonths
  if (invoiceMonthsData && (!invoiceMonthsData.invoiceMonths || invoiceMonthsData.invoiceMonths.length === 0)) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
        {/* Header Section */}
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
            <h2 style={{ margin: '0 0 20px 0', color: '#212529', fontSize: '24px', fontWeight: '600' }}>
              Azure Invoice Dashboard
            </h2>
          </div>
        </div>
        
        {/* No Data Message */}
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: '#856404', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffecb5',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px', fontWeight: '500' }}>
            📊 No Invoice Data Available
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            There are no Azure invoice records available for your account at this time.
          </div>
          <details style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
            <summary>🔍 Debug Information - Separate API Responses (Click to expand)</summary>
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '11px' }}>
              <div>
                <h4 style={{ margin: '5px 0', color: '#333' }}>📅 Invoice Months API Response</h4>
                <pre style={{ padding: '8px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', overflowX: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(invoiceMonthsData, null, 2)}
                </pre>
              </div>
              <div>
                <h4 style={{ margin: '5px 0', color: '#333' }}>📊 Summary Data API Response</h4>
                <pre style={{ padding: '8px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', overflowX: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(summaryData, null, 2)}
                </pre>
              </div>
              <div>
                <h4 style={{ margin: '5px 0', color: '#333' }}>💳 Credits Data API Response</h4>
                <pre style={{ padding: '8px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', overflowX: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(creditsData, null, 2)}
                </pre>
              </div>
              <div>
                <h4 style={{ margin: '5px 0', color: '#333' }}>📈 Trends Data API Response</h4>
                <pre style={{ padding: '8px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', overflowX: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(trendsData, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  const invoiceMonths = invoiceMonthsData?.invoiceMonths || [];
  
  // Safe filter options processing
  let productCategoryOptions = [{ text: 'All', value: 'All' }];
  let productNameOptions = [{ text: 'All', value: 'All' }];
  let skuNameOptions = [{ text: 'All', value: 'All' }];
  
  try {
    productCategoryOptions = getFilterOptions(summaryData, 'productcategory');
  } catch (error) {
    console.warn('⚠️ Error getting product category options:', error);
  }
  
  try {
    productNameOptions = getFilterOptions(summaryData, 'productname');
  } catch (error) {
    console.warn('⚠️ Error getting product name options:', error);
  }
  
  try {
    skuNameOptions = getFilterOptions(summaryData, 'skuname');
  } catch (error) {
    console.warn('⚠️ Error getting SKU name options:', error);
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      {/* Header Section */}
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
          {/* Invoice Month Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#495057', minWidth: '100px' }}>Invoice Month:</label>
            <DropDownList
              data={invoiceMonths}
              textField="text"
              dataItemKey="value"
              value={selectedMonth}
              onChange={handleMonthChange}
              style={{ width: '200px' }}
              loading={monthDataLoading}
            />
            {monthDataLoading && (
              <span style={{ color: '#6c757d', fontSize: '14px' }}>
                Loading month data...
              </span>
            )}
          </div>
        </div>
        
        {/* Invoice Totals */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>Current Month Total</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
            ${summaryData?.spendPeriod?.totalSpend?.toFixed(2) || '0.00'}
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

      {/* Debug Section - JSON Responses */}
      <div style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#212529', fontSize: '18px', fontWeight: '600' }}>
          🔍 Debug - JSON Responses
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Invoice Months Data */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>
              Invoice Months API Response
            </h4>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '15px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <pre style={{ 
                fontSize: '11px', 
                margin: 0, 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(invoiceMonthsData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Summary Data */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>
              Summary API Response
            </h4>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '15px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <pre style={{ 
                fontSize: '11px', 
                margin: 0, 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(summaryData, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Second Row - Credits and Trends */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          {/* Credits Data */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>
              Credits API Response
            </h4>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '15px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <pre style={{ 
                fontSize: '11px', 
                margin: 0, 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(creditsData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Trends Data */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>
              Trends API Response
            </h4>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '15px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <pre style={{ 
                fontSize: '11px', 
                margin: 0, 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(trendsData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Container */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ margin: 0, color: '#212529', fontSize: '20px' }}>
            {charts[currentChartIndex]?.title}
          </h3>
          
          {/* Chart Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              onClick={() => setCurrentChartIndex(prev => prev === 0 ? charts.length - 1 : prev - 1)}
              icon="arrow-left"
              fillMode="outline"
              size="small"
            />
            
            {/* Chart Indicators */}
            <div style={{ display: 'flex', gap: '5px' }}>
              {charts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentChartIndex(index)}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: currentChartIndex === index ? '#0d6efd' : '#dee2e6',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                />
              ))}
            </div>
            
            <Button
              onClick={() => setCurrentChartIndex(prev => prev === charts.length - 1 ? 0 : prev + 1)}
              icon="arrow-right"
              fillMode="outline"
              size="small"
            />
          </div>
        </div>
        
        {/* Chart Container */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ height: '400px' }}>
            {currentChartIndex === 0 ? (
              /* Invoice Breakdown Pie Chart */
              <div>
                {!monthDataLoading && invoiceBreakdownData.length > 0 ? (
                  <Chart style={{ height: '100%' }}>
                    <ChartTooltip format="{0}: ${1:n2}" />
                    <ChartLegend position="right" />
                    <ChartSeries>
                      <ChartSeriesItem 
                        type="pie"
                        data={invoiceBreakdownData}
                        field="value"
                        categoryField="category"
                        labels={{ visible: true, format: "${0:n2}" }}
                      />
                    </ChartSeries>
                  </Chart>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
                    {monthDataLoading ? 'Loading chart data...' : 'No data available for chart'}
                  </div>
                )}
              </div>
            ) : (
              /* Top Expensive Products Chart */
              <div>
                {!monthDataLoading && topExpensiveData.length > 0 ? (
                  <Chart style={{ height: '100%' }}>
                    <ChartTooltip format="{0}: ${1:n2}" />
                    <ChartLegend visible={false} />
                    <ChartCategoryAxis>
                      <ChartCategoryAxisItem categories={topExpensiveData.map(item => item.product)} />
                    </ChartCategoryAxis>
                    <ChartValueAxis>
                      <ChartValueAxisItem />
                    </ChartValueAxis>
                    <ChartSeries>
                      <ChartSeriesItem 
                        type="bar"
                        data={topExpensiveData.map(item => item.value)}
                        labels={{ visible: true, format: "${0:n2}" }}
                      />
                    </ChartSeries>
                  </Chart>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
                    {monthDataLoading ? 'Loading chart data...' : 'No data available for chart'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Filter Dropdowns */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '600', color: '#495057', minWidth: '120px' }}>Product Category:</label>
            <DropDownList
              data={productCategoryOptions}
              textField="text"
              dataItemKey="value"
              value={productCategoryFilter}
              onChange={(e) => setProductCategoryFilter(e.target.value)}
              style={{ width: '200px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '600', color: '#495057', minWidth: '100px' }}>Product Name:</label>
            <DropDownList
              data={productNameOptions}
              textField="text"
              dataItemKey="value"
              value={productNameFilter}
              onChange={(e) => setProductNameFilter(e.target.value)}
              style={{ width: '200px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '600', color: '#495057', minWidth: '80px' }}>SKU Name:</label>
            <DropDownList
              data={skuNameOptions}
              textField="text"
              dataItemKey="value"
              value={skuNameFilter}
              onChange={(e) => setSkuNameFilter(e.target.value)}
              style={{ width: '200px' }}
            />
          </div>
        </div>
      </div>

      {/* Trending Monthly Spend Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#212529', fontSize: '20px' }}>
          Trending Monthly Spend
        </h3>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ height: '400px' }}>
            {!monthDataLoading && trendingChartData.categories && trendingChartData.categories.length > 0 ? (
              <Chart style={{ height: '100%' }}>
                <ChartTooltip format="{0}: ${1:n2}" />
                <ChartLegend position="bottom" />
                <ChartCategoryAxis>
                  <ChartCategoryAxisItem categories={trendingChartData.categories} />
                </ChartCategoryAxis>
                <ChartValueAxis>
                  <ChartValueAxisItem />
                </ChartValueAxis>
                <ChartSeries>
                  {trendingChartData.series.map((series, index) => (
                    <ChartSeriesItem 
                      key={index}
                      type="column"
                      name={series.name}
                      data={series.data}
                      stack={true}
                    />
                  ))}
                </ChartSeries>
              </Chart>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
                {monthDataLoading ? 'Loading trend data...' : 'No trend data available'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Details Table */}
      <div>
        <h3 style={{ margin: '0 0 20px 0', color: '#212529', fontSize: '20px' }}>
          Invoice Details
        </h3>
        
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                    Product Name
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                    SKU
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                    Usage Period
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {topExpensiveData.slice(0, 6).map((item, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                      {item.product}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                      Standard_LRS
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                      {selectedMonth?.text || 'Current Month'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: '600' }}>
                      ${item.value.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ marginTop: '15px', textAlign: 'center', color: '#6c757d', fontSize: '12px' }}>
              Showing {Math.min(6, topExpensiveData.length)} of {topExpensiveData.length} items
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}