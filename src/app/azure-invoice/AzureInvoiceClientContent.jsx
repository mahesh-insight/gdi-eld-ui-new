// src/app/azure-invoice/AzureInvoiceClientContent.jsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import InvoiceDetailsComponent from './components/InvoiceDetailsComponent';
import MonthlyDifferenceComponent from './components/MonthlyDifferenceComponent';
import { getInsightThemeColors } from '@/lib/chartColors';
import './AzureInvoice.css';
// Remove server action imports since we'll use client-side API calls

export default function AzureInvoiceClientContent(props) {
  const { mode, initialData, userContext, ssrPerformance, soldToId } = props;
  
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
  
  // State for dynamic data that changes with month - use correct SSR data structure
  const [currentSummaryData, setCurrentSummaryData] = useState(extractedSummaryData);
  const [currentCreditsData, setCurrentCreditsData] = useState(extractedCreditsData);
  const [currentTrendsData, setCurrentTrendsData] = useState(extractedTrendsData);
  const [isLoading, setIsLoading] = useState(mode === 'ssr' ? false : true); // No loading for SSR, loading for client-side
  const [renderKey, setRenderKey] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Monitor state changes for debugging
  useEffect(() => {
    console.log('🔄 USEEFFECT - Summary Data changed:', currentSummaryData);
    if (currentSummaryData?.spendPeriod) {
      console.log('📊 Summary spendPeriod:', currentSummaryData.spendPeriod);
    }
  }, [currentSummaryData]);

  useEffect(() => {
    console.log('🔄 USEEFFECT - Credits Data changed:', currentCreditsData);
    if (currentCreditsData?.totalSpend !== undefined) {
      console.log('💳 Credits totalSpend:', currentCreditsData.totalSpend);
    }
  }, [currentCreditsData]);

  useEffect(() => {
    console.log('🔄 USEEFFECT - Trends Data changed:', currentTrendsData);
  }, [currentTrendsData]);

  // Load initial data when in client-side mode or handle SSR data
  useEffect(() => {
    console.log('🔄 useEffect - Mode:', mode, 'monthsLoaded:', monthsLoaded, 'initialData:', !!initialData);
    
    if (mode === 'ssr' && initialData) {
      // Handle SSR mode - use server-provided data
      console.log('🎆 SSR: Using server-side rendered data:', initialData);
      
      if (initialData.monthsResponse?.error || initialData.error) {
        console.error('❌ Server-side error:', initialData.monthsResponse?.error || initialData.error);
        setIsLoading(false);
        return;
      }
      
      // Extract data from SSR response structure
      const months = initialData.monthsResponse?.data?.invoiceMonths || initialData.invoiceMonths || [];
      const summary = initialData.summaryResponse?.data || initialData.summary;
      const credits = initialData.creditsResponse?.data || initialData.credits;
      const trends = initialData.trendsResponse?.data || initialData.trends;
      
      console.log('📊 SSR extracted data:', {
        monthsCount: months.length,
        hasSummary: !!summary,
        hasCredits: !!credits,
        hasTrends: !!trends
      });
      
      // Data should already be set in useState, but ensure it's updated
      if (months.length > 0 && !monthsLoaded) {
        setMonthsData(months);
        setSelectedMonth(months[0]);
        setCurrentSummaryData(summary);
        setCurrentCreditsData(credits);
        setCurrentTrendsData(trends);
        setMonthsLoaded(true);
        setIsLoading(false);
        setForceUpdate(prev => prev + 1);
        console.log('✅ SSR: Data initialized from server');
      } else if (months.length > 0) {
        // Data already loaded, just force re-render
        console.log('⚡ SSR: Data already loaded, forcing re-render');
        setForceUpdate(prev => prev + 1);
      }
    } else if (mode === 'client-side' && soldToId && !monthsLoaded) {
      console.log('🔄 Client-side mode: Loading data via API');
      loadInitialData();
    }
  }, [mode, monthsLoaded, initialData]);

  const loadInitialData = async () => {
    console.log('🚀 Loading initial data client-side for soldToId:', soldToId);
    console.log('🚀 UserContext:', userContext);
    setIsLoading(true);
    
    try {
      // First load months data - soldToId should be an array
      const soldToIdValue = soldToId || userContext?.soldToId;
      const response = await fetch('/api/azure-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ 
          action: 'months',
          soldToId: soldToIdValue ? [soldToIdValue] : undefined
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const monthsResult = await response.json();
      console.log('📅 Months loaded:', monthsResult);
      
      if (monthsResult.error) {
        throw new Error(monthsResult.error);
      }
      
      if (monthsResult?.data?.invoiceMonths?.length > 0) {
        const months = monthsResult.data.invoiceMonths;
        const firstMonth = months[0];
        setMonthsData(months);
        setSelectedMonth(firstMonth);
        setMonthsLoaded(true);
        
        // Load data for the first month
        await loadMonthData(firstMonth.value);
      } else {
        console.log('❌ No months data available');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setIsLoading(false);
    }
  };

  // Consolidated function for loading all month data in a single API call
  const loadMonthData = async (monthValue) => {
    console.log('🚀 Loading consolidated month data for:', monthValue);
    
    try {
      const soldToIdValue = soldToId || userContext?.soldToId;
      const response = await fetch('/api/azure-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'monthData', 
          month: monthValue,
          soldToId: soldToIdValue ? [soldToIdValue] : undefined
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Consolidated API call failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📊 Consolidated month data loaded:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update state with all the loaded data from single response
      setCurrentSummaryData(result.data?.summary);
      setCurrentCreditsData(result.data?.credits);  
      setCurrentTrendsData(result.data?.trend);
      setIsLoading(false);
      setForceUpdate(prev => prev + 1);
      
    } catch (error) {
      console.error('❌ Error loading consolidated month data:', error);
      setIsLoading(false);
    }
  };

  // Removed getAccessToken function since we're using the existing API route

  const handleMonthChange = async (selectedMonthObj) => {
    console.log('🚀 handleMonthChange called with:', selectedMonthObj);
    
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
    setIsLoading(true);
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
    
    // Load data immediately when tab is clicked
    if (selectedMonth?.value) {
      if (tabIndex === 0) {
        console.log('🔄 Loading Invoice Details data');
        loadInvoiceDetails(selectedMonth.value);
      } else if (tabIndex === 1) {
        console.log('🔄 Loading Monthly Differences data');
        loadMonthlyDifference(selectedMonth.value);
      }
    } else {
      console.warn('⚠️ No selected month available for data loading');
    }
  };

  const loadInvoiceDetails = async (monthValue) => {
    console.log('🔍 Loading invoice details for month:', monthValue);
    console.log('🚨 API CALL STARTING - Invoice Details');
    try {
      const soldToIdValue = soldToId || userContext?.soldToId;
      console.log('🔍 SoldToId values:', { soldToId, userContextSoldToId: userContext?.soldToId, final: soldToIdValue });
      // Format month for API (2025-12 -> 202512)
      const formattedMonth = monthValue.replace('-', '');
      console.log('📅 Formatted month for API:', formattedMonth);
      console.log('🔍 Full request payload:', {
        action: 'invoiceDetails',
        month: formattedMonth,
        soldToId: soldToIdValue ? [soldToIdValue] : undefined
      });
      
      // Get access token for authorization
      const accessToken = localStorage.getItem('access_token');
      console.log('🔐 Access token available:', !!accessToken);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
        console.log('✅ Authorization header added to request');
      } else {
        console.warn('⚠️ No access token found for API request');
      }
      
      // Use the proper Next.js API route instead of direct backend call
      const apiUrl = '/api/azure-invoice';
      console.log('🌐 API URL:', apiUrl);
      console.log('📦 Request headers:', headers);
      console.log('🔐 Access token (first 20 chars):', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
      
      const requestBody = { 
        action: 'invoiceDetails',
        month: formattedMonth,
        soldToId: soldToIdValue ? [soldToIdValue] : undefined
      };
      console.log('📦 Request body:', requestBody);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 FULL API RESPONSE for invoice details:', result);
        console.log('🔍 Response type:', typeof result);
        console.log('🔍 Response keys:', Object.keys(result || {}));
        
        // Check different possible response structures
        console.log('🔍 Checking response structures:');
        console.log('🔍 result.data:', result.data);
        console.log('🔍 result.data?.content:', result.data?.content);
        console.log('🔍 result.content:', result.content);
        console.log('🔍 Direct result as array:', Array.isArray(result) ? result : 'not array');
        
        // Try different response structures
        let contentData = [];
        if (result.data?.content) {
          contentData = result.data.content;
          console.log('✅ Using result.data.content:', contentData.length, 'items');
        } else if (result.content) {
          contentData = result.content;
          console.log('✅ Using result.content:', contentData.length, 'items');
        } else if (Array.isArray(result)) {
          contentData = result;
          console.log('✅ Using result directly as array:', contentData.length, 'items');
        } else {
          console.log('⚠️ No recognizable data structure found');
        }
        
        console.log('🗜 Setting invoice details data:', contentData);
        setInvoiceDetailsData(contentData);
        console.log('✅ Invoice details loaded - content length:', contentData.length);
      } else {
        console.error('❌ API response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading invoice details:', error);
    }
  };

  const loadMonthlyDifference = async (monthValue) => {
    console.log('🔍 Loading monthly difference for month:', monthValue);
    try {
      const soldToIdValue = soldToId || userContext?.soldToId;
      console.log('🔍 SoldToId values:', { soldToId, userContextSoldToId: userContext?.soldToId, final: soldToIdValue });
      // Calculate previous month for comparison
      // Handle both formats: 2025-12 and 202512
      if (!monthValue) {
        console.error('❌ No monthValue provided');
        return;
      }
      
      let year, month;
      
      if (monthValue.includes('-')) {
        // Format: 2025-12
        [year, month] = monthValue.split('-');
        console.log('📅 Split monthValue (YYYY-MM format):', { year, month, original: monthValue });
      } else if (monthValue.length === 6) {
        // Format: 202512
        year = monthValue.substring(0, 4);
        month = monthValue.substring(4, 6);
        console.log('📅 Split monthValue (YYYYMM format):', { year, month, original: monthValue });
      } else {
        console.error('❌ Invalid monthValue format:', monthValue, 'Expected YYYY-MM or YYYYMM');
        return;
      }
      
      // Ensure month is properly formatted (pad with zero if needed)
      const currentMonthStr = year + (month.length === 1 ? '0' + month : month);
      
      // Calculate previous month
      let prevYear = parseInt(year);
      let prevMonth = parseInt(month) - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevMonthStr = prevYear.toString() + (prevMonth < 10 ? '0' + prevMonth : prevMonth.toString());
      
      console.log('📅 Month calculation details:', {
        originalMonth: monthValue,
        currentMonthStr,
        prevMonthStr,
        yearNum: parseInt(year),
        monthNum: parseInt(month),
        prevYearNum: prevYear,
        prevMonthNum: prevMonth
      });
      
      console.log('🔍 Full request payload:', {
        action: 'monthlyDifference',
        currentMonth: currentMonthStr,
        previousMonth: prevMonthStr,
        soldToId: soldToIdValue ? [soldToIdValue] : undefined
      });
      
      // Get access token for authorization
      const accessToken = localStorage.getItem('access_token');
      console.log('🔐 Access token available:', !!accessToken);
      console.log('🔐 Access token (first 20 chars):', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
        console.log('✅ Authorization header added to monthly difference request');
      } else {
        console.warn('⚠️ No access token found for monthly difference API request');
      }
      
      const apiUrl = '/api/azure-invoice';
      const requestBody = { 
        action: 'monthlyDifference', 
        currentMonth: currentMonthStr,
        previousMonth: prevMonthStr,
        soldToId: soldToIdValue ? [soldToIdValue] : undefined
      };
      
      console.log('🌐 Monthly Difference API URL:', apiUrl);
      console.log('📦 Monthly Difference Request headers:', headers);
      console.log('📦 Monthly Difference Request body:', requestBody);
      console.log('🎯 Expected backend URL should be: /ccr-invoice-service/month/sku-difference/' + prevMonthStr + '/' + currentMonthStr + '?page=0&size=20');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 FULL API RESPONSE for monthly difference:', result);
        console.log('🔍 Response data:', result.data);
        console.log('🔍 Content array:', result.data?.content);
        console.log('🔍 Total elements:', result.data?.totalElements);
        setMonthlyDifferenceData(result.data?.content || []);
        console.log('✅ Monthly difference loaded - content length:', result.data?.content?.length || 0);
      } else {
        console.error('❌ API response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading monthly difference:', error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="azure-invoice-page">
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
                {isLoading ? (
                  <>
                    <div className="azure-invoice-skeleton-kpi">
                      <Skeleton shape="text" className="azure-invoice-skeleton-text-sm" />
                      <Skeleton shape="text" className="azure-invoice-skeleton-text-md" />
                    </div>
                    <div className="azure-invoice-skeleton-kpi-large">
                      <Skeleton shape="text" className="azure-invoice-skeleton-text-lg" />
                      <Skeleton shape="text" className="azure-invoice-skeleton-text-xl" />
                    </div>
                    <div className="azure-invoice-skeleton-kpi">
                      <Skeleton shape="text" className="azure-invoice-skeleton-text-md" />
                      <Skeleton shape="text" className="azure-invoice-skeleton-text-md" />
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
              {isLoading || !monthsLoaded ? (
                <>
                  <div className="azure-invoice-month-selector">
                    <Skeleton shape="text" className="azure-invoice-skeleton-label" />
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-dropdown" />
                  </div>
                  <Skeleton shape="text" className="azure-invoice-skeleton-link" />
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
                      disabled={isLoading}
                      className={`azure-invoice-month-dropdown ${isLoading ? 'disabled' : ''}`}
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
              {isLoading ? (
                <Skeleton shape="rectangle" className="azure-invoice-skeleton-chart" />
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
              {isLoading ? (
                // Skeleton loaders for filters
                <>
                  <div className="azure-invoice-filter-group">
                    <Skeleton shape="text" className="azure-invoice-skeleton-filter-label" />
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-filter-dropdown" />
                  </div>
                  <div className="azure-invoice-filter-group">
                    <Skeleton shape="text" className="azure-invoice-skeleton-filter-label-sm" />
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-filter-dropdown" />
                  </div>
                  <div className="azure-invoice-filter-group">
                    <Skeleton shape="text" className="azure-invoice-skeleton-filter-label-xs" />
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-filter-dropdown" />
                  </div>
                  <div>
                    <Skeleton shape="rectangle" className="azure-invoice-skeleton-filter-button" />
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
                    usageMonth={selectedMonth?.value}
                    data={invoiceDetailsData}
                    isLoading={isLoading}
                  />
                </TabStripTab>
                <TabStripTab title="Monthly Differences">
                  <MonthlyDifferenceComponent 
                    usageMonth={selectedMonth?.value}
                    data={monthlyDifferenceData}
                    isLoading={isLoading}
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
