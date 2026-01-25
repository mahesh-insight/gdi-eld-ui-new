"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSelector } from 'react-redux';
import { store } from '@/store/store';
import { BasicChart } from '@/common/Charts/BasicChart';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import { BasicPieDoughnutChart } from '@/common/Charts/BasicPieDoughnutChart';
import { Chart, ChartLegend, ChartCategoryAxis, ChartCategoryAxisItem, ChartSeries, ChartSeriesItem, ChartValueAxis, ChartValueAxisItem, ChartSeriesItemTooltip, ChartTooltip } from '@progress/kendo-react-charts';
import { getInsightThemeColors } from '@/lib/chartColors';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import ErrorBoundary from '@/components/ErrorBoundary';
import Carousel from '@/components/Carousel/Carousel';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { Button } from '@progress/kendo-react-buttons';
import { Skeleton } from '@progress/kendo-react-indicators';
import GridTable from '@/components/GridTable/GridTable';
import { azureInvoiceDetailsColumns, monthlyDifferenceColumns } from '@/common/gridColumnDefinitions';
import { fetchConsolidatedAzureInvoiceData } from './actions';
import './AzureInvoice.css';
import './azure-invoice.css';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@progress/kendo-react-tooltip';
import { ArrowUpIcon, ArrowDownIcon, ArcheraIcon, ImportIcon } from '@/lib/svg/svgList';
import { infoCircleIcon } from '@progress/kendo-svg-icons';
import { SvgIcon } from '@progress/kendo-react-common';
import { formatCurrency } from '@/lib/utils';

export default function AzureInvoiceClientContent(props) {
  const { mode, initialData, userContext, ssrPerformance } = props;
  const { t } = useTranslation();
  
  // Get auth state from Redux
  const authState = useSelector((state) => state?.auth || {});
  const loginResponse = useSelector((state) => state?.auth?.loginResponse);
  // Get access token from multiple possible sources
  const accessToken = useSelector((state) => 
    state?.auth?.loginResponse?.tokens?.bearerToken || 
    state?.auth?.accessToken
  );
  
  // Extract user context and soldToId
  let selectedSoldToId;
  if (mode === 'ssr') {
    selectedSoldToId = userContext?.soldToId;
  } else {
    selectedSoldToId = loginResponse?.userProfile?.defaultContext?.[0]?.soldToId || 
                     loginResponse?.userProfile?.defaultContext?.soldToId ||
                     loginResponse?.soldToId ||
                     loginResponse?.userProfile?.soldToId ||
                     authState?.user?.soldToId;
  }

  // Extract data from SSR structure
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
    ? (initialData.trendsResponse?.data || initialData.trend)
    : null;
  const extractedMonthDetailData = mode === 'ssr' && initialData
    ? (initialData.monthDetailResponse?.data || initialData.monthDetail?.data || initialData.monthDetail)
    : null;
  const extractedMonthlyDifferenceData = mode === 'ssr' && initialData
    ? (initialData.monthlyDifferenceResponse?.data || initialData.monthlyDifference?.data || initialData.monthlyDifference)
    : null;

  // Local state - initialize with extracted data
  const [monthsData, setMonthsData] = useState(extractedMonthsData);
  const [selectedMonth, setSelectedMonth] = useState(extractedMonthsData[0] || null);
  const [currentSummaryData, setCurrentSummaryData] = useState(extractedSummaryData);
  const [currentCreditsData, setCurrentCreditsData] = useState(extractedCreditsData);
  const [currentTrendsData, setCurrentTrendsData] = useState(extractedTrendsData);
  const [currentMonthDetailData, setCurrentMonthDetailData] = useState(extractedMonthDetailData);
  const [currentMonthlyDifferenceData, setCurrentMonthlyDifferenceData] = useState(extractedMonthlyDifferenceData);
  
  // Chart type states
  const [trendingChartType, setTrendingChartType] = useState('column');
  const [topNExpensiveProductsChartType, setTopNExpensiveProductsChartType] = useState('bar');
  const [trendingPeriod, setTrendingPeriod] = useState('Last 6 Months');
  const [refreshChart, setRefreshChart] = useState(true);
  const [chartTypeLoading, setChartTypeLoading] = useState(false);
  const [trendChartLoading, setTrendChartLoading] = useState(false);
  
  // Filter states
  const [filterProductCategory, setFilterProductCategory] = useState([]);
  const [filterProductName, setFilterProductName] = useState([]);
  const [filterSkuName, setFilterSkuName] = useState([]);
  
  // Track last applied filter state to detect changes
  const [lastAppliedFilters, setLastAppliedFilters] = useState({
    productCategory: [],
    productName: [],
    skuName: []
  });
  
  // Tab state
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  
  // Pagination states for Invoice Details tab
  const [invoiceDetailsDataState, setInvoiceDetailsDataState] = useState({ skip: 0, take: 20 });
  const [isLoadingInvoiceDetails, setIsLoadingInvoiceDetails] = useState(false);
  
  // Pagination states for Monthly Differences tab
  const [monthlyDiffDataState, setMonthlyDiffDataState] = useState({ skip: 0, take: 20 });
  const [isLoadingMonthlyDiff, setIsLoadingMonthlyDiff] = useState(false);

  // Customer Name (tenantId) filter states
  const [isReseller, setIsReseller] = useState(false);
  const [customerNames, setCustomerNames] = useState([{ label: 'All Customers', value: 'All' }]);
  const [originalCustomerNames, setOriginalCustomerNames] = useState([{ label: 'All Customers', value: 'All' }]); // Preserve unfiltered list
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const customerInitialized = useRef(false); // Track if customer has been set initially

  // Error and loading states
  const [errorState, setErrorState] = useState(null);
  const [isLoading, setIsLoading] = useState(mode !== 'ssr');
  const [isLoadingMonthData, setIsLoadingMonthData] = useState(false);
  const [isLoadingCustomerDropdown, setIsLoadingCustomerDropdown] = useState(false);
  const [isLoadingViewBilledLink, setIsLoadingViewBilledLink] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(mode !== 'ssr');
  const [isLoadingCredits, setIsLoadingCredits] = useState(mode !== 'ssr');
  const [isLoadingTrends, setIsLoadingTrends] = useState(mode !== 'ssr');
  const [isLoadingTrendsPeriodChange, setIsLoadingTrendsPeriodChange] = useState(false);
  const [isLoadingTabData, setIsLoadingTabData] = useState(false);
  
  // Track if any filter has been changed to enable/disable Apply Filters button
  const isApplyFiltersDisabled = useMemo(() => {
    // Helper to compare arrays (works for both empty and populated arrays)
    const arraysEqual = (arr1, arr2) => {
      if (arr1.length !== arr2.length) return false;
      const values1 = arr1.map(item => typeof item === 'object' ? item.value : item).sort();
      const values2 = arr2.map(item => typeof item === 'object' ? item.value : item).sort();
      return values1.every((val, idx) => val === values2[idx]);
    };
    
    // Compare current state with last applied state
    const categoryChanged = !arraysEqual(filterProductCategory || [], lastAppliedFilters.productCategory || []);
    const nameChanged = !arraysEqual(filterProductName || [], lastAppliedFilters.productName || []);
    const skuChanged = !arraysEqual(filterSkuName || [], lastAppliedFilters.skuName || []);
    
    // Enable button if ANY filter has changed from last applied state
    const hasChanges = categoryChanged || nameChanged || skuChanged;
    
    // Disable if no changes OR if summary is loading
    return !hasChanges || isLoadingSummary;
  }, [filterProductCategory, filterProductName, filterSkuName, lastAppliedFilters, isLoadingSummary]);

  // Initialize data from SSR
  useEffect(() => {
    if (mode === 'ssr' && initialData) {
      const months = initialData.monthsResponse?.data?.invoiceMonths || initialData.invoiceMonths || [];
      const summary = initialData.summaryResponse?.data || initialData.summary;
      const credits = initialData.creditsResponse?.data || initialData.credits;
      const trends = initialData.trendsResponse?.data || initialData.trend;
      
      if (months.length > 0) {
        setMonthsData(months);
        setSelectedMonth(months[0]);
      }
      
      setCurrentSummaryData(summary);
      setCurrentCreditsData(credits);
      setCurrentTrendsData(trends);
      
      const monthDetail = initialData.monthDetailResponse?.data || initialData.monthDetail?.data || initialData.monthDetail;
      const monthlyDifference = initialData.monthlyDifferenceResponse?.data || initialData.monthlyDifference?.data || initialData.monthlyDifference;
            
      // Store complete pagination response, not just content array
      setCurrentMonthDetailData(monthDetail);
      setCurrentMonthlyDifferenceData(monthlyDifference);
      
      // Set all loading states to false when SSR data is loaded
      setIsLoading(false);
      setIsLoadingSummary(false);
      setIsLoadingCredits(false);
      setIsLoadingTrends(false);
    }
  }, [mode, initialData]);

  useEffect(() => {
    if (mode === 'ssr') {
      setIsLoading(false);
    }
  }, [mode]);

  // Extract isReseller flag and customer names from summary data
  useEffect(() => {
    if (currentSummaryData) {
      // Extract isReseller flag
      const resellerFlag = currentSummaryData?.isReseller || false;
      setIsReseller(resellerFlag);
      
      // Extract customer names (tenantId list) if available
      // IMPORTANT: Only populate from UNFILTERED data (when we don't have a customer list yet)
      // This prevents filtered summary calls from reducing the dropdown options
      if (currentSummaryData?.selectLists && originalCustomerNames.length === 1) {
        // Note: API returns "tenantId" with capital I, not "tenantid"
        const tenantIdList = currentSummaryData.selectLists.find(list => list.name === 'tenantId');
        if (tenantIdList && tenantIdList.items && tenantIdList.items.length > 0) {
          
          // Store both the displayed list and the original unfiltered list
          setCustomerNames(tenantIdList.items);
          setOriginalCustomerNames(tenantIdList.items);
          
          // ONLY set default selection on INITIAL load, never on subsequent updates
          if (!customerInitialized.current) {
            const allCustomersOption = tenantIdList.items.find(item => item.value === 'All');
            if (allCustomersOption) {
              setSelectedCustomer(allCustomersOption);
              customerInitialized.current = true;
            }
          } else {
            console.log('✅ Customer already initialized, preserving selection:', selectedCustomer?.label);
          }
        } else {
          const defaultOptions = [{ label: 'All Customers', value: 'All' }];
          setCustomerNames(defaultOptions);
          setOriginalCustomerNames(defaultOptions);
          // ONLY set default selection on INITIAL load
          if (!customerInitialized.current) {
            setSelectedCustomer({ label: 'All Customers', value: 'All' });
            customerInitialized.current = true;
          }
        }
      }
      
    }
  }, [currentSummaryData, originalCustomerNames.length]);

  // Helper functions
  const formatMonthDisplay = (monthData) => {
    if (!monthData) return 'Unknown';
    const dateField = monthData.date || monthData.value || monthData.display;
    if (!dateField) return monthData.display || monthData.value || 'Unknown';
    
    try {
      const date = new Date(dateField);
      if (isNaN(date)) return monthData.display || monthData.value || 'Unknown';
      return date.toLocaleDateString('en-US', { 
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return monthData.display || monthData.value || 'Unknown';
    }
  };

  const getMonthValue = (monthData) => {
    const value = monthData?.value || monthData?.date || monthData?.display;
    return value;
  };

  // Month change handler
  const handleMonthChange = async (event) => {
    const newMonth = event.value;
    const monthValue = getMonthValue(newMonth);
    
    setSelectedMonth(newMonth);
    
    // Reset customer selection to "All Customers" when month changes
    const allCustomersOption = customerNames.find(item => item.value === 'All') || { label: 'All Customers', value: 'All' };
    setSelectedCustomer(allCustomersOption);
    
    // Reset filter dropdowns when month changes
    setFilterProductCategory([]);
    setFilterProductName([]);
    setFilterSkuName([]);
    setLastAppliedFilters({
      productCategory: [],
      productName: [],
      skuName: []
    });
    
    if (!accessToken || !selectedSoldToId) {
      setErrorState('Authentication required. Please refresh the page.');
      return;
    }

    // Use flushSync to force immediate rendering of skeleton states
    flushSync(() => {
      setIsLoadingMonthData(true);
      setIsLoadingCustomerDropdown(true);
      setIsLoadingViewBilledLink(true);
      setIsLoadingSummary(true);
      setIsLoadingCredits(true);
      setIsLoadingTrends(true);
      setIsLoadingTabData(true);
      setIsLoading(true);
    });
    
    try {
      // Always pass null for customer filter on month change since we reset to "All Customers"
      const customerFilterValue = null;
      
      // Call the SERVER ACTION for consolidated data (like invoices page)
      // This makes ONE server-side call that fetches all data together
      const months = (trendingPeriod === 'Last 12 Months' || trendingPeriod === 'last12months') ? 12 : 6;
      const consolidatedResult = await fetchConsolidatedAzureInvoiceData(
        accessToken,
        selectedSoldToId,
        monthValue, // Pass the month value
        customerFilterValue, // Pass null since customer is reset to "All"
        months // Pass trend months parameter
      );
      
      if (consolidatedResult.error) {
        console.error('❌ Consolidated fetch error:', consolidatedResult.error);
        throw new Error(consolidatedResult.error);
      }
      
      const consolidatedData = consolidatedResult.data;
      
      // Update all state from the single consolidated response
      if (consolidatedData?.summary) {
        setCurrentSummaryData(consolidatedData.summary);
      } else {
        console.warn('⚠️ No summary data in consolidated response');
      }
      setIsLoadingSummary(false);
      
      if (consolidatedData?.credits) {
        setCurrentCreditsData(consolidatedData.credits);
      } else {
        console.warn('⚠️ No credits data in consolidated response');
      }
      setIsLoadingCredits(false);
      
      if (consolidatedData?.trend) {
        setCurrentTrendsData(consolidatedData.trend);
      } else {
        console.warn('⚠️ No trends data in consolidated response');
      }
      setIsLoadingTrends(false);
            
      setCurrentMonthDetailData(consolidatedData?.monthDetail);
      setCurrentMonthlyDifferenceData(consolidatedData?.monthlyDifference);
      
      setIsLoadingTabData(false);
      setIsLoadingMonthData(false);
      setIsLoadingCustomerDropdown(false);
      setIsLoadingViewBilledLink(false);
      setIsLoading(false); // Hide master loading state
      
    } catch (error) {
      console.error('❌ Month change error:', error);
      setErrorState('Failed to load data for selected month');
      
      // Hide all loaders on error
      setIsLoadingMonthData(false);
      setIsLoadingCustomerDropdown(false);
      setIsLoadingViewBilledLink(false);
      setIsLoadingSummary(false);
      setIsLoadingCredits(false);
      setIsLoading(false);
      setIsLoadingTrends(false);
      setIsLoadingTabData(false);
    }
  };

  const handleChartRefresh = (chartOptions, themeOptions, chartInstance) => {
    // Only prevent refresh if it's not a legitimate chart update
    // This stops flickering from unrelated dropdown changes while allowing
    // chart type changes and data updates to work properly
    setRefreshChart(false);
  };

  // Customer Name change handler
  const handleCustomerChange = useCallback(async (event) => {
    const newCustomer = event.value;
    const customerValue = newCustomer?.value || newCustomer;   
    setSelectedCustomer(newCustomer);
    
    // Reset filter dropdowns when customer changes
    setFilterProductCategory([]);
    setFilterProductName([]);
    setFilterSkuName([]);
    setLastAppliedFilters({
      productCategory: [],
      productName: [],
      skuName: []
    });
    
    if (!accessToken || !selectedSoldToId || !selectedMonth) {
      console.error('❌ Missing required data for customer filter');
      return;
    }
    
    // Show loading states (exclude Invoice Month, Customer Name, and View Billed Usage)
    flushSync(() => {
      setIsLoadingSummary(true);
      setIsLoadingCredits(true);
      setIsLoadingTrends(true);
      setIsLoadingTabData(true);
      setIsLoading(true);
      // Don't show skeletons for: Invoice Month, Customer Name dropdown, View Billed Usage link
    });
    
    try {
      const monthValue = getMonthValue(selectedMonth);
      
      // Call consolidated API with customer filter
      const months = (trendingPeriod === 'Last 12 Months' || trendingPeriod === 'last12months') ? 12 : 6;
      const consolidatedResult = await fetchConsolidatedAzureInvoiceData(
        accessToken,
        selectedSoldToId,
        monthValue,
        customerValue, // Pass customer filter as 4th parameter
        months // Pass trend months parameter
      );
      
      if (consolidatedResult.error) {
        throw new Error(consolidatedResult.error);
      }
      
      const consolidatedData = consolidatedResult.data;
      
      // Update all state from the consolidated response
      setCurrentSummaryData(consolidatedData?.summary);
      setCurrentCreditsData(consolidatedData?.credits);
      setCurrentTrendsData(consolidatedData?.trend);
      setCurrentMonthDetailData(consolidatedData?.monthDetail);
      setCurrentMonthlyDifferenceData(consolidatedData?.monthlyDifference);
      
      // Restore the original customer list (don't let filtered data overwrite it)
      if (originalCustomerNames.length > 1) {
        setCustomerNames(originalCustomerNames);
      }
      
      setIsLoadingSummary(false);
      setIsLoadingCredits(false);
      setIsLoadingTrends(false);
      setIsLoadingTabData(false);
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Customer filter error:', error);
      setErrorState('Failed to load data for selected customer');
      
      // Restore the original customer list even on error
      if (originalCustomerNames.length > 1) {
        setCustomerNames(originalCustomerNames);
      }
      
      setIsLoadingSummary(false);
      setIsLoadingCredits(false);
      setIsLoadingTrends(false);
      setIsLoadingTabData(false);
      setIsLoading(false);
    }
  }, [accessToken, selectedSoldToId, selectedMonth, originalCustomerNames]);

  // Chart type handlers
  const handleChartTypeChange = useCallback(async (newType) => {
    setChartTypeLoading(true);
    setTrendingChartType(newType);
    setTimeout(() => setChartTypeLoading(false), 300);
  }, []);

  const handleTopNExpensiveProductsChartTypeChange = useCallback((newType) => {
    setTopNExpensiveProductsChartType(newType);
  }, []);

  const handleTrendingPeriodChange = useCallback(async (period) => {
    console.log('📅 Period changed to:', period);
    setTrendingPeriod(period);
    
    // Determine months value for API call
    const months = (period === 'Last 12 Months' || period === 'last12months') ? 12 : 6;
    
    if (!accessToken || !selectedSoldToId || !selectedMonth) {
      console.error('❌ Missing required data for trend API call');
      return;
    }
    
    try {
      setIsLoadingTrendsPeriodChange(true);
      
      // Fetch new trend data with the updated months parameter
      const consolidatedResult = await fetchConsolidatedAzureInvoiceData(
        accessToken,
        selectedSoldToId,
        selectedMonth?.value || selectedMonth?.date || selectedMonth,
        selectedCustomer?.value !== 'All' ? selectedCustomer?.value : null,
        months // Pass the months parameter
      );
      
      if (consolidatedResult.error) {
        console.error('❌ Trend fetch error:', consolidatedResult.error);
        return;
      }
      
      const consolidatedData = consolidatedResult.data;
      
      // Update trend data
      if (consolidatedData?.trend) {
        setCurrentTrendsData(consolidatedData.trend);
      }
    } catch (error) {
      console.error('❌ Error fetching trend data:', error);
    } finally {
      setIsLoadingTrendsPeriodChange(false);
    }
  }, [accessToken, selectedSoldToId, selectedMonth, selectedCustomer]);

  const handleApplyFilters = useCallback(async () => {
    if (!accessToken || !selectedSoldToId || !selectedMonth) {
      console.error('❌ Missing required data for filtered API call');
      return;
    }
    
    // Save current filter state as "last applied" for change detection
    setLastAppliedFilters({
      productCategory: [...(filterProductCategory || [])],
      productName: [...(filterProductName || [])],
      skuName: [...(filterSkuName || [])]
    });

    try {
      setIsLoadingTabData(true);

      // Build filter query string - extract value from objects and use URL encoding
      const filterParams = [];
      
      // Add product category filters
      if (filterProductCategory && filterProductCategory.length > 0) {
        filterProductCategory.forEach(category => {
          const categoryValue = typeof category === 'object' ? category.value : category;
          if (categoryValue && categoryValue !== 'all') {
            filterParams.push(`filter=productcategory equals ${encodeURIComponent(categoryValue)}`);
          }
        });
      }
      
      // Add product name filters
      if (filterProductName && filterProductName.length > 0) {
        filterProductName.forEach(name => {
          const nameValue = typeof name === 'object' ? name.value : name;
          if (nameValue && nameValue !== 'all') {
            filterParams.push(`filter=productname equals ${encodeURIComponent(nameValue)}`);
          }
        });
      }
      
      // Add SKU name filters
      if (filterSkuName && filterSkuName.length > 0) {
        filterSkuName.forEach(sku => {
          const skuValue = typeof sku === 'object' ? sku.value : sku;
          if (skuValue && skuValue !== 'all') {
            filterParams.push(`filter=skuname equals ${encodeURIComponent(skuValue)}`);
          }
        });
      }
      
      // Add customer filter (limittenantid) - if customer is selected and not "All"
      if (selectedCustomer && selectedCustomer.value && selectedCustomer.value !== 'All') {
        filterParams.push(`filter=limittenantid%3D${encodeURIComponent(selectedCustomer.value)}`);
      }

      const filterQueryString = filterParams.length > 0 ? `&${filterParams.join('&')}` : '';
      
      // Call the API with filters using service configuration
      const monthValue = getMonthValue(selectedMonth);
      const moment = (await import('moment')).default;
      const formattedMonth = moment(monthValue, 'YYYYMM').format('YYYYMM');
      
      // Get base URL from services configuration
      const services = (await import('@/lib/api/services')).default;
      const serviceConfig = services.getService('invoiceMonthDetail');
      const baseURL = serviceConfig.baseURL;
      
      // Construct the full URL with the service path
      const apiUrl = `${baseURL}/ccr-invoice-service/month/${formattedMonth}?page=0&size=20${filterQueryString}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(Array.isArray(selectedSoldToId) ? selectedSoldToId : [selectedSoldToId])
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Store the complete response with pagination metadata
      setCurrentMonthDetailData(data);
      
      // Reset Monthly Differences data so it refetches with filters when tab is switched
      setCurrentMonthlyDifferenceData(null);
      
    } catch (error) {
      console.error('❌ Error applying filters:', error);
      setErrorState(`Failed to apply filters: ${error.message}`);
    } finally {
      setIsLoadingTabData(false);
    }
  }, [filterProductCategory, filterProductName, filterSkuName, accessToken, selectedSoldToId, selectedMonth]);

  // Handle Invoice Details pagination changes
  const handleInvoiceDetailsDataStateChange = useCallback(async (event) => {
    const newDataState = event.dataState;
    
    // Force immediate state update to show loading indicator
    flushSync(() => {
      setInvoiceDetailsDataState(newDataState);
      setIsLoadingInvoiceDetails(true);
    });
    
    try {
      // Read fresh values from store - use same extraction order as component's useSelector
      const authState = store.getState().auth;
      const accessToken = authState?.loginResponse?.tokens?.bearerToken || authState?.accessToken;
      
      // Extract soldToId using comprehensive path
      const selectedSoldToId = authState?.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId ||
                               authState?.loginResponse?.userProfile?.defaultContext?.soldToId ||
                               authState?.loginResponse?.soldToId ||
                               authState?.loginResponse?.userProfile?.soldToId ||
                               authState?.soldTo ||
                               authState?.user?.soldToId;
      
      const monthValue = selectedMonth?.value || selectedMonth?.date || selectedMonth?.display;
          
      if (!accessToken || !selectedSoldToId || !monthValue) {
        console.error('Missing required data for pagination:', { 
          hasAccessToken: !!accessToken, 
          soldToIdValue: selectedSoldToId,
          hasSelectedMonth: !!selectedMonth,
          monthValue: monthValue
        });
        return;
      }

      const formattedMonth = monthValue.replace(/-/g, '');
      const pageNumber = Math.floor(newDataState.skip / newDataState.take);
      
      // Build filter query string if filters are applied
      let filterQueryString = '';
      if (filterProductCategory.length > 0 || filterProductName.length > 0 || filterSkuName.length > 0) {
        const filterParams = [];
        
        if (filterProductCategory.length > 0) {
          filterProductCategory.forEach(category => {
            const categoryValue = typeof category === 'object' ? category.value : category;
            if (categoryValue && categoryValue !== 'all') {
              filterParams.push(`filter=productcategory equals ${encodeURIComponent(categoryValue)}`);
            }
          });
        }
        
        if (filterProductName.length > 0) {
          filterProductName.forEach(name => {
            const nameValue = typeof name === 'object' ? name.value : name;
            filterParams.push(`filter=productname equals ${encodeURIComponent(nameValue)}`);
          });
        }
        
        if (filterSkuName.length > 0) {
          filterSkuName.forEach(sku => {
            const skuValue = typeof sku === 'object' ? sku.value : sku;
            filterParams.push(`filter=skuname equals ${encodeURIComponent(skuValue)}`);
          });
        }
        
        if (filterParams.length > 0) {
          filterQueryString = '&' + filterParams.join('&');
        }
      }

      const services = (await import('@/lib/api/services')).default;
      const serviceConfig = services.getService('invoiceMonthDetail');
      const baseURL = serviceConfig.baseURL;
      
      const apiUrl = `${baseURL}/ccr-invoice-service/month/${formattedMonth}?page=${pageNumber}&size=${newDataState.take}${filterQueryString}`;
      
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const requestBody = Array.isArray(selectedSoldToId) ? selectedSoldToId : [selectedSoldToId];
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      setCurrentMonthDetailData(data);
      
    } catch (error) {
      console.error('❌ Error changing page:', error);
      setErrorState(`Failed to load page: ${error.message}`);
    } finally {
      setIsLoadingInvoiceDetails(false);
    }
  }, [selectedMonth, filterProductCategory, filterProductName, filterSkuName]);

  // Handle Monthly Differences pagination changes
  const handleMonthlyDiffDataStateChange = useCallback(async (event) => {
    const newDataState = event.dataState;
    
    // Force immediate state update to show loading indicator
    flushSync(() => {
      setMonthlyDiffDataState(newDataState);
      setIsLoadingMonthlyDiff(true);
    });
    

    try {
      // Read fresh values from store - use same extraction order as component's useSelector
      const authState = store.getState().auth;
      const accessToken = authState?.loginResponse?.tokens?.bearerToken || authState?.accessToken;
      
      // Extract soldToId using comprehensive path
      const selectedSoldToId = authState?.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId ||
                               authState?.loginResponse?.userProfile?.defaultContext?.soldToId ||
                               authState?.loginResponse?.soldToId ||
                               authState?.loginResponse?.userProfile?.soldToId ||
                               authState?.soldTo ||
                               authState?.user?.soldToId;
      
      const monthValue = selectedMonth?.value || selectedMonth?.date || selectedMonth?.display;
            
      if (!accessToken || !selectedSoldToId || !monthValue) {
        console.error('Missing required data for pagination:', { 
          hasAccessToken: !!accessToken, 
          soldToIdValue: selectedSoldToId,
          hasSelectedMonth: !!selectedMonth,
          monthValue: monthValue
        });
        return;
      }

      const formattedMonth = monthValue.replace(/-/g, '');
      const pageNumber = Math.floor(newDataState.skip / newDataState.take);

      // Calculate previous month for sku-difference endpoint
      const moment = (await import('moment')).default;
      const currentDate = new Date(selectedMonth.date || selectedMonth.value);
      const previousMonthValue = moment(currentDate).subtract(1, 'month').format('YYYYMM');

      // Build filter query string
      const filterParams = [];
      if (filterProductCategory && filterProductCategory.length > 0) {
        filterProductCategory.forEach(category => {
          const categoryValue = typeof category === 'object' ? category.value : category;
          filterParams.push(`filter=productcategory equals ${categoryValue}`);
        });
      }
      if (filterProductName && filterProductName.length > 0) {
        filterProductName.forEach(name => {
          const nameValue = typeof name === 'object' ? name.value : name;
          filterParams.push(`filter=productname equals ${nameValue}`);
        });
      }
      if (filterSkuName && filterSkuName.length > 0) {
        filterSkuName.forEach(sku => {
          const skuValue = typeof sku === 'object' ? sku.value : sku;
          filterParams.push(`filter=skuname equals ${skuValue}`);
        });
      }
      const filterQueryString = filterParams.length > 0 ? `&${filterParams.join('&')}` : '';

      const services = (await import('@/lib/api/services')).default;
      const serviceConfig = services.getService('invoiceMonthlyDifferenceDetail');
      const baseURL = serviceConfig.baseURL;
      
      const apiUrl = `${baseURL}/ccr-invoice-service/month/sku-difference/${previousMonthValue}/${formattedMonth}?page=${pageNumber}&size=${newDataState.take}${filterQueryString}`;
      
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const requestBody = Array.isArray(selectedSoldToId) ? selectedSoldToId : [selectedSoldToId];
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      setCurrentMonthlyDifferenceData(data);      
    } catch (error) {
      console.error('❌ Error changing page:', error);
      setErrorState(`Failed to load page: ${error.message}`);
    } finally {
      setIsLoadingMonthlyDiff(false);
    }
  }, [selectedMonth, filterProductCategory, filterProductName, filterSkuName]);

  const handleDownload = useCallback(() => {
    console.log('💾 Download triggered');
  }, []);

  // Tab change handler - fetch monthly difference data when that tab is selected
  const handleTabSelect = useCallback(async (e) => {
    const newTabIndex = e.selected;
    setSelectedTabIndex(newTabIndex);
    
    // Check if any filters are active
    const hasActiveFilters = (filterProductCategory && filterProductCategory.length > 0) ||
                            (filterProductName && filterProductName.length > 0) ||
                            (filterSkuName && filterSkuName.length > 0);
    
    // If Monthly Differences tab is selected and (no data OR filters are active)
    if (newTabIndex === 1 && (!currentMonthlyDifferenceData || hasActiveFilters)) {
      
      if (!accessToken || !selectedSoldToId || !selectedMonth) {
        console.error('❌ Missing required data for monthly difference API call');
        return;
      }
      
      try {
        setIsLoading(true);
        const monthValue = getMonthValue(selectedMonth);
        
        // Calculate previous month for the API endpoint
        const moment = (await import('moment')).default;
        const currentDate = new Date(selectedMonth.date || selectedMonth.value);
        const previousMonthValue = moment(currentDate).subtract(1, 'month').format('YYYYMM');
        
        // Build filter array from current filter selections
        const filters = [];
        if (filterProductCategory && filterProductCategory.length > 0) {
          filterProductCategory.forEach(category => {
            const categoryValue = typeof category === 'object' ? category.value : category;
            filters.push(`productcategory equals ${categoryValue}`);
          });
        }
        if (filterProductName && filterProductName.length > 0) {
          filterProductName.forEach(name => {
            const nameValue = typeof name === 'object' ? name.value : name;
            filters.push(`productname equals ${nameValue}`);
          });
        }
        if (filterSkuName && filterSkuName.length > 0) {
          filterSkuName.forEach(sku => {
            const skuValue = typeof sku === 'object' ? sku.value : sku;
            filters.push(`skuname equals ${skuValue}`);
          });
        }
                
        // Import the API function
        const { fetchInvoiceMonthlyDifferenceDetail } = await import('@/lib/azureInvoiceApi');
        
        // Call monthly difference API with both previous and current month and filters
        const response = await fetchInvoiceMonthlyDifferenceDetail({
          soldToId: selectedSoldToId,
          value: `${previousMonthValue}/${monthValue}?page=0&size=20`,
          filter: filters,
          accessToken
        });
        
        
        // Extract content from response
        const monthlyDiffContent = response?.content || response;
              
        setCurrentMonthlyDifferenceData(monthlyDiffContent);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Failed to fetch monthly difference data:', error);
        setIsLoading(false);
      }
    }
  }, [currentMonthlyDifferenceData, accessToken, selectedSoldToId, selectedMonth, filterProductCategory, filterProductName, filterSkuName]);

  // Calculate summary values
  const invoiceTotal = useMemo(() => {
    return currentSummaryData?.spendPeriod?.totalSpend || 0;
  }, [currentSummaryData]);

  const monthlyDifference = useMemo(() => {
    return currentSummaryData?.spendPeriod?.differenceTotalSpend || 0;
  }, [currentSummaryData]);

  const monthlyDifferencePercent = useMemo(() => {
    return currentSummaryData?.spendPeriod?.differencePercentSpend || 0;
  }, [currentSummaryData]);

  const invoiceCredits = useMemo(() => {
    return currentCreditsData?.totalSpend || 0;
  }, [currentCreditsData]);

  // Prepare data for charts using useMemo (same pattern as invoices page)
  const invoiceBreakdownData = useMemo(() => {
    // Try multiple data paths
    const spendData = currentSummaryData?.spend || 
                     currentSummaryData?.spendPeriod?.spend || 
                     currentSummaryData?.data?.spend ||
                     currentSummaryData?.data?.spendPeriod?.spend || 
                     [];
    
    let mappedData = [];
    
    if (spendData && spendData.length > 0) {
      mappedData = spendData.map(item => ({
        group: item?.label || item?.category || 'Unknown',
        label: item?.label || item?.category || 'Unknown', 
        value: item?.value || item?.amount || 0
      }));
    } else if (mode === 'client-side') {
      // Add mock data for development/testing
      mappedData = [
        { group: 'Azure Usage', label: 'Azure Usage', value: 34.27 },
        { group: 'Marketplace', label: 'Marketplace', value: 46.10 },
        { group: 'Private Marketplace', label: 'Private Marketplace', value: 1.38 }
      ];
    }
    
    return mappedData;
  }, [currentSummaryData, mode]);

  const invoiceTrendData = useMemo(() => {
    let periodsData = [];
    if (currentTrendsData?.spendPeriod) {
      periodsData = currentTrendsData.spendPeriod;
    } else if (currentTrendsData?.chartData) {
      periodsData = currentTrendsData.chartData;
    } else if (Array.isArray(currentTrendsData)) {
      periodsData = currentTrendsData;
    }
    
    const monthsToShow = (trendingPeriod === 'Last 12 Months' || trendingPeriod === 'last12months') ? 12 : 6;
    const data = [];
    console.log('trendingPeriod:', trendingPeriod, 'monthsToShow:', monthsToShow);
    
    if (periodsData && periodsData.length > 0) {
      const lastMonths = periodsData?.slice(-monthsToShow) || [];
      
      lastMonths.forEach(period => {
        if (period?.period && period?.totalSpend !== undefined) {
          const monthLabel = new Date(period.period).toLocaleDateString('en', { month: 'short', year: 'numeric' });
          data.push({
            group: monthLabel,
            label: 'Azure Usage',
            value: (period.totalSpend || 0) * 0.6
          });
          data.push({
            group: monthLabel,
            label: 'Marketplace',
            value: (period.totalSpend || 0) * 0.35
          });
          data.push({
            group: monthLabel,
            label: 'Private Marketplace',
            value: (period.totalSpend || 0) * 0.05
          });
        }
      });
    } else if (mode === 'client-side') {
      // Add mock trending data for development
      const months = ['Jul 2023', 'Aug 2023', 'Sep 2023', 'Oct 2023', 'Nov 2023', 'Dec 2023'];
      months.forEach(month => {
        const baseValue = Math.random() * 20 + 30;
        data.push(
          { group: month, label: 'Azure Usage', value: baseValue * 0.6 },
          { group: month, label: 'Marketplace', value: baseValue * 0.35 },
          { group: month, label: 'Private Marketplace', value: baseValue * 0.05 }
        );
      });
    }
    
    return data;
  }, [currentTrendsData, trendingPeriod, mode]);

  const topNExpensiveProducts = useMemo(() => {
    // Try multiple data paths for top expensive products
    const topNData = currentSummaryData?.topNExpensiveProducts?.spend || 
                     currentSummaryData?.topNExpensiveProducts || 
                     currentSummaryData?.data?.topNExpensiveProducts?.spend ||
                     [];
    
    let mappedData = [];
    
    if (topNData && topNData.length > 0) {
      mappedData = topNData.map(item => ({
        group: item?.label || item?.category || 'Unknown',
        category: item?.label || item?.category || 'Unknown', 
        label: item?.label || item?.category || 'Unknown', 
        value: item?.value || item?.amount || 0
      }));
    } else if (mode === 'client-side') {
      // Add mock data for top expensive products
      mappedData = [
        { group: 'Premium SSD Managed Disks', category: 'Premium SSD Managed Disks', label: 'Premium SSD Managed Disks', value: 15.25 },
        { group: 'Bandwidth Inter-Region', category: 'Bandwidth Inter-Region', label: 'Bandwidth Inter-Region', value: 12.40 },
        { group: 'Virtual Machines BS Series', category: 'Virtual Machines BS Series', label: 'Virtual Machines BS Series', value: 8.75 },
        { group: 'Standard SSD Managed Disks', category: 'Standard SSD Managed Disks', label: 'Standard SSD Managed Disks', value: 6.80 },
        { group: 'Azure SQL Database', category: 'Azure SQL Database', label: 'Azure SQL Database', value: 4.90 }
      ];
    }
        
    return mappedData;
  }, [currentSummaryData, mode]);

  // Filter options from summary API selectList
  const filterOptions = useMemo(() => {
    const selectLists = currentSummaryData?.selectLists || [];
    const options = {
      productCategories: [],
      productNames: [],
      skuNames: []
    };
    
    // Map selectList array to filter options with proper label/value structure
    selectLists.forEach(listItem => {
      if (listItem.name === 'productcategory' && listItem.items) {
        const filteredItems = listItem.items
          .filter(item => {
            const itemValue = item?.value || item?.label || item?.text || item?.name || String(item);
            return itemValue && itemValue.toLowerCase() !== 'all';
          })
          .map(item => ({
            label: item?.label || item?.text || item?.name || String(item),
            value: item?.value || item?.label || item?.text || item?.name || String(item)
          }));
        options.productCategories = filteredItems;
      } else if (listItem.name === 'productname' && listItem.items) {
        const filteredItems = listItem.items
          .filter(item => {
            const itemValue = item?.value || item?.label || item?.text || item?.name || String(item);
            return itemValue && itemValue.toLowerCase() !== 'all';
          })
          .map(item => ({
            label: item?.label || item?.text || item?.name || String(item),
            value: item?.value || item?.label || item?.text || item?.name || String(item)
          }));
        options.productNames = filteredItems;
      } else if (listItem.name === 'skuname' && listItem.items) {
        const filteredItems = listItem.items
          .filter(item => {
            const itemValue = item?.value || item?.label || item?.text || item?.name || String(item);
            return itemValue && itemValue.toLowerCase() !== 'all';
          })
          .map(item => ({
            label: item?.label || item?.text || item?.name || String(item),
            value: item?.value || item?.label || item?.text || item?.name || String(item)
          }));
        options.skuNames = filteredItems;
      }
    });
    
    return options;
  }, [currentSummaryData]);

  // Trending period options
  const trendingPeriodOptions = [
    { text: 'Last 6 Months', value: 'last6months' },
    { text: 'Last 12 Months', value: 'last12months' }
  ];

  // Error display
  if (errorState) {
    return (
      <div className="azure-invoice-container">
        <div className="error-message">
          <h2>Error Loading Azure Invoice</h2>
          <p>{errorState}</p>
          <button onClick={() => setErrorState(null)}>Try Again</button>
        </div>
      </div>
    );
  }

  // No data available - show message when months data is empty
  if (!isLoading && (!monthsData || monthsData.length === 0)) {
    return (
      <ErrorBoundary>
        <div className="azure-invoice-page">
          <div className="azure-invoice-container">
            <div className="azure-invoice-header">
              <h1 className="azure-invoice-title">Azure Plan Invoice</h1>
            </div>
            <div className="azure-invoice-no-data-message">
              <SvgIcon icon={infoCircleIcon} size="medium" />
              <span>{t('azureInvoice.noDataMessage', 'Azure Plan Invoice Data is not available for the client')}</span>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="azure-invoice-page">
        <div className="azure-invoice-container">
          <div className="azure-invoice-header">
            <div className="azure-invoice-header-top">
              <h1 className="azure-invoice-title">Azure Plan Invoice</h1>
              
              <div className="kpi-cards">
                {/* Archera Link */}
                {isLoadingSummary ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card archera-link">
                    <>
                      <div className="kpi-label">
                        <Tooltip anchorElement="target" position="right">
                          <span title="Insight has partnered with Archera for this reporting. You can purchase Archera for free on buy.insight.com">
                            <ArcheraIcon className="archera-icon" />
                          </span>
                        </Tooltip>
                        Archera RI Reporting
                      </div>
                    </>
                  </div>
                )}

                {/* Invoice Total */}
                {isLoadingSummary ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card invoice-total">
                    <>
                      <div className="kpi-label">
                        Invoice Total
                        <Tooltip anchorElement="target" position="auto">
                          <SvgIcon icon={infoCircleIcon} size="small" className="info-icon" title="Taxes are not included in totals." />
                        </Tooltip>
                      </div>
                      <div className="kpi-value invoice-total">
                        {formatCurrency(invoiceTotal)}
                      </div>
                    </>
                  </div>
                )}

                {/* Monthly Difference */}
                {isLoadingSummary ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card monthly-difference">
                    <>
                      <div className="kpi-label">
                        Monthly Difference
                        {monthlyDifference > 0 ? (
                          <ArrowUpIcon className="svg-style arrow-icon" />
                        ) : monthlyDifference < 0 ? (
                          <ArrowDownIcon className="svg-style arrow-icon" />
                        ) : null}
                      </div>
                      <div className="kpi-value monthly-difference">
                        {formatCurrency(Math.abs(monthlyDifference))}
                        <span> ({monthlyDifferencePercent.toFixed(2)}%)</span>
                      </div>
                    </>
                  </div>
                )}

                {/* Invoice Credits */}
                {isLoadingCredits ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card invoice-credits">
                    <>
                      <div className="kpi-label">Invoice Credits</div>
                      <div className="kpi-value invoice-credits">
                        {formatCurrency(invoiceCredits)}
                      </div>
                    </>
                  </div>
                )}
              </div>
            </div>
            
            <div className="azure-invoice-header-bottom">
              <div className="azure-invoice-month-selector">
                <label className="azure-invoice-month-label label-text-bold">Invoice Month</label>
                {monthsData && monthsData.length > 0 ? (
                  <DropDownList
                    data={monthsData.map(month => ({
                      ...month,
                      displayName: formatMonthDisplay(month)
                    }))}
                    textField="displayName"
                    dataItemKey={monthsData[0]?.value ? "value" : monthsData[0]?.date ? "date" : "display"}
                    value={selectedMonth ? {
                      ...selectedMonth,
                      displayName: formatMonthDisplay(selectedMonth)
                    } : null}
                    onChange={handleMonthChange}
                    className={`azure-invoice-month-dropdown ${isLoading ? 'disabled' : ''}`}
                    disabled={isLoading}
                  />
                ) : (
                  <Skeleton className="skeleton-month-dropdown" />
                )}
              </div>
              
              {isReseller && (
                <div className="azure-invoice-month-selector">
                  {isLoadingCustomerDropdown ? (
                    <Skeleton className="skeleton-customer-label" />
                  ) : (
                    <label className="azure-invoice-month-label label-text-bold">Customer Name</label>
                  )}
                  {isLoadingCustomerDropdown ? (
                    <Skeleton className="skeleton-customer-dropdown" />
                  ) : (
                    <DropDownList
                      data={customerNames}
                      textField="label"
                      dataItemKey="value"
                      value={selectedCustomer}
                      onChange={handleCustomerChange}
                      className="azure-invoice-month-dropdown"
                    />
                  )}
                </div>
              )}
              
              {isLoadingViewBilledLink ? (
                <Skeleton className="skeleton-view-billed-link" />
              ) : (
                <a href="#" className="azure-invoice-view-usage-link">View Billed Usage</a>
              )}
            </div>
          </div>

          {/* Charts Section */}
          <div className="o-grid o-grid--gutters">
            <div className="o-grid__item u-1/1">
              <Carousel 
                id="carouselMultipleTest"
                slides={{
                  desktop: 1,
                  mobile: 1,
                  mobileLandscape: 1,
                  tablet: 1,
                  tabletLandscape: 1,
                }}
              >
                {/* Slide 1: Two side-by-side charts */}
                <div className="azure-invoice-chart-slide o-grid o-grid--gutters">
                  <div className="o-grid__item u-1/1 u-1/2@desktop invoiceBreakdown azure-invoice-chart-container">
                    <div className="azure-invoice-chart-box">
                    {isLoadingTrends ? (
                      <Skeleton shape={"rectangle"} className="skeleton-chart-500 azure-invoice-loading-skeleton-chart" />
                    ) : (
                      <>
                        <p className="u-text-center">
                          Invoice Breakdown by Product Category
                        </p>
                        {invoiceBreakdownData.length > 0 ? (
                          <Chart
                            onRefresh={handleChartRefresh}
                            className="chart1 clickableChart"
                          >
                            <BasicGroupedChart
                              chartType="column"
                              data={invoiceBreakdownData}
                              categoryField="label"
                              valueField="value"
                              useColors={true}
                              customTooltip={true}
                              showCategoryLabels={false}
                              legendVisible={false}
                              legendPosition="bottom"
                              tooltipFormat="c2"
                              showLabels={true}
                              showCategoryInLabels={true}
                              valueFormat="c2"
                              labelFormat="c2"
                            />
                          </Chart>
                        ) : (
                          <div className="chart-content chart-loading">
                            📊 Loading chart data...
                          </div>
                        )}
                      </>
                    )}
                    </div>
                  </div>
                  <div className="o-grid__item u-1/1 u-1/2@desktop trending6MonthSpend azure-invoice-chart-container">
                    <div className="azure-invoice-chart-box">
                      {isLoadingTrends ? (
                        <>
                          <Skeleton className="skeleton-chart-title" />
                          <Skeleton shape={"rectangle"} className="skeleton-chart-450 azure-invoice-loading-skeleton-chart" />
                        </>
                      ) : (
                        <>
                          <ChartTitleAndButtons
                            title="Trending Monthly Spend"
                            trendingChartType={trendingChartType}
                            handleChartTypeChange={handleChartTypeChange}
                            chartOptions={[
                              { type: 'column', icon: 'chartColumnStackedIcon', title: 'Column Chart' },
                              { type: 'line', icon: 'chartLineStackedIcon', title: 'Line Chart' },
                              { type: 'area', icon: 'chartAreaStackedIcon', title: 'Area Chart' }
                            ]}
                            dropDownList={true}
                            apiEndPoint={''}
                            pageType="invoice"
                            onPeriodChange={handleTrendingPeriodChange}
                            selectedPeriod={trendingPeriod}
                          />
                          {isLoadingTrendsPeriodChange ? (
                            <Skeleton shape={"rectangle"} className="skeleton-chart-450 azure-invoice-loading-skeleton-chart" />
                          ) : (
                            <Chart 
                          key={`${trendingChartType}-${invoiceTrendData.length}`}
                          onRefresh={handleChartRefresh}
                          seriesColors={getInsightThemeColors()}
                          className="clickableChart"
                        >
                          <BasicGroupedChart
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
                          stacked={trendingChartType === "column"}
                        />
                      </Chart>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {/* Slide 2: Top Expensive Products - Full Width */}
                <div className="azure-invoice-chart-container full-width">
                  <div className="azure-invoice-chart-box">
                    {isLoadingTrends ? (
                      <>
                        <Skeleton className="skeleton-chart-title" />
                        <Skeleton className="azure-invoice-loading-skeleton-chart" />
                      </>
                    ) : (
                      <>
                        <ChartTitleAndButtons
                          title="Top Expensive Products"
                          trendingChartType={topNExpensiveProductsChartType}
                          handleChartTypeChange={handleTopNExpensiveProductsChartTypeChange}
                          chartOptions={[
                            { type: 'bar', icon: 'chartBarClusteredIcon', title: 'Bar Chart' },
                            { type: 'pie', icon: 'chartPieIcon', title: 'Pie Chart' },
                            { type: 'donut', icon: 'chartDoughnutIcon', title: 'Doughnut Chart' }
                          ]}
                        />
                        {topNExpensiveProductsChartType === "bar" ? (
                          <Chart 
                            key={`${topNExpensiveProductsChartType}-${topNExpensiveProducts.length}`}
                            onRefresh={handleChartRefresh}
                            seriesColors={getInsightThemeColors()}
                            className="chart3"
                          >
                          <BasicGroupedChart
                            chartType={topNExpensiveProductsChartType}
                            title=""
                            subTitle=""
                            data={topNExpensiveProducts}
                            categoryField="label"
                            valueField="value"
                            categoryTitle=""
                            showCategoryLabels={false}
                            showValueLabels={false}
                            legendPosition="bottom"
                            legendTitle=""
                            legendVisible={true}
                            tooltipFormat="c2"
                            showLabels={true}
                            showCategoryInLabels={false}
                            valueFormat="c2"
                            labelFormat="c2"
                            useColors={true}
                            customTooltip={true}
                          />
                        </Chart>

                      ) : (
                        <Chart 
                          key={`${topNExpensiveProductsChartType}-${topNExpensiveProducts.length}`}
                          onRefresh={handleChartRefresh}
                          seriesColors={getInsightThemeColors()}
                        >
                          <BasicPieDoughnutChart
                            key={topNExpensiveProductsChartType}
                            chartType={topNExpensiveProductsChartType}
                            title=""
                            subTitle=""
                            data={topNExpensiveProducts}
                            categoryField="category"
                            valueField="value"
                            tooltipFormat="c2"
                            legendPosition="bottom"
                            legendVisible={true}
                            showLabels={true}
                            valueFormat="c2"
                            labelFormat="c2"
                          />
                        </Chart>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Carousel>
            </div>
          </div>
        </div>

        <div className="azure-invoice-container">
          {/* Filters Section */}
          <div className="azure-invoice-filters-section">
            {isLoadingSummary ? (
              // Skeleton loaders for filters
              <div className="dropdown-row">
                <div className="dropdown-group">
                  <label className="label-text-bold">
                    <Skeleton className="skeleton-filter-label-long" />
                  </label>
                  <Skeleton className="skeleton-filter-dropdown" />
                </div>
                <div className="dropdown-group">
                  <label className="label-text-bold">
                    <Skeleton className="skeleton-filter-label-medium" />
                  </label>
                  <Skeleton className="skeleton-filter-dropdown" />
                </div>
                <div className="dropdown-group">
                  <label className="label-text-bold">
                    <Skeleton className="skeleton-filter-label-short" />
                  </label>
                  <Skeleton className="skeleton-filter-dropdown" />
                </div>
                <div className="">
                  <Skeleton className="skeleton-filter-button" />
                </div>
              </div>
            ) : (
              // Actual filters
              <div className="dropdown-row">
                <div className="dropdown-group">
                  <label className="label-text-bold">Product Category</label>
                  <MultiSelect
                    data={filterOptions.productCategories}
                    textField="label"
                    dataItemKey="value"
                    value={filterProductCategory}
                    name="msCategory"
                    placeholder="All"
                    onChange={(e) => setFilterProductCategory(e.value)}
                    disabled={isLoadingSummary}
                  />
                </div>
                
                <div className="dropdown-group">
                  <label className="label-text-bold">Product Name</label>
                  <MultiSelect
                    data={filterOptions.productNames}
                    textField="label"
                    dataItemKey="value"
                    value={filterProductName}
                    name="msProducts"
                    placeholder="All"
                    onChange={(e) => setFilterProductName(e.value)}
                    disabled={isLoadingSummary}
                  />
                </div>
                
                <div className="dropdown-group">
                  <label className="label-text-bold">Sku Name</label>
                  <MultiSelect
                    data={filterOptions.skuNames}
                    textField="label"
                    dataItemKey="value"
                    value={filterSkuName}
                    name="msSkuName"
                    placeholder="All"
                    onChange={(e) => setFilterSkuName(e.value)}
                    disabled={isLoadingSummary}
                  />
                </div>
                
                <div className="">
                  <button
                    className="apply-filters-btn"
                    onClick={handleApplyFilters}
                    disabled={isApplyFiltersDisabled}
                  >
                    Apply Filters
                  </button>&nbsp;
                   <Button
                    onClick={handleDownload}
                    className="k-grid-download"
                    fillMode="outline"
                    title="Schedule Download"
                  >
                    <ImportIcon className="svg-style-sm" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tabs Section */}
          <div className="azure-invoice-tabs-section">
            {isLoadingTabData ? (
              <>
                {/* Tab headers skeleton */}
                <div className="azure-invoice-skeleton-tabs">
                  <Skeleton className="skeleton-tab-1" />
                  <Skeleton className="skeleton-tab-2" />
                </div>
                {/* Grid-like skeleton content */}
                <div className="azure-invoice-skeleton-tab-content">
                  {/* Grid header row */}
                  <div className="skeleton-grid-header">
                    <Skeleton className="skeleton-grid-header-cell" />
                    <Skeleton className="skeleton-grid-header-cell" />
                    <Skeleton className="skeleton-grid-header-cell" />
                    <Skeleton className="skeleton-grid-header-cell" />
                    <Skeleton className="skeleton-grid-header-cell" />
                  </div>
                  {/* Grid data rows */}
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className="skeleton-grid-row">
                      <Skeleton className="skeleton-grid-cell" />
                      <Skeleton className="skeleton-grid-cell" />
                      <Skeleton className="skeleton-grid-cell" />
                      <Skeleton className="skeleton-grid-cell" />
                      <Skeleton className="skeleton-grid-cell" />
                    </div>
                  ))}
                  {/* Pagination skeleton */}
                  <div className="skeleton-pagination">
                    <Skeleton className="skeleton-page-info" />
                    <div className="skeleton-page-buttons">
                      <Skeleton className="skeleton-page-button" />
                      <Skeleton className="skeleton-page-button" />
                      <Skeleton className="skeleton-page-button" />
                      <Skeleton className="skeleton-page-button" />
                    </div>
                    <Skeleton className="skeleton-page-size" />
                  </div>
                </div>
              </>
            ) : (
              <TabStrip 
                selected={selectedTabIndex} 
                onSelect={handleTabSelect}
                className="azure-invoice-tabstrip tabstrip"
              >
                <TabStripTab title="Invoice Details">
                <div className="azure-invoice-tab-content">
                  {(() => {                    
                    // Handle different data structures and extract pagination info
                    let processedData = null;
                    let totalElements = 0;
                    
                    if (Array.isArray(currentMonthDetailData)) {
                      processedData = currentMonthDetailData;
                      totalElements = currentMonthDetailData.length;
                    } else if (currentMonthDetailData?.content && Array.isArray(currentMonthDetailData.content)) {
                      processedData = currentMonthDetailData.content;
                      totalElements = currentMonthDetailData.totalElements || currentMonthDetailData.content.length;
                    } else if (currentMonthDetailData?.data && Array.isArray(currentMonthDetailData.data)) {
                      processedData = currentMonthDetailData.data;
                      totalElements = currentMonthDetailData.totalElements || currentMonthDetailData.data.length;
                    } else if (currentMonthDetailData?.items && Array.isArray(currentMonthDetailData.items)) {
                      processedData = currentMonthDetailData.items;
                      totalElements = currentMonthDetailData.totalElements || currentMonthDetailData.items.length;
                    }
                    
                    // Convert invoiceDate strings to Date objects for proper Kendo Grid formatting
                    if (processedData && processedData.length > 0) {
                      processedData = processedData.map(item => ({
                        ...item,
                        invoiceDate: item.invoiceDate ? new Date(item.invoiceDate) : item.invoiceDate
                      }));
                    }                  
                    
                    // Calculate dynamic grid height
                    const rowCount = processedData?.length || 0;
                    const gridHeight = rowCount === 0 ? '200px' : (rowCount > 8 ? '400px' : 'auto');
                    
                    // Prepare data structure for GridTable with pagination info
                    const gridData = {
                      data: processedData || [],
                      total: totalElements
                    };
                    
                    return (
                      <GridTable 
                        data={gridData}
                        columns={azureInvoiceDetailsColumns(t)}
                        className="azure-invoice-details-grid"
                        loading={isLoadingInvoiceDetails}
                        gridHeight={gridHeight}
                        dataState={invoiceDetailsDataState}
                        dataStateChange={handleInvoiceDetailsDataStateChange}
                      />
                    );
                  })()}
                </div>
              </TabStripTab>
              <TabStripTab title="Monthly Differences">
                <div className="azure-invoice-tab-content">
                  {(() => {
                    // Handle different data structures and extract pagination info
                    let processedData = null;
                    let totalElements = 0;
                    
                    if (Array.isArray(currentMonthlyDifferenceData)) {
                      processedData = currentMonthlyDifferenceData;
                      totalElements = currentMonthlyDifferenceData.length;
                    } else if (currentMonthlyDifferenceData?.content && Array.isArray(currentMonthlyDifferenceData.content)) {
                      processedData = currentMonthlyDifferenceData.content;
                      totalElements = currentMonthlyDifferenceData.totalElements || currentMonthlyDifferenceData.content.length;
                    } else if (currentMonthlyDifferenceData?.data && Array.isArray(currentMonthlyDifferenceData.data)) {
                      processedData = currentMonthlyDifferenceData.data;
                      totalElements = currentMonthlyDifferenceData.totalElements || currentMonthlyDifferenceData.data.length;
                    } else if (currentMonthlyDifferenceData?.items && Array.isArray(currentMonthlyDifferenceData.items)) {
                      processedData = currentMonthlyDifferenceData.items;
                      totalElements = currentMonthlyDifferenceData.totalElements || currentMonthlyDifferenceData.items.length;
                    }
                    
                    // Calculate dynamic grid height based on row count
                    const rowCount = processedData?.length || 0;
                    const gridHeight = rowCount === 0 ? '200px' : (rowCount > 8 ? '400px' : 'auto');
                    
                    // Prepare data structure for GridTable with pagination info
                    const gridData = {
                      data: processedData || [],
                      total: totalElements
                    };
                    
                    return (
                      <GridTable 
                        data={gridData}
                        columns={monthlyDifferenceColumns(t)}
                        className="azure-invoice-differences-grid"
                        loading={isLoadingMonthlyDiff}
                        gridHeight={gridHeight}
                        dataState={monthlyDiffDataState}
                        dataStateChange={handleMonthlyDiffDataStateChange}
                      />
                    );
                  })()}
                </div>
              </TabStripTab>
            </TabStrip>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}