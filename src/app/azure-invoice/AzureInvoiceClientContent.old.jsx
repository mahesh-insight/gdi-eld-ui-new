// src/app/azure-invoice/AzureInvoiceClientContent.jsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Chart } from '@progress/kendo-react-charts';
import { Skeleton } from '@progress/kendo-react-indicators';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import Carousel from '@/components/Carousel/Carousel';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import { BasicPieDoughnutChart } from '@/common/Charts/BasicPieDoughnutChart';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import useRefreshChartType from '@/common/Charts/useRefreshChartType';
import { 
  fetchInvoiceSummary, 
  fetchInvoiceCredits, 
  fetchInvoiceTrend,
  fetchCombinedInvoiceData 
} from '@/lib/azureInvoiceApi';
import InvoiceDetailsComponent from './components/InvoiceDetailsComponent';
import MonthlyDifferenceComponent from './components/MonthlyDifferenceComponent';
import { getInsightThemeColors } from '@/lib/chartColors';
import './AzureInvoice.css';
// Remove server action imports since we'll use client-side API calls

export default function AzureInvoiceClientContent(props) {
  const { mode, initialData, userContext, ssrPerformance, soldToId } = props;
  
  // Get auth state from Redux for client-side mode
  const authState = useSelector(state => state.auth);
  const reduxUserContext = authState?.loginResponse?.userProfile?.defaultContext?.[0];
  const reduxSoldToId = reduxUserContext?.soldToId || authState?.user?.soldToId || authState?.soldTo;
  const accessToken = authState?.accessToken;
  
  // Try multiple sources for soldToId
  const effectiveSoldToId = soldToId || 
                          reduxSoldToId || 
                          userContext?.soldToId || 
                          userContext?.userProfile?.defaultContext?.[0]?.soldToId ||
                          authState?.loginResponse?.soldToId;
                          
  // Only log soldToId issues if there are problems
  if (mode === 'client-side' && !effectiveSoldToId) {
    console.log('⚠️ Missing soldToId in client-side mode');
  }
  const effectiveUserContext = userContext || reduxUserContext;
  
  // Simple auth validation - no debug noise
  if (mode === 'client-side' && !authState?.isAuthenticated) {
    console.log('⚠️ Client-side mode: No authentication data');
  }
  
  // Minimal logging for debugging
  if (mode === 'ssr') {
    console.log('🎯 SSR mode active with soldToId:', effectiveSoldToId);
  }
  
  // Determine if we're in client-side loading mode
  const isClientSideMode = mode === 'client-side';
  
  // Extract data from SSR structure - handle both old and new formats
  const extractedMonthsData = mode === 'ssr' && initialData 
    ? (initialData.monthsResponse?.data?.invoiceMonths || initialData.invoiceMonths || [])
    : [];
  const extractedSummaryData = mode === 'ssr' && initialData
    ? (initialData.summaryResponse?.data || initialData.summary)
    : null;
  const extractedCreditsData = mode === 'ssr' && initialData
    ? (initialData.creditsResponse?.data || initialData.credits)
    : null;
  const extractedTrendsData = mode === 'ssr' && initialData
    ? (initialData.trendsResponse?.data || initialData.trends)
    : null;
  const extractedInvoiceDetailsData = mode === 'ssr' && initialData
    ? (initialData.invoiceDetailsResponse?.data?.content || initialData.invoiceDetails?.content || initialData.invoiceDetails || [])
    : [];
  
  console.log('📦 Extracted SSR data:', {
    mode,
    hasInitialData: !!initialData,
    monthsCount: extractedMonthsData?.length || 0,
    hasSummary: !!extractedSummaryData,
    hasCredits: !!extractedCreditsData,
    hasTrends: !!extractedTrendsData,
    hasInvoiceDetails: !!extractedInvoiceDetailsData?.length,
    invoiceDetailsCount: extractedInvoiceDetailsData?.length || 0
  });
  
  // Extract data from props - use correct SSR data structure
  const [monthsData, setMonthsData] = useState(extractedMonthsData);
  
  // Local state
  const [selectedMonth, setSelectedMonth] = useState(
    extractedMonthsData[0] || initialData?.selectedMonth || null
  );
  const [monthsLoaded, setMonthsLoaded] = useState(mode === 'ssr' ? extractedMonthsData.length > 0 : false);
  const [filters, setFilters] = useState({
    productCategory: { label: 'All', value: 'All' },
    productName: { label: 'All', value: 'All' },
    skuName: { label: 'All', value: 'All' }
  });
  
  // Chart type states
  const [trendingChartType, setTrendingChartType] = useState('column');
  const [topNExpensiveProductsChartType, setTopNExpensiveProductsChartType] = useState('bar');
  const [chartTypeLoading, setChartTypeLoading] = useState(false);
  const [topNExpensiveProductsChartTypeLoading, setTopNExpensiveProductsChartTypeLoading] = useState(false);
  
  // Client-side loading states
  const [clientDataLoading, setClientDataLoading] = useState(mode === 'client-side');
  const [loadingError, setLoadingError] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(null);
  
  // State for dynamic data that changes with month - use correct SSR data structure
  const [currentSummaryData, setCurrentSummaryData] = useState(extractedSummaryData);
  const [currentCreditsData, setCurrentCreditsData] = useState(extractedCreditsData);
  const [currentTrendsData, setCurrentTrendsData] = useState(extractedTrendsData);
  const [renderKey, setRenderKey] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Tab-related states
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const tabsRef = useRef(null);
  const [invoiceDetailsData, setInvoiceDetailsData] = useState(extractedInvoiceDetailsData || []);
  const [monthlyDifferenceData, setMonthlyDifferenceData] = useState([]);
  
  const handleChartRefresh = useRefreshChartType();
  
  // Chart options with correct format for ChartTitleAndButtons
  const columnLineAreaOptions = [
    {
      type: 'column',
      icon: 'chartColumnStackedIcon',
      title: 'Column chart'
    },
    {
      type: 'line',
      icon: 'chartLineStackedIcon',
      title: 'Line chart'
    },
    {
      type: 'area',
      icon: 'chartAreaStackedIcon',
      title: 'Area chart'
    }
  ];
  
  const barPieDoughnutOptions = [
    {
      type: 'bar',
      icon: 'chartBarStackedIcon',
      title: 'Bar chart'
    },
    {
      type: 'pie',
      icon: 'chartPieIcon',
      title: 'Pie chart'
    },
    {
      type: 'donut',
      icon: 'chartDoughnutIcon',
      title: 'Doughnut chart'
    }
  ];
  
  // Removed data monitoring useEffect hooks to prevent re-renders
  // Data changes will be handled naturally by React state updates

  // Initialize data from SSR - matches invoices page pattern
  useEffect(() => {
    console.log('🎯 AZURE INVOICE SSR useEffect triggered with:', {
      mode,
      isSSR: mode === 'ssr',
      hasInitialData: !!initialData,
      condition: mode === 'ssr' && initialData
    });
    
    if (mode === 'ssr' && initialData) {
      console.log('🏢 SSR: Starting data population process...');
      console.log('📦 SSR: Available initial data:', {
        hasMonths: !!initialData.monthsResponse,
        hasSummary: !!initialData.summaryResponse,
        hasCredits: !!initialData.creditsResponse,
        hasTrends: !!initialData.trendsResponse,
        hasInvoiceDetails: !!initialData.invoiceDetailsResponse
      });
      
      // Extract data from SSR response structure
      const months = initialData.monthsResponse?.data?.invoiceMonths || initialData.invoiceMonths || [];
      const summary = initialData.summaryResponse?.data || initialData.summary;
      const credits = initialData.creditsResponse?.data || initialData.credits;
      const trends = initialData.trendsResponse?.data || initialData.trends;
      const invoiceDetails = initialData.invoiceDetailsResponse?.data?.content || initialData.invoiceDetails?.content || initialData.invoiceDetails || [];
      
      if (months.length > 0) {
        console.log('✅ SSR: Populating data from server');
        setMonthsData(months);
        setSelectedMonth(months[0]);
        setCurrentSummaryData(summary);
        setCurrentCreditsData(credits);
        setCurrentTrendsData(trends);
        setInvoiceDetailsData(invoiceDetails);
        setMonthsLoaded(true);
        setClientDataLoading(false);
        console.log('✅ SSR: Data populated successfully - no API calls needed');
      }
    } else {
      console.log('❌ DEBUG: SSR useEffect not running because:', {
        modeCheck: mode === 'ssr',
        hasInitialData: !!initialData,
        mode
      });
    }
  }, [mode, initialData]); // Keep stable dependencies to avoid header breaking
  
  // Safety mechanism: Ensure loading states are off in SSR mode (matches invoices page pattern)
  useEffect(() => {
    if (mode === 'ssr') {
      console.log('🛡️ SAFETY: Forcing loading states OFF for SSR mode');
      setClientDataLoading(false);
    }
  }, [mode]);

  const loadInitialData = async () => {
    console.log('🚀 Loading initial data client-side for soldToId:', effectiveSoldToId);
    
    // Prevent API calls in SSR mode
    if (mode === 'ssr') {
      console.log('⚠️ SSR mode: Skipping API call in loadInitialData');
      return;
    }
    
    console.log('🚀 UserContext:', effectiveUserContext);
    console.log('🍪 Current cookies before API call:', document.cookie);
    setClientDataLoading(true);
    setLoadingError(null);
    
    try {
      // First load months data - soldToId should be an array
      const soldToIdValue = effectiveSoldToId;
      
      const requestBody = { 
        action: 'months',
        soldToId: soldToIdValue ? [soldToIdValue] : undefined
      };
      
      console.log('🚀 Azure Invoice API called with:', requestBody);
      
      const response = await fetch('/api/azure-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 API Response status:', response.status, response.statusText);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        
        // If 401, token is expired - redirect to login
        if (response.status === 401) {
          console.log('🔒 401 Unauthorized - token expired, redirecting to login');
          window.location.href = '/auth/login';
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const monthsResult = await response.json();
      console.log('📅 Full months API response:', monthsResult);
      console.log('📅 Response structure:', {
        hasData: !!monthsResult.data,
        hasInvoiceMonths: !!monthsResult.data?.invoiceMonths,
        invoiceMonthsLength: monthsResult.data?.invoiceMonths?.length || 0,
        responseKeys: Object.keys(monthsResult || {}),
        dataKeys: monthsResult.data ? Object.keys(monthsResult.data) : []
      });
      
      if (monthsResult.error) {
        throw new Error(monthsResult.error);
      }
      
      // Check different possible response structures
      const months = monthsResult.data?.invoiceMonths || 
                    monthsResult.data?.months || 
                    monthsResult.invoiceMonths || 
                    monthsResult.months ||
                    monthsResult.data || 
                    [];
      
      console.log('📅 Extracted months data:', months);
      console.log('📅 Months count:', months?.length || 0);
      
      if (months && months.length > 0) {
        const firstMonth = months[0];
        console.log('📅 First month structure:', firstMonth);
        setMonthsData(months);
        setSelectedMonth(firstMonth);
        setMonthsLoaded(true);
        
        // Load data for the first month
        await loadMonthData(firstMonth.value || firstMonth.month || firstMonth);
      } else {
        console.log('❌ No months data available - full response:', monthsResult);
        setClientDataLoading(false);
      }
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setClientDataLoading(false);
    }
  };

  // Single combined API call function for loading all month data
  const loadMonthData = async (monthValue) => {
    console.log('🚀 Loading month data with single combined call for:', monthValue);
    
    // Prevent API calls in SSR mode
    if (mode === 'ssr') {
      console.log('⚠️ SSR mode: Skipping API call in loadMonthData');
      return;
    }
    
    try {
      let soldToIdValue = effectiveSoldToId || userContext?.soldToId;
      
      // If still no soldToId, try direct localStorage as fallback
      if (!soldToIdValue && typeof window !== 'undefined') {
        try {
          const persistData = localStorage.getItem('persist:ccr-auth');
          if (persistData) {
            const parsed = JSON.parse(persistData);
            if (parsed.loginResponse) {
              let loginResponseStr = parsed.loginResponse;
              if (typeof loginResponseStr === 'string' && loginResponseStr.startsWith('"')) {
                loginResponseStr = JSON.parse(loginResponseStr);
              }
              const loginResponseObj = typeof loginResponseStr === 'string' ? 
                JSON.parse(loginResponseStr) : loginResponseStr;
              
              soldToIdValue = loginResponseObj?.userProfile?.defaultContext?.[0]?.soldToId || 
                            loginResponseObj?.soldToId;
              console.log('🔍 Fallback soldToId from localStorage:', soldToIdValue);
            }
          }
        } catch (e) {
          console.error('❌ Error extracting soldToId from localStorage:', e);
        }
      }
      
      // Ensure soldToId is a string, not an array or object
      if (Array.isArray(soldToIdValue)) {
        soldToIdValue = soldToIdValue[0]; // Take first element if array
      }
      if (typeof soldToIdValue === 'object' && soldToIdValue !== null) {
        soldToIdValue = null; // Invalid if it's an object
      }
      
      console.log('🔍 Using soldToId for month data:', {
        original: effectiveSoldToId || userContext?.soldToId,
        processed: soldToIdValue,
        type: typeof soldToIdValue
      });
      
      if (!soldToIdValue || typeof soldToIdValue !== 'string') {
        throw new Error('Invalid or missing soldToId for API call');
      }
      
      // Make a single combined API call
      console.log('🚀 Making single combined API call for month:', monthValue);
      const result = await fetchCombinedInvoiceData({ 
        soldToId: soldToIdValue, 
        monthValue: monthValue 
      });
      
      console.log('📊 Combined API call result:', result);
      
      // Check for 401 unauthorized error
      if (result.error && (result.status === 401 || result.error.includes('401') || result.error.includes('Unauthorized'))) {
        console.log('🔒 401 Unauthorized in combined API call - token expired, redirecting to login');
        window.location.href = '/auth/login';
        return;
      }
      
      console.log('🔍 Invoice details in result:', {
        hasInvoiceDetails: !!result.invoiceDetails,
        detailsType: typeof result.invoiceDetails,
        detailsKeys: result.invoiceDetails ? Object.keys(result.invoiceDetails) : 'none',
        hasContent: !!result.invoiceDetails?.content,
        contentLength: result.invoiceDetails?.content?.length || 0
      });
      
      if (result.success) {
        // Update state with the combined results
        setCurrentSummaryData(result.summary);
        setCurrentCreditsData(result.credits);  
        setCurrentTrendsData(result.trend);
        
        // Update invoice details data from combined response
        if (result.invoiceDetails) {
          // Handle different possible data structures
          let detailsContent = [];
          if (result.invoiceDetails.content) {
            detailsContent = result.invoiceDetails.content;
          } else if (Array.isArray(result.invoiceDetails)) {
            detailsContent = result.invoiceDetails;
          } else if (result.invoiceDetails.data?.content) {
            detailsContent = result.invoiceDetails.data.content;
          }
          
          console.log('📋 Updating invoice details:', {
            originalLength: invoiceDetailsData.length,
            newLength: detailsContent.length,
            newData: detailsContent.slice(0, 2) // Log first 2 items for verification
          });
          
          setInvoiceDetailsData(detailsContent);
          console.log('📋 Invoice details state updated with', detailsContent.length, 'records');
        } else {
          console.log('⚠️ No invoice details in combined response');
        }

        // Update monthly difference data from combined response
        if (result.monthlyDifference) {
          // Handle different possible data structures
          let monthlyDiffContent = [];
          if (result.monthlyDifference.content) {
            monthlyDiffContent = result.monthlyDifference.content;
          } else if (Array.isArray(result.monthlyDifference)) {
            monthlyDiffContent = result.monthlyDifference;
          } else if (result.monthlyDifference.data?.content) {
            monthlyDiffContent = result.monthlyDifference.data.content;
          }
          
          console.log('📊 Updating monthly difference:', {
            originalLength: monthlyDifferenceData.length,
            newLength: monthlyDiffContent.length,
            newData: monthlyDiffContent.slice(0, 2) // Log first 2 items for verification
          });
          
          setMonthlyDifferenceData(monthlyDiffContent);
          console.log('📊 Monthly difference state updated with', monthlyDiffContent.length, 'records');
        } else {
          console.log('⚠️ No monthly difference data in combined response');
        }
        
        setClientDataLoading(false);
        setForceUpdate(prev => prev + 1);
        console.log('✅ Month data updated successfully with all components');
      } else {
        console.error('❌ Combined API call failed:', result.error);
        setClientDataLoading(false);
      }
      
    } catch (error) {
      console.error('❌ Error loading month data:', error);
      setClientDataLoading(false);
    }
  };

  // Removed getAccessToken function since we're using the existing API route

  const handleMonthChange = async (selectedMonthObj) => {
    console.log('🚀 handleMonthChange called with:', selectedMonthObj);
    
    // Prevent API calls in SSR mode
    if (mode === 'ssr') {
      console.log('⚠️ SSR mode: Ignoring month change to prevent API calls');
      setSelectedMonth(selectedMonthObj);
      return;
    }
    
    if (!selectedMonthObj || !selectedMonthObj.value) {
      console.log('❌ Invalid month selection:', selectedMonthObj);
      return;
    }

    console.log('✅ Valid month selection, proceeding with:', selectedMonthObj);
    // Clear existing data first to force update
    setCurrentSummaryData(null);
    setCurrentCreditsData(null);
    setCurrentTrendsData(null);
    
    setSelectedMonth(selectedMonthObj);
    setClientDataLoading(true);
    setRenderKey(prev => prev + 1);
    
    // Use the new loadMonthData function
    await loadMonthData(selectedMonthObj.value);
  };

  const handleFilterChange = (filterType, selectedItem) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: selectedItem
    }));
  };

  const applyFilters = () => {
    // Filter the real invoice data based on selected filters
    if (invoiceDetails && invoiceDetails.length > 0) {
      console.log('Applying filters to real data:', {
        productCategory: filters.productCategory?.value || filters.productCategory,
        productName: filters.productName?.value || filters.productName,
        skuName: filters.skuName?.value || filters.skuName
      });
      // Real filtering logic would go here when table is implemented
    }
  };
  
  // Chart type change handlers
  const handleChartTypeChange = useCallback(async (newType) => {
    setChartTypeLoading(true);
    setTrendingChartType(newType);
    setTimeout(() => setChartTypeLoading(false), 300);
  }, []);
  
  const handleTopNExpensiveProductsChartTypeChange = useCallback(async (newType) => {
    setTopNExpensiveProductsChartTypeLoading(true);
    setTopNExpensiveProductsChartType(newType);
    setTimeout(() => setTopNExpensiveProductsChartTypeLoading(false), 300);
  }, []);

  // Calculate summary values using useMemo to ensure they update when state changes
  const invoiceTotal = useMemo(() => {
    
    const value = currentSummaryData?.spendPeriod?.totalSpend || 0;
    return value;
  }, [currentSummaryData]);

  const monthlyDifference = useMemo(() => {
    const value = currentSummaryData?.spendPeriod?.differenceTotalSpend || 0;
    return value;
  }, [currentSummaryData]);

  const monthlyDifferencePercent = useMemo(() => {
    const value = currentSummaryData?.spendPeriod?.differencePercentSpend || 0;
    return value;
  }, [currentSummaryData]);

  const invoiceCredits = useMemo(() => {
    // FIXED: Use correct field for invoice credits from API response
    const value = currentCreditsData?.totalSpend || 0;
    return value;
  }, [currentCreditsData]);

  // Extract spend breakdown using useMemo
  const spendBreakdown = useMemo(() => {
    // Use direct spend array from API response
    const data = currentSummaryData?.spend || currentSummaryData?.spendPeriod?.spend || [];
    return data;
  }, [currentSummaryData]);
  
  // Prepare data for BasicGroupedChart format (Invoice Breakdown)
  const invoiceBreakdownData = useMemo(() => {
    // Use direct spend array from API response
    const spendData = currentSummaryData?.spend || currentSummaryData?.spendPeriod?.spend || [];
    const data = spendData.map(item => ({
      group: item.label,
      label: item.label,
      value: item.value
    }));
    return data;
  }, [currentSummaryData]);

  // Prepare data for Trending Monthly Spend (BasicGroupedChart format)
  const invoiceTrendData = useMemo(() => {
    
    let periodsData = [];
    if (currentTrendsData?.spendPeriod) {
      periodsData = currentTrendsData.spendPeriod;
    } else if (currentTrendsData?.data?.spendPeriod) {
      periodsData = currentTrendsData.data.spendPeriod;
    } else if (Array.isArray(currentTrendsData)) {
      periodsData = currentTrendsData;
    }
    
    const last6Months = periodsData?.slice(-6) || [];
    const data = [];
    
    last6Months.forEach(period => {
      const monthLabel = new Date(period.period).toLocaleDateString('en', { month: 'short', year: 'numeric' });
      // Azure Usage
      data.push({
        group: monthLabel,
        label: 'Azure Usage',
        value: period.totalSpend * 0.6
      });
      // Marketplace
      data.push({
        group: monthLabel,
        label: 'Marketplace',
        value: period.totalSpend * 0.35
      });
      // Private Marketplace
      data.push({
        group: monthLabel,
        label: 'Private Marketplace',
        value: period.totalSpend * 0.05
      });
    });
    
    return data;
  }, [currentTrendsData]);
  
  // Top N Expensive Products data
  const topNExpensiveProducts = useMemo(() => {    
    // Use topNExpensiveProducts.spend for product-level data (FortiWeb, Veeam, etc.)
    const spendData = currentSummaryData?.topNExpensiveProducts?.spend || [];
    
    // If no data or empty array, create debug info
    if (!spendData || spendData.length === 0) {
      console.log('❌ NO TOP N EXPENSIVE PRODUCTS DATA FOUND! Check API response structure.');
      console.log('🔍 Available properties in currentSummaryData:', currentSummaryData ? Object.keys(currentSummaryData) : 'null');
      return [];
    }
    
    const products = spendData
      .map(item => ({
        group: item.label,
        label: item.label,
        value: item.value
      }));
      
    return products;
  }, [currentSummaryData]);
  
  // Pie chart data for Top Expensive Products
  const pieChartData = useMemo(() => {
    // FIXED: Use topNExpensiveProducts.spend for product-level data
    const spendData = currentSummaryData?.topNExpensiveProducts?.spend || [];    
    const data = spendData
      .map(item => ({
        category: item.label,
        value: item.value
      }));
    return data;
  }, [currentSummaryData]);
  
  // Extract select list options
  const selectLists = currentSummaryData?.selectLists || [];
  const getSelectListItems = (name) => {
    const list = selectLists.find(list => list.name === name);
    return list?.items || [];
  };

  // Extract real invoice data from API response
  const invoiceDetails = currentSummaryData?.invoiceDetails || [];

  // Handle tab selection and load data immediately
  const handleTabSelect = (e) => {
    const tabIndex = e.selected;
    console.log('🎯 User clicked tab:', tabIndex);
    setSelectedTabIndex(tabIndex);
    
    // Always ensure data is available when switching tabs
    if (selectedMonth?.value) {
      if (tabIndex === 0) {
        // Invoice Details tab
        console.log('🔄 Switching to Invoice Details tab');
        console.log('📊 Current invoice details data length:', invoiceDetailsData?.length || 0);
        if (!invoiceDetailsData || invoiceDetailsData.length === 0) {
          console.log('🔄 Invoice details not available, triggering combined data load');
          loadMonthData(selectedMonth.value);
        } else {
          console.log('✅ Invoice details data available, tab switch complete');
        }
      } else if (tabIndex === 1) {
        // Monthly Differences tab
        console.log('🔄 Switching to Monthly Differences tab');
        console.log('📊 Current monthly difference data length:', monthlyDifferenceData?.length || 0);
        if (!monthlyDifferenceData || monthlyDifferenceData.length === 0) {
          console.log('🔄 Monthly difference not available, triggering combined data load');
          loadMonthData(selectedMonth.value);
        } else {
          console.log('✅ Monthly difference data available, tab switch complete');
        }
      }
    } else {
      console.warn('⚠️ No selected month available for data loading');
    }
  };

  const loadInvoiceDetails = async (monthValue) => {
    console.log('🔍 Loading invoice details for month:', monthValue);
    console.log('⚠️ Invoice details will be loaded from combined API response instead of separate call');
    
    // Invoice details data should already be available from the combined API call
    // This function is now mainly for logging purposes since the data comes from loadMonthData
    if (invoiceDetailsData && invoiceDetailsData.length > 0) {
      console.log('✅ Invoice details already available:', invoiceDetailsData.length, 'records');
      return;
    }
    
    // If for some reason we need to load invoice details separately, 
    // call the combined endpoint which includes Bearer token authentication
    console.log('🔄 Invoice details not available, triggering combined data load');
    await loadMonthData(monthValue);
  };

  const loadMonthlyDifference = async (monthValue) => {
    console.log('🔍 Loading monthly difference for month:', monthValue);
    console.log('⚠️ Monthly difference will be loaded from combined API response instead of separate call');
    
    // Monthly difference data should already be available from the combined API call
    // This function is now mainly for logging purposes since the data comes from loadMonthData
    if (monthlyDifferenceData && monthlyDifferenceData.length > 0) {
      console.log('✅ Monthly difference already available:', monthlyDifferenceData.length, 'records');
      return;
    }
    
    // If for some reason we need to load monthly difference separately, 
    // call the combined endpoint which includes Bearer token authentication
    console.log('🔄 Monthly difference not available, triggering combined data load');
    await loadMonthData(monthValue);
  };

  return (
    <ErrorBoundary>
      <div className="azure-invoice-page">
        {/* Error Display */}
        {loadingError && (
          <div style={{ 
            padding: '20px', 
            margin: '20px', 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            border: '1px solid #f5c6cb', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <h3>Loading Error</h3>
            <p>{loadingError}</p>
            <button 
              onClick={() => {
                setLoadingError(null);
                setClientDataLoading(true);
                if (mode === 'client-side' && effectiveSoldToId) {
                  loadInitialData();
                }
              }}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px',
                marginLeft: '10px'
              }}
            >
              Refresh Page
            </button>
          </div>
        )}
        
        {/* Main Container with left/right spacing */}
        <div className="azure-invoice-container">
          
          {/* Header Section with Title and KPIs */}
          <div className="azure-invoice-header">
            {/* Top Row: Azure Plan Invoice Title + KPI Cards */}
            <div className="azure-invoice-header-top">
              <h2 className="azure-invoice-title">
                Azure Plan Invoice
              </h2>
              
              {/* KPI Cards - Right Side */}
              <div className="azure-invoice-kpi-cards">
                {clientDataLoading ? (
                  <>
                    <div className="azure-invoice-kpi-card invoice-total azure-invoice-skeleton-kpi">
                      <div className="azure-invoice-kpi-label">
                        <Skeleton shape="text" className="azure-invoice-skeleton-text-sm" />
                      </div>
                      <div className="azure-invoice-kpi-value">
                        <Skeleton shape="text" className="azure-invoice-skeleton-text-md" />
                      </div>
                    </div>
                    <div className="azure-invoice-kpi-card monthly-difference azure-invoice-skeleton-kpi-large">
                      <div className="azure-invoice-kpi-label">
                        <Skeleton shape="text" className="azure-invoice-skeleton-text-lg" />
                      </div>
                      <div className="azure-invoice-kpi-value">
                        <Skeleton shape="text" className="azure-invoice-skeleton-text-xl" />
                      </div>
                    </div>
                    <div className="azure-invoice-kpi-card invoice-credits azure-invoice-skeleton-kpi">
                      <div className="azure-invoice-kpi-label">
                        <Skeleton shape="text" className="azure-invoice-skeleton-text-sm" />
                      </div>
                      <div className="azure-invoice-kpi-value">
                        <Skeleton shape="text" className="azure-invoice-skeleton-text-md" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="azure-invoice-kpi-card invoice-total">
                      <div className="azure-invoice-kpi-label">
                        Invoice Total
                      </div>
                      <div className={`azure-invoice-kpi-value invoice-total ${invoiceTotal > 0 ? '' : 'zero'}`}>
                        {invoiceTotal > 0 ? `$${invoiceTotal.toFixed(2)}` : '$0'}
                      </div>
                    </div>
                    
                    <div className="azure-invoice-kpi-card monthly-difference">
                      <div className="azure-invoice-kpi-label">
                        Monthly Difference
                      </div>
                      <div className="azure-invoice-kpi-value monthly-difference">
                        ${Math.abs(monthlyDifference).toFixed(2)} ({monthlyDifferencePercent}%)
                      </div>
                    </div>
                    
                    <div className="azure-invoice-kpi-card invoice-credits">
                      <div className="azure-invoice-kpi-label">
                        Invoice Credits
                      </div>
                      <div className="azure-invoice-kpi-value invoice-credits">
                        ${invoiceCredits.toFixed(2)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Row: Invoice Month Dropdown + View Billed Usage */}
            <div className="azure-invoice-header-bottom">
              {clientDataLoading || !monthsLoaded ? (
                <>
                  <div className="azure-invoice-month-selector">
                    <label className="azure-invoice-month-label">
                      <Skeleton shape="text" className="azure-invoice-skeleton-label" />
                    </label>
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-dropdown" />
                  </div>
                  <a href="#" className="azure-invoice-view-usage-link">
                    <Skeleton shape="text" className="azure-invoice-skeleton-link" />
                  </a>
                </>
              ) : (
                <>
                  <div className="azure-invoice-month-selector">
                    <label className="azure-invoice-month-label">
                      Invoice Month
                    </label>
                    <DropDownList
                      data={monthsData}
                      textField="text"
                      dataItemKey="value"
                      value={selectedMonth || (monthsData.length > 0 ? monthsData[0] : null)}
                      onChange={(e) => {
                        console.log('🎯 DropDownList onChange triggered:', e);
                        if (e && e.value) {
                          console.log('✅ Valid selection, calling handleMonthChange with:', e.value);
                          handleMonthChange(e.value);
                        } else {
                          console.log('❌ Invalid selection event:', e);
                        }
                      }}
                      disabled={clientDataLoading}
                      className={`azure-invoice-month-dropdown ${clientDataLoading ? 'disabled' : ''}`}
                    />
                  </div>
                  
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('View Billed Usage clicked');
                    }}
                    className="azure-invoice-view-usage-link"
                  >
                    View Billed Usage
                  </a>
                </>
              )}
            </div>
          </div>
          
          {/* Charts Section with Carousel */}
          <div className="o-grid o-grid--gutters azure-invoice-charts-section">
            <div className="o-grid__item u-1/1">
              {clientDataLoading ? (
                <div className="azure-invoice-chart-slide">
                  <div className="azure-invoice-chart-container">
                    <div className="azure-invoice-chart-box">
                      <Skeleton shape="text" className="azure-invoice-skeleton-chart-title" />
                      <Skeleton shape="rectangle" className="azure-invoice-skeleton-chart-content" />
                    </div>
                  </div>
                  <div className="azure-invoice-chart-container">
                    <div className="azure-invoice-chart-box">
                      <Skeleton shape="text" className="azure-invoice-skeleton-chart-title" />
                      <Skeleton shape="rectangle" className="azure-invoice-skeleton-chart-content" />
                    </div>
                  </div>
                </div>
              ) : (
                <Carousel
                  id="azure-invoice-carousel"
                  autoRotate={false}
                  indicator={true}
                  slides={{
                    desktop: 1,
                    mobile: 1,
                    mobileLandscape: 1,
                    tablet: 1,
                    tabletLandscape: 1,
                  }}
                >
                  {/* Slide 1: Invoice Breakdown + Trending Monthly Spend */}
                  <div className="azure-invoice-chart-slide">
                    <div className="azure-invoice-chart-container">
                      <div className="azure-invoice-chart-box">
                        
                        <Chart 
                          onRefresh={handleChartRefresh} 
                          className="chart1"
                          seriesColors={getInsightThemeColors()}
                        >
                          <BasicGroupedChart
                            chartType="column"
                            title="Invoice Breakdown by Product Category"
                            subTitle=""
                            data={invoiceBreakdownData}
                            categoryField="group"
                            valueField="value"
                            groupedByField="label"
                            categoryTitle=""
                            showCategoryLabels={false}
                            legendPosition="bottom"
                            legendTitle=""
                            legendVisible={false}
                            tooltipFormat="c2"
                            showLabels={true}
                            valueFormat="c2"
                            labelFormat="c2"
                            labelIncludeGroup={true}
                            gap={1}
                            spacing={0.3}
                          />
                        </Chart>
                      </div>
                    </div>

                    <div className="azure-invoice-chart-container">
                      <div className="azure-invoice-chart-box">
                        <ChartTitleAndButtons
                          title="Trending Monthly Spend"
                          trendingChartType={trendingChartType}
                          handleChartTypeChange={handleChartTypeChange}
                          chartOptions={columnLineAreaOptions}
                          dropDownList={true}
                          apiEndPoint=""
                          pageType="invoice"
                        />
                        {chartTypeLoading ? (
                          <Skeleton shape="rectangle" className="azure-invoice-skeleton-chart-content" />
                        ) : (
                          <Chart 
                            onRefresh={handleChartRefresh}
                            seriesColors={getInsightThemeColors()}
                          >
                            <BasicGroupedChart
                              key={trendingChartType}
                              chartType={trendingChartType}
                              title=""
                              subTitle=""
                              data={invoiceTrendData}
                              categoryField="group"
                              categoryTitle=""
                              categoryFormat="MMM yyyy"
                              valueField="value"
                              valueFormat="c2"
                              groupedByField="label"
                              legendPosition="bottom"
                              legendTitle=""
                              tooltipFormat="c2"
                              showLabels={false}
                              labelFormat="c2"
                              labelIncludeGroup={true}
                              stacked={trendingChartType === 'column'}
                              // gap={1}
                              // spacing={0.3}
                            />
                          </Chart>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slide 2: Top Expensive Products */}
                  <div className="azure-invoice-chart-slide-single">
                    <div className="azure-invoice-chart-box">
                      <ChartTitleAndButtons
                        title="Top Expensive Products"
                        trendingChartType={topNExpensiveProductsChartType}
                        handleChartTypeChange={handleTopNExpensiveProductsChartTypeChange}
                        chartOptions={barPieDoughnutOptions}
                      />
                      {topNExpensiveProductsChartTypeLoading ? (
                        <Skeleton shape="rectangle" className="azure-invoice-skeleton-chart-content" />
                      ) : topNExpensiveProductsChartType === 'bar' ? (
                        <Chart 
                          onRefresh={handleChartRefresh} 
                          className="chart3"
                        >
                          <BasicGroupedChart
                            key={topNExpensiveProductsChartType}
                            chartType={topNExpensiveProductsChartType}
                            title=""
                            subTitle=""
                            data={topNExpensiveProducts}
                            categoryField="group"
                            valueField="value"
                            groupedByField="label"
                            categoryTitle=""
                            showCategoryLabels={false}
                            showValueLabels={false}
                            legendPosition="bottom"
                            legendTitle=""
                            legendVisible={true}
                            tooltipFormat="c2"
                            showLabels={true}
                            valueFormat="c2"
                            labelFormat="c2"
                            labelIncludeGroup={false}
                            seriesColors={getInsightThemeColors()}
                            gap={0.2}
                            spacing={1.5}
                          />
                        </Chart>
                      ) : (
                        <Chart 
                          onRefresh={handleChartRefresh}
                        >
                          <BasicPieDoughnutChart
                            key={topNExpensiveProductsChartType}
                            chartType={topNExpensiveProductsChartType}
                            title=""
                            subTitle=""
                            data={pieChartData}
                            categoryField="category"
                            valueField="value"
                            tooltipFormat="c2"
                            legendPosition="bottom"
                            legendVisible={true}
                            showLabels={true}
                            valueFormat="c2"
                            labelFormat="c2"
                            seriesColors={getInsightThemeColors()}
                          />
                        </Chart>
                      )}
                    </div>
                  </div>
                </Carousel>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="azure-invoice-filter-section">
            <div className="azure-invoice-filter-row">
              {clientDataLoading ? (
                // Skeleton loaders for filters
                <>
                  <div className="azure-invoice-filter-group">
                    <label className="azure-invoice-filter-label">
                      <Skeleton shape="text" className="azure-invoice-skeleton-filter-label" />
                    </label>
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-filter-dropdown azure-invoice-filter-dropdown" />
                  </div>
                  <div className="azure-invoice-filter-group">
                    <label className="azure-invoice-filter-label">
                      <Skeleton shape="text" className="azure-invoice-skeleton-filter-label-sm" />
                    </label>
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-filter-dropdown azure-invoice-filter-dropdown" />
                  </div>
                  <div className="azure-invoice-filter-group">
                    <label className="azure-invoice-filter-label">
                      <Skeleton shape="text" className="azure-invoice-skeleton-filter-label-xs" />
                    </label>
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-filter-dropdown azure-invoice-filter-dropdown" />
                  </div>
                  <div>
                    <button className="azure-invoice-apply-button" disabled>
                      <Skeleton shape="text" className="azure-invoice-skeleton-filter-button" />
                    </button>
                  </div>
                </>
              ) : (
                // Actual filter controls
                <>
                  <div className="azure-invoice-filter-group">
                    <label className="azure-invoice-filter-label">
                      Product Category
                    </label>
                    <DropDownList
                      data={[{ label: 'All', value: 'All' }, ...getSelectListItems('productcategory')]}
                      textField="label"
                      dataItemKey="value"
                      value={filters.productCategory}
                      onChange={(e) => handleFilterChange('productCategory', e.target.value)}
                      className="azure-invoice-filter-dropdown"
                    />
                  </div>
                  
                  <div className="azure-invoice-filter-group">
                    <label className="azure-invoice-filter-label">
                      Product Name
                    </label>
                    <DropDownList
                      data={[{ label: 'All', value: 'All' }, ...getSelectListItems('productname')]}
                      textField="label"
                      dataItemKey="value"
                      value={filters.productName}
                      onChange={(e) => handleFilterChange('productName', e.target.value)}
                      className="azure-invoice-filter-dropdown"
                    />
                  </div>
                  
                  <div className="azure-invoice-filter-group">
                    <label className="azure-invoice-filter-label">
                      Sku Name
                    </label>
                    <DropDownList
                      data={[{ label: 'All', value: 'All' }, ...getSelectListItems('skuname')]}
                      textField="label"
                      dataItemKey="value"
                      value={filters.skuName}
                      onChange={(e) => handleFilterChange('skuName', e.target.value)}
                      className="azure-invoice-filter-dropdown"
                    />
                  </div>
                  
                  <div>
                    <button 
                      onClick={applyFilters}
                      className="azure-invoice-apply-button"
                    >
                      Apply Filters
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Invoice Details Tabs */}
          <div className="azure-invoice-tabs-section">
            <div ref={tabsRef}>
              <TabStrip 
                selected={selectedTabIndex} 
                onSelect={handleTabSelect}
                className="azure-invoice-tabstrip tabstrip"
              >
                <TabStripTab title="Invoice Details">
                  <InvoiceDetailsComponent 
                    key={`invoice-details-${selectedMonth?.value}-${forceUpdate}`}
                    usageMonth={selectedMonth?.value}
                    data={invoiceDetailsData}
                    isLoading={clientDataLoading}
                  />
                </TabStripTab>
                <TabStripTab title="Monthly Differences">
                  <MonthlyDifferenceComponent 
                    usageMonth={selectedMonth?.value}
                    data={monthlyDifferenceData}
                    isLoading={clientDataLoading}
                  />
                </TabStripTab>
              </TabStrip>
            </div>
          </div>

          {/* Performance Info */}
          {ssrPerformance && (
            <div className="azure-invoice-performance">
              Performance: Data fetched in {ssrPerformance.dataFetchTime}ms | Status: {ssrPerformance.cacheStatus} | Rendered at: {ssrPerformance.timestamp}
            </div>
          )}

        </div>
      </div>
    </ErrorBoundary>
  );
}
