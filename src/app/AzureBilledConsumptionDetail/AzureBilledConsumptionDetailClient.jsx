'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Skeleton } from '@progress/kendo-react-indicators';
import { IntlProvider } from '@progress/kendo-react-intl';
import { Breadcrumb } from '@progress/kendo-react-layout';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { Tooltip } from '@progress/kendo-react-tooltip';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { Button } from '@progress/kendo-react-buttons';
import { SvgIcon } from '@progress/kendo-react-common';
import { infoCircleIcon } from '@progress/kendo-svg-icons';
import { ArcheraIcon } from '@/lib/svg/svgList';
import { Chart } from '@progress/kendo-react-charts';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { getInsightThemeColors } from '@/lib/chartColors';
import CurrencyFormatter from '@/common/CurrencyFormatter';
import { formatCurrency } from '@/lib/utils';
import ErrorMessage from '@/components/ErrorMessage';
import GridTable from '@/components/GridTable/GridTable';
import { azureInvoiceDetailsColumns } from '@/common/gridColumnDefinitions';
import { useTranslation } from 'react-i18next';
import { fetchConsolidatedBilledConsumptionData, fetchAzureSubscriptionTabData } from './actions';
import './AzureBilledConsumption.css';
import { azureDailyConsumptionColumns, azureEntitlementSummaryColumns } from '@/common/commonDataSets';

export default function AzureBilledConsumptionDetailClient({ 
  mode = 'client-side', 
  initialData = null, 
  userContext = null,
  ssrPerformance = null,
  ssrError = null
}) {
  const router = useRouter();
  const { t } = useTranslation();
  
  // State management
  const [navigationContext, setNavigationContext] = useState(initialData?.navigationContext || null);
  const [locationState, setLocationState] = useState({});
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(mode === 'ssr' ? false : true);
  const [isLoadingCustomerDropdown, setIsLoadingCustomerDropdown] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(mode !== 'ssr');
  const [isLoadingCredits, setIsLoadingCredits] = useState(mode !== 'ssr');
  const [isLoadingTotals, setIsLoadingTotals] = useState(mode !== 'ssr');
  const [isLoadingGrid, setIsLoadingGrid] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [refreshChart, setRefreshChart] = useState(false);
  const [error, setError] = useState(null);
  
  // Data state - initialize with SSR data if available
  const [spendTrendState, setSpendTrendState] = useState(initialData?.totalsResponse?.totalSpend || 0);
  const [invoiceCreditState, setInvoiceCreditState] = useState(initialData?.creditsResponse?.totalSpend || 0);
  const [summaryResponse, setSummaryResponse] = useState(initialData?.summaryResponse || null);
  const [gridResponse, setGridResponse] = useState(initialData?.gridResponse || null);
  const [spendTrendChartData, setSpendTrendChartData] = useState([]);
  const [currentMonthLabel, setCurrentMonthLabel] = useState(initialData?.month || '');
  const [currentMonth, setCurrentMonth] = useState(initialData?.month || '');
  const [invoiceNumber, setInvoiceNumber] = useState(null);
  const [locale, setLocale] = useState('en-US');
  const [soldToID, setSoldToID] = useState(userContext?.soldToId || '');
  const [accountInfo, setAccountInfo] = useState(userContext || {});
  
  // Customer/dropdown states (similar to azure-invoice)
  const [isReseller, setIsReseller] = useState(false);
  const [customerNames, setCustomerNames] = useState([{ label: 'All Customers', value: 'All' }]);
  const [selectedCustomer, setSelectedCustomer] = useState({ label: 'All Customers', value: 'All' });
  const [originalCustomerNames, setOriginalCustomerNames] = useState([{ label: 'All Customers', value: 'All' }]);
  
  // Filter states for dropdown filters (matching azure-invoice pattern)
  const [filterAzureSubscription, setFilterAzureSubscription] = useState([]);
  const [filterServiceName, setFilterServiceName] = useState([]);
  const [lastAppliedFilters, setLastAppliedFilters] = useState({
    azureSubscription: [],
    serviceName: []
  });
  
  const [breadcrumbData, setBreadcrumbData] = useState([
    { id: 'invoices', text: 'Invoice Reporting', url: '/invoices' },
    { id: 'billedConsumption', text: 'Billed Consumption' }
  ]);

  // Azure Subscription tab states
  const [subscriptionTabData, setSubscriptionTabData] = useState(null);
  const [subscriptionChartData, setSubscriptionChartData] = useState([]);
  const [trendingChartData, setTrendingChartData] = useState([]);
  const [subscriptionGridData, setSubscriptionGridData] = useState([]);
  const [selectedAzureSubscription, setSelectedAzureSubscription] = useState([]);
  const [azureSubscriptionOptions, setAzureSubscriptionOptions] = useState([]);
  const [trendingChartType, setTrendingChartType] = useState('column');
  const [trendingPeriod, setTrendingPeriod] = useState("Last 6 Months");
  const [isLoadingSubscriptionTab, setIsLoadingSubscriptionTab] = useState(false);
  const [isLoadingTrendingChart, setIsLoadingTrendingChart] = useState(false);
  
  // Pagination states for Daily Consumption grid
  const [dailyConsumptionDataState, setDailyConsumptionDataState] = useState({ skip: 0, take: 20 });
  const [isLoadingDailyConsumption, setIsLoadingDailyConsumption] = useState(false);
  
  // Pagination states for Azure Subscription grid
  const [azureSubscriptionDataState, setAzureSubscriptionDataState] = useState({ skip: 0, take: 20 });
  const [isLoadingAzureSubscription, setIsLoadingAzureSubscription] = useState(false);

  // Extract filter options from summaryResponse
  const filterOptions = useMemo(() => {
    if (!summaryResponse?.selectLists) {
      return { azureSubscriptions: [], serviceNames: [] };
    }
    
    const entitlementList = summaryResponse.selectLists.find(list => list.name === 'entitlementid');
    const meterCategoryList = summaryResponse.selectLists.find(list => list.name === 'metercategory');
    
    return {
      azureSubscriptions: entitlementList?.items || [],
      serviceNames: meterCategoryList?.items || []
    };
  }, [summaryResponse]);

  // Track if any filter has been changed to enable/disable Apply Filters button
  const isApplyFiltersDisabled = useMemo(() => {
    return (
      JSON.stringify(filterAzureSubscription) === JSON.stringify(lastAppliedFilters.azureSubscription) &&
      JSON.stringify(filterServiceName) === JSON.stringify(lastAppliedFilters.serviceName)
    );
  }, [filterAzureSubscription, filterServiceName, lastAppliedFilters]);

  const handleChartRefresh = (chartOptions, themeOptions, chartInstance) => {
    setRefreshChart(false);
  };

  // Format month display (YYYYMM to "Month YYYY")
  const formatMonthDisplay = (monthString) => {
    if (!monthString) return '';
    try {
      const year = monthString.substring(0, 4);
      const month = monthString.substring(4, 6);
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { 
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return monthString;
    }
  };

  // Calculate consumption month (invoice month - 1)
  const getConsumptionMonth = (invoiceMonth) => {
    if (!invoiceMonth) return null;
    // Handle YYYYMM format (e.g., '202508')
    const year = parseInt(invoiceMonth.substring(0, 4));
    const month = parseInt(invoiceMonth.substring(4, 6));
    let cYear = year;
    let cMonth = month - 1;
    if (cMonth === 0) {
      cMonth = 12;
      cYear = year - 1;
    }
    return `${cYear}${String(cMonth).padStart(2, '0')}`;
  };

  // Process chart data: convert date strings to Date objects
  const processData = (data, year) => {
    if (!data || !year) return [];
    return data.map(item => ({
      ...item,
      group: new Date(`${year} ${item.group}`),
    }));
  };

  // Handle 401 errors on client side
  useEffect(() => {
    // Check ssrError prop (from server-side catch block)
    if (ssrError && (ssrError.includes('401') || ssrError.includes('Authentication required') || ssrError.includes('Unauthorized'))) {
      console.log('🔒 CLIENT: 401 Authentication error from SSR - logging out and redirecting');
      if (typeof window !== 'undefined') {
        localStorage.clear();
        document.cookie.split(';').forEach(c => {
          document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });
        window.location.href = '/';
      }
      return;
    }
    
    // Check initialData.errors (from successful SSR but API errors)
    if (initialData?.errors) {
      const hasAuthError = Object.values(initialData.errors).some(error => 
        error && (error.includes('401') || 
                  error.includes('Authentication required') ||
                  error.includes('Unauthorized')));
      
      if (hasAuthError) {
        console.log('🔒 CLIENT: 401 Authentication error from API - logging out and redirecting');
        if (typeof window !== 'undefined') {
          localStorage.clear();
          document.cookie.split(';').forEach(c => {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
          });
          window.location.href = '/';
        }
        return;
      }
    }
  }, [initialData, ssrError]);

  useEffect(() => {
    console.log('🎯 CLIENT: Initializing with mode:', mode);
    console.log('📊 CLIENT: SSR data available:', !!initialData);
    console.log('📦 CLIENT: Initial data:', initialData);
    
    // If SSR mode, data is already loaded from server
    if (mode === 'ssr' && initialData) {
      console.log('✅ CLIENT: Using SSR data, skipping client-side fetch');
      console.log('📊 CLIENT: SSR Data Details:', {
        hasTotals: !!initialData.totalsResponse,
        hasCredits: !!initialData.creditsResponse,
        hasSummary: !!initialData.summaryResponse,
        hasGrid: !!initialData.gridResponse,
        totalSpend: initialData.totalsResponse?.totalSpend,
        creditSpend: initialData.creditsResponse?.totalSpend,
        gridRecords: initialData.gridResponse?.content?.length
      });
      console.log('❌ CLIENT: API Errors:', initialData.errors);
      
      const context = initialData.navigationContext;
      setNavigationContext(context);
      
      // Build locationState from SSR context
      const newLocationState = {
        invoiceMonth: initialData.month,
        currentMonth: initialData.month,
        currentMonthLabel: initialData.month,
        itemClickKey: context?.label || '',
        provider: context?.provider || '',
        invoiceNumber: null,
        customerValue: null,
        nestedRedirect: ''
      };
      setLocationState(newLocationState);
      setCurrentMonthLabel(initialData.month);
      setCurrentMonth(initialData.month);
      
      // Extract customer list from summary if available
      if (initialData.summaryResponse?.selectLists) {
        console.log('👥 CLIENT: Extracting customer list from summary');
        const tenantIdList = initialData.summaryResponse.selectLists.find(list => list.name === 'tenantId');
        if (tenantIdList?.items?.length > 0) {
          console.log('✅ CLIENT: Found customer list:', tenantIdList.items.length, 'customers');
          setCustomerNames(tenantIdList.items);
          setOriginalCustomerNames(tenantIdList.items);
          
          // Check if navigation context has a customer value to set
          if (context?.customerValue) {
            console.log('🎯 CLIENT: Setting customer from navigation context:', context.customerValue);
            const matchingCustomer = tenantIdList.items.find(item => item.value === context.customerValue);
            if (matchingCustomer) {
              console.log('✅ CLIENT: Found matching customer:', matchingCustomer);
              setSelectedCustomer(matchingCustomer);
            } else {
              console.log('⚠️ CLIENT: Customer not found in list, using "All Customers"');
              const allCustomersOption = tenantIdList.items.find(item => item.value === 'All');
              if (allCustomersOption) {
                setSelectedCustomer(allCustomersOption);
              }
            }
          } else {
            // No navigation context, default to "All Customers"
            const allCustomersOption = tenantIdList.items.find(item => item.value === 'All');
            if (allCustomersOption) {
              setSelectedCustomer(allCustomersOption);
            }
          }
          setIsReseller(true);
        }
      }
      
      // Process spend trend chart data
      if (initialData.summaryResponse?.spendTrend?.chartData) {
        const consumptionMonth = getConsumptionMonth(initialData.month);
        const year = consumptionMonth ? consumptionMonth.slice(0, 4) : null;
        console.log('📊 Chart date processing:', { invoiceMonth: initialData.month, consumptionMonth, year });
        const processedData = processData(initialData.summaryResponse.spendTrend.chartData, year);
        setSpendTrendChartData(processedData);
      }
      
      // Set loading states to false for SSR
      console.log('✅ CLIENT: Setting all loading states to false (SSR complete)');
      setIsLoadingSummary(false);
      setIsLoadingCredits(false);
      setIsLoadingTotals(false);
      setIsLoadingGrid(false);
      setLoading(false);
      
      return; // Skip client-side fetch
    }
    
    // Client-side mode: Read navigation context from sessionStorage
    const contextStr = sessionStorage.getItem('navigationContext');
    let context = null;
    
    if (contextStr) {
      try {
        context = JSON.parse(contextStr);
        setNavigationContext(context);
        sessionStorage.removeItem('navigationContext');
      } catch (e) {
        console.error('Failed to parse navigation context:', e);
      }
    }

    // Build locationState object similar to existing pattern
    const newLocationState = {
      invoiceMonth: context?.month || '',
      currentMonth: context?.month || '',
      currentMonthLabel: context?.month || '',
      itemClickKey: context?.label || '',
      provider: context?.provider || '',
      invoiceNumber: null,
      customerValue: null,
      nestedRedirect: ''
    };

    // Try to get additional context from localStorage/Redux if available
    try {
      const storedLocationState = sessionStorage.getItem('location_state');
      if (storedLocationState) {
        const parsed = JSON.parse(storedLocationState);
        Object.assign(newLocationState, parsed);
      }
    } catch (e) {
      console.error('Failed to parse location_state:', e);
    }

    setLocationState(newLocationState);
    setCurrentMonthLabel(newLocationState.currentMonthLabel);
    setInvoiceNumber(newLocationState.invoiceNumber);

    // Get account info from localStorage (following existing pattern)
    let storedAccountInfo = null;
    try {
      storedAccountInfo = JSON.parse(localStorage.getItem('selectedAccount') || '{}');
      setAccountInfo(storedAccountInfo);
      setSoldToID(storedAccountInfo.soldToID || '');
      setLocale(storedAccountInfo.locale || 'en-US');
    } catch (e) {
      console.error('Failed to get account info:', e);
    }

    setLoading(false);

    // Initial data fetch only in client-side mode
    if (mode === 'client-side' && newLocationState.invoiceMonth && storedAccountInfo?.soldToID) {
      fetchInitialData(newLocationState, storedAccountInfo.soldToID);
    }
  }, [mode, initialData]);

  const handleBreadcrumbSelect = (event) => {
    const item = breadcrumbData.find(crumb => crumb.id === event.id);
    if (item?.url) {
      router.push(item.url);
    }
  };

  const handleTabSelect = async (e) => {
    const newTab = e.selected;
    setSelectedTab(newTab);
    
    // If switching to Azure Subscription tab (index 1) and data not loaded
    if (newTab === 1 && !subscriptionTabData && soldToID && currentMonth) {
      await loadAzureSubscriptionTabData();
    }
  };

  // Load Azure Subscription tab data
  const loadAzureSubscriptionTabData = useCallback(async () => {
    if (!soldToID || !currentMonth) {
      console.log('❌ Cannot load Azure Subscription tab: missing soldToID or currentMonth', { soldToID, currentMonth });
      return;
    }
    
    setIsLoadingSubscriptionTab(true);
    
    try {
      const consumptionMonth = getConsumptionMonth(currentMonth);
      console.log('📅 Month calculation:', { invoiceMonth: currentMonth, consumptionMonth });
      
      // Build filters from navigation context - same as Daily Consumption tab
      const filters = {};
      
      // Always include limittenantid
      if (selectedCustomer?.value && selectedCustomer.value !== 'All') {
        filters.limittenantid = selectedCustomer.value;
      } else {
        filters.limittenantid = 'All';
      }
      
      // Add product category from navigation context
      if (navigationContext?.label) {
        filters.productcategory = navigationContext.label;
      }
      
      // Add invoice number from navigation context
      if (navigationContext?.invoiceNumber) {
        filters.invoicenumber = navigationContext.invoiceNumber;
      }
      
      // Convert period to months for API call
      const months = trendingPeriod === 12 || trendingPeriod === "Last 12 Months" ? 12 : 6;
      
      console.log('📡 Loading Azure Subscription Tab data:', { soldToID, currentMonth, consumptionMonth, filters, trendingPeriod, months });
      
      // Reset pagination to first page when loading/filtering tab data
      setAzureSubscriptionDataState({ skip: 0, take: 20 });
      
      const result = await fetchAzureSubscriptionTabData(
        soldToID,
        currentMonth,
        consumptionMonth,
        filters,
        months, // months parameter (numeric)
        6 // limit always stays at 6
      );
      
      if (result.error) {
        console.error('❌ Failed to load subscription tab data:', result.error);
        setError(result.error);
        return;
      }
      
      const data = result.data;
      console.log('📦 Azure Subscription Tab API Response:', {
        hasTotals: !!data.totalsResponse,
        hasCredits: !!data.creditsResponse,
        hasSummary: !!data.summaryResponse,
        hasTrend: !!data.trendResponse,
        hasGrid: !!data.gridResponse,
        summaryStructure: data.summaryResponse ? Object.keys(data.summaryResponse) : [],
        trendStructure: data.trendResponse ? Object.keys(data.trendResponse) : [],
        gridStructure: data.gridResponse ? Object.keys(data.gridResponse) : [],
        errors: data.errors
      });
      
      setSubscriptionTabData(data);
      
      // Process entitlement summary for Azure Subscription dropdown and chart
      if (data.summaryResponse) {
        console.log('🔍 Processing summary response:', data.summaryResponse);
        
        // Extract dropdown options from selectLists
        if (data.summaryResponse.selectLists) {
          const entitlementList = data.summaryResponse.selectLists.find(list => list.name === 'entitlementid');
          if (entitlementList?.items) {
            console.log('✅ Found entitlement options:', entitlementList.items.length);
            // Don't add 'All' to the options, it will be the placeholder
            setAzureSubscriptionOptions(entitlementList.items);
          }
        }
        
        // Process spend period for Monthly Consumption by Azure Subscription chart
        if (data.summaryResponse.spendPeriod?.spend) {
          console.log('✅ Found spend period data:', data.summaryResponse.spendPeriod.spend.length);
          const chartData = data.summaryResponse.spendPeriod.spend.map(item => ({
            label: item.label || item.name,
            value: item.value || item.spend || 0
          }));
          setSubscriptionChartData(chartData);
          console.log('📊 Subscription chart data set:', chartData.length, 'items');
        } else {
          console.log('⚠️ No spendPeriod.spend data in summary response');
        }
      }
      
      // Process trend data for Trending Monthly Spend chart
      if (data.trendResponse) {
        console.log('🔍 Processing trend response:', data.trendResponse);
        const trendData = processTrendData(data.trendResponse);
        console.log('📊 Processed trend data:', trendData.length, 'items');
        setTrendingChartData(trendData);
      } else {
        console.log('⚠️ No trend response data');
      }
      
      // Process grid data
      if (data.gridResponse) {
        console.log('🔍 Processing grid response:', data.gridResponse);
        const gridData = data.gridResponse.content || data.gridResponse.data || data.gridResponse;
        console.log('📊 Grid data:', Array.isArray(gridData) ? gridData.length : 'not an array', 'items');
        setSubscriptionGridData(gridData);
      } else {
        console.log('⚠️ No grid response data');
      }
      
      console.log('✅ Azure Subscription Tab data loaded');
    } catch (error) {
      console.error('❌ Error loading subscription tab:', error);
      setError(error.message);
    } finally {
      setIsLoadingSubscriptionTab(false);
    }
  }, [soldToID, currentMonth, navigationContext, selectedCustomer, trendingPeriod]);

  // Process trend data similar to azure-invoice
  const processTrendData = (trendResponse) => {
    console.log('🔄 processTrendData input:', trendResponse);
    
    if (!trendResponse) {
      console.log('⚠️ No trend response');
      return [];
    }
    
    // Use chartData array from the trend response
    const trendData = trendResponse.chartData || trendResponse.data || trendResponse.content || trendResponse;
    console.log('📊 Trend data structure:', { 
      isArray: Array.isArray(trendData), 
      type: typeof trendData,
      keys: trendData ? Object.keys(trendData) : [],
      length: Array.isArray(trendData) ? trendData.length : 'N/A'
    });
    
    if (!Array.isArray(trendData)) {
      console.log('⚠️ Trend data is not an array');
      return [];
    }
    
    // Transform the chartData array to the format expected by BasicGroupedChart
    const processed = trendData.map(item => {
      console.log('📅 Processing item:', item);
      return {
        group: new Date(item.group),
        label: item.label,
        value: item.value || 0
      };
    });
    
    console.log('✅ Processed trend data:', processed.length, 'items');
    return processed;
  };

  // Handle trending chart type change
  const handleChartTypeChange = useCallback((newType) => {
    setTrendingChartType(newType);
  }, []);

  // Handle trending period change
  const handleTrendingPeriodChange = useCallback(async (period) => {
    console.log('📅 Trending period changed to:', period);
    
    // Update selected period state
    setTrendingPeriod(period);
    
    // Calculate months based on period selection
    const months = period === 12 || period === "Last 12 Months" ? 12 : 6;
    
    console.log('🔢 Converted period to months:', { period, months });
    
    // Show skeleton only for trend chart section
    setIsLoadingTrendingChart(true);
    
    try {
      if (!soldToID) {
        console.error('❌ Missing soldToID for trend fetch');
        return;
      }
      
      // Call the trend API with updated months parameter
      const { fetchEntitlementTrend } = await import('./actions');
      const trendResponse = await fetchEntitlementTrend(soldToID, months);
      
      if (trendResponse.error) {
        console.error('❌ Error fetching trend data:', trendResponse.error);
        setError(trendResponse.error);
      } else {
        console.log('✅ Trend data fetched successfully:', trendResponse.data);
        const trendData = processTrendData(trendResponse.data);
        setTrendingChartData(trendData);
      }
    } catch (error) {
      console.error('❌ Error in handleTrendingPeriodChange:', error);
      setError('Failed to fetch trend data');
    } finally {
      setIsLoadingTrendingChart(false);
    }
  }, [soldToID, processTrendData]);

  // Customer change handler - CSR with consolidated call (like azure-invoice)
  const handleCustomerChange = useCallback(async (event) => {
    const newCustomer = event.value;
    const customerValue = newCustomer?.value || newCustomer;
    
    console.log('🔄 Customer changed to:', customerValue);
    setSelectedCustomer(newCustomer);
    
    // Reset all other dropdowns to default when customer changes
    setFilterAzureSubscription([]);
    setFilterServiceName([]);
    setLastAppliedFilters({
      azureSubscription: [],
      serviceName: []
    });
    
    // Reset pagination states to first page when customer changes
    setDailyConsumptionDataState({ skip: 0, take: 20 });
    setAzureSubscriptionDataState({ skip: 0, take: 20 });
    
    if (!soldToID || !currentMonth) {
      console.error('❌ Missing required data for customer filter');
      return;
    }
    
    // Show loading states (exclude customer dropdown)
    flushSync(() => {
      setIsLoadingSummary(true);
      setIsLoadingCredits(true);
      setIsLoadingTotals(true);
      setIsLoadingGrid(true);
      setLoading(true);
    });
    
    try {
      // Build filter object - preserve navigation context filters
      const filters = {};
      
      // Customer filter
      if (customerValue && customerValue !== 'All') {
        filters.limittenantid = customerValue;
      }
      
      // Preserve product category from navigation context
      if (navigationContext?.label) {
        filters.productcategory = navigationContext.label;
      }
      
      // Preserve invoice number from navigation context
      if (navigationContext?.invoiceNumber) {
        filters.invoicenumber = navigationContext.invoiceNumber;
      }
      
      console.log('📡 CLIENT: Fetching consolidated data with filters:', filters);
      
      // Call consolidated API with all filters (CSR mode)
      const consolidatedResult = await fetchConsolidatedBilledConsumptionData(
        soldToID,
        currentMonth,
        filters
      );
      
      if (consolidatedResult.error) {
        throw new Error(consolidatedResult.error);
      }
      
      const consolidatedData = consolidatedResult.data;
      console.log('✅ CLIENT: Consolidated data received:', consolidatedData);
      
      // Update all state from the consolidated response
      setSpendTrendState(consolidatedData?.totalsResponse?.totalSpend || 0);
      setInvoiceCreditState(consolidatedData?.creditsResponse?.totalSpend || 0);
      setSummaryResponse(consolidatedData?.summaryResponse);
      setGridResponse(consolidatedData?.gridResponse);
      
      // Restore the original customer list (don't let filtered data overwrite it)
      if (originalCustomerNames.length > 1) {
        setCustomerNames(originalCustomerNames);
      }
      
      setIsLoadingSummary(false);
      setIsLoadingCredits(false);
      setIsLoadingTotals(false);
      setIsLoadingGrid(false);
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Customer filter error:', error);
      setError('Failed to load data for selected customer');
      
      // Restore the original customer list even on error
      if (originalCustomerNames.length > 1) {
        setCustomerNames(originalCustomerNames);
      }
      
      setIsLoadingSummary(false);
      setIsLoadingCredits(false);
      setIsLoadingTotals(false);
      setIsLoadingGrid(false);
      setLoading(false);
    }
  }, [soldToID, currentMonth, navigationContext, originalCustomerNames]);

  // Handle Daily Consumption grid pagination changes
  const handleDailyConsumptionDataStateChange = useCallback(async (event) => {
    const newDataState = event.dataState;
    
    // Force immediate state update to show loading indicator
    flushSync(() => {
      setDailyConsumptionDataState(newDataState);
      setIsLoadingDailyConsumption(true);
    });
    
    try {
      const consumptionMonth = getConsumptionMonth(currentMonth);
      const pageNumber = Math.floor(newDataState.skip / newDataState.take);
      
      // Build filters object
      const filters = {
        limittenantid: isReseller && selectedCustomer?.value !== 'All' ? selectedCustomer.value : 'All',
        consumptionMonth
      };
      
      // Preserve product category from navigation context
      if (navigationContext?.label) {
        filters.productcategory = navigationContext.label;
      }
      
      // Preserve invoice number from navigation context
      if (navigationContext?.invoiceNumber) {
        filters.invoicenumber = navigationContext.invoiceNumber;
      }
      
      // Add applied filters (entitlementid, metercategory)
      if (filterAzureSubscription.length > 0) {
        const entitlementIds = filterAzureSubscription
          .map(item => typeof item === 'object' ? item.value : item)
          .filter(val => val && val !== 'all')
          .join(',');
        if (entitlementIds) {
          filters.entitlementid = entitlementIds;
        }
      }
      
      if (filterServiceName.length > 0) {
        const meterCategories = filterServiceName
          .map(item => typeof item === 'object' ? item.value : item)
          .filter(val => val && val !== 'all')
          .join(',');
        if (meterCategories) {
          filters.metercategory = meterCategories;
        }
      }
      
      // Import action dynamically
      const { fetchDailyConsumptionGrid } = await import('./actions');
      const result = await fetchDailyConsumptionGrid(
        soldToID,
        currentMonth,
        filters,
        pageNumber,
        newDataState.take
      );
      
      if (result.error) {
        console.error('❌ Error loading page:', result.error);
        setError(`Failed to load page: ${result.error}`);
      } else {
        setGridResponse(result.data);
      }
    } catch (error) {
      console.error('❌ Error changing page:', error);
      setError(`Failed to load page: ${error.message}`);
    } finally {
      setIsLoadingDailyConsumption(false);
    }
  }, [currentMonth, soldToID, selectedCustomer, filterAzureSubscription, filterServiceName, isReseller, navigationContext]);
  
  // Handle Azure Subscription grid pagination changes
  const handleAzureSubscriptionDataStateChange = useCallback(async (event) => {
    const newDataState = event.dataState;
    
    // Force immediate state update to show loading indicator
    flushSync(() => {
      setAzureSubscriptionDataState(newDataState);
      setIsLoadingAzureSubscription(true);
    });
    
    try {
      const consumptionMonth = getConsumptionMonth(currentMonth);
      const pageNumber = Math.floor(newDataState.skip / newDataState.take);
      
      // Build filters object
      const filters = {
        limittenantid: isReseller && selectedCustomer?.value !== 'All' ? selectedCustomer.value : 'All',
        consumptionMonth
      };
      
      // Preserve product category from navigation context
      if (navigationContext?.label) {
        filters.productcategory = navigationContext.label;
      }
      
      // Preserve invoice number from navigation context
      if (navigationContext?.invoiceNumber) {
        filters.invoicenumber = navigationContext.invoiceNumber;
      }
      
      // Add Azure Subscription filter if applied
      if (selectedAzureSubscription.length > 0) {
        const entitlementIds = selectedAzureSubscription
          .map(item => typeof item === 'object' ? item.value : item)
          .filter(val => val && val !== 'all')
          .join(',');
        if (entitlementIds) {
          filters.entitlementid = entitlementIds;
        }
      }
      
      // Import action dynamically
      const { fetchAzureSubscriptionGrid } = await import('./actions');
      const result = await fetchAzureSubscriptionGrid(
        soldToID,
        currentMonth,
        filters,
        pageNumber,
        newDataState.take
      );
      
      if (result.error) {
        console.error('❌ Error loading page:', result.error);
        setError(`Failed to load page: ${result.error}`);
      } else {
        setSubscriptionGridData(result.data?.content || result.data || []);
      }
    } catch (error) {
      console.error('❌ Error changing page:', error);
      setError(`Failed to load page: ${error.message}`);
    } finally {
      setIsLoadingAzureSubscription(false);
    }
  }, [currentMonth, soldToID, selectedCustomer, selectedAzureSubscription, isReseller, navigationContext]);

  // Apply Filters handler (matching azure-invoice pattern)
  const handleApplyFilters = useCallback(async () => {
    if (!soldToID || !currentMonth) {
      console.error('❌ Missing required data for filter application');
      return;
    }
    
    console.log('🔄 Applying filters:', { filterAzureSubscription, filterServiceName });
    
    // Show loading states only for KPI cards, chart, and grid (keep dropdowns visible)
    flushSync(() => {
      setIsApplyingFilters(true);
    });
    
    try {
      // Build filters object
      const filters = {};
      
      // Preserve customer filter
      if (selectedCustomer?.value && selectedCustomer.value !== 'All') {
        filters.limittenantid = selectedCustomer.value;
      } else {
        filters.limittenantid = 'All';
      }
      
      // Preserve navigation context filters
      if (navigationContext?.label) {
        filters.productcategory = navigationContext.label;
      }
      if (navigationContext?.invoiceNumber) {
        filters.invoicenumber = navigationContext.invoiceNumber;
      }
      
      // Add dropdown filters
      if (filterAzureSubscription.length > 0) {
        filters.entitlementid = filterAzureSubscription.map(f => f.value).join(',');
      }
      if (filterServiceName.length > 0) {
        filters.metercategory = filterServiceName.map(f => f.value).join(',');
      }
      
      console.log('📡 CLIENT: Applying consolidated filters:', filters);
      
      // Call consolidated API with all filters
      const consolidatedResult = await fetchConsolidatedBilledConsumptionData(
        soldToID,
        currentMonth,
        filters
      );
      
      if (consolidatedResult.error) {
        throw new Error(consolidatedResult.error);
      }
      
      const consolidatedData = consolidatedResult.data;
      console.log('✅ CLIENT: Filtered data received:', consolidatedData);
      
      // Update all state from the consolidated response
      setSpendTrendState(consolidatedData?.totalsResponse?.totalSpend || 0);
      setInvoiceCreditState(consolidatedData?.creditsResponse?.totalSpend || 0);
      setSummaryResponse(consolidatedData?.summaryResponse);
      setGridResponse(consolidatedData?.gridResponse);
      
      // Process spend trend chart data
      if (consolidatedData?.summaryResponse?.spendTrend?.chartData) {
        const consumptionMonth = getConsumptionMonth(currentMonth);
        const year = consumptionMonth ? consumptionMonth.slice(0, 4) : null;
        console.log('📊 Chart date processing (filtered):', { invoiceMonth: currentMonth, consumptionMonth, year });
        const processedData = processData(consolidatedData.summaryResponse.spendTrend.chartData, year);
        setSpendTrendChartData(processedData);
      }
      
      // Update last applied filters
      setLastAppliedFilters({
        azureSubscription: filterAzureSubscription,
        serviceName: filterServiceName
      });
      
      // Reset pagination to first page after applying filters
      setDailyConsumptionDataState({ skip: 0, take: 20 });
      
      setIsApplyingFilters(false);
      
    } catch (error) {
      console.error('❌ Filter application error:', error);
      setError('Failed to apply filters');
      
      setIsApplyingFilters(false);
    }
  }, [soldToID, currentMonth, filterAzureSubscription, filterServiceName, selectedCustomer, navigationContext]);

  const isInvoiceCreditStateVisible = invoiceCreditState < 0;

  // Error display (matching azure-invoice pattern)
  if (error) {
    return (
      <div className="azure-billed-page">
        <div className="azure-billed-container">
          <div className="azure-billed-header">
            <h1 className="azure-billed-title">Azure Usage Details</h1>
          </div>
          <div className="azure-billed-no-data-message">
            <SvgIcon icon={infoCircleIcon} size="medium" />
            <span>Error loading Azure Usage Details: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  // No data available
  if (!loading && !initialData && !locationState.currentMonthLabel) {
    return (
      <div className="azure-billed-page">
        <div className="azure-billed-container">
          <div className="azure-billed-header">
            <h1 className="azure-billed-title">Azure Usage Details</h1>
          </div>
          <div className="azure-billed-no-data-message">
            <SvgIcon icon={infoCircleIcon} size="medium" />
            <span> Azure Usage Details data is not available</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IntlProvider locale={locale}>
      <div className="azure-billed-page">
        <div className="azure-billed-container">
          {/* Header Section - Breadcrumb and KPI cards in same row */}
          <div className="azure-billed-header">
            <div className="azure-billed-header-top">
              {/* Left: Breadcrumb */}
              <div className="azure-billed-breadcrumb">
                <Breadcrumb 
                  data={breadcrumbData} 
                  onItemSelect={handleBreadcrumbSelect} 
                />
              </div>
              
              {/* Right: KPI Cards */}
              <div className="kpi-cards">
                {/* Archera RI Reporting */}
                {(isLoadingSummary || isApplyingFilters) ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card archera-link">
                    <div className="kpi-label">
                      <Tooltip anchorElement="target" position="right">
                        <span title="Insight has partnered with Archera for this reporting. You can purchase Archera for free on buy.insight.com">
                          <ArcheraIcon className="archera-icon" />
                        </span>
                      </Tooltip>
                      Archera RI Reporting
                    </div>
                  </div>
                )}

                {/* Invoice Month */}
                {(isLoadingSummary || isApplyingFilters) ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card invoice-month">
                    <div className="kpi-label">Invoice Month</div>
                    <div className="kpi-value">{formatMonthDisplay(currentMonthLabel)}
                    </div>
                  </div>
                )}

                {/* Invoice Number */}
                {(isLoadingSummary || isApplyingFilters) ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card invoice-number">
                    <div className="kpi-label">Invoice Number</div>
                    <div className="kpi-value">{navigationContext?.invoiceNumber || 'N/A'}
                    </div>
                  </div>
                )}

                {/* Invoice Credits */}
                {(isLoadingCredits || isApplyingFilters) ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card invoice-credits">
                    <div className="kpi-label">
                      Invoice Credits
                      <Tooltip anchorElement="target" position="auto">
                        <SvgIcon 
                          icon={infoCircleIcon} 
                          size="small" 
                          className="info-icon" 
                          title="Credits provided by Microsoft apply to consumption month's prior to the one you are billed for this month. Please use the Charge Start and End dates to understand the consumption period for each credit line."
                        />
                      </Tooltip>
                    </div>
                    <div className="kpi-value invoice-credits">
                      {formatCurrency(invoiceCreditState)}
                    </div>
                  </div>
                )}

                {/* Azure Usage Total */}
                {(isLoadingTotals || isApplyingFilters) ? (
                  <div className="skeleton-kpi-wrapper">
                    <Skeleton className="skeleton-full-size" />
                  </div>
                ) : (
                  <div className="kpi-card azure-usage-total">
                    <div className="kpi-label">Azure Usage Total</div>
                    <div className="kpi-value azure-usage-total">
                      {formatCurrency(spendTrendState)}
                    </div>
                  </div>
                )}
              </div>
            </div>

        <div className="header-left">
          <h1 className="header-text-large">Azure Usage Details</h1>
        </div>

            {/* Header Bottom - Customer Dropdown */}
            <div className="azure-billed-header-bottom">
              {isReseller && (
                <div className="azure-billed-customer-selector">
                  {isLoadingCustomerDropdown ? (
                    <Skeleton className="skeleton-customer-label" />
                  ) : (
                    <label className="azure-billed-customer-label label-text-bold">Customer Name</label>
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
                      className="azure-billed-customer-dropdown"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabs Section */}
          <div className="azure-billed-tabs-section">
            {isLoadingGrid ? (
              <>
                <Skeleton className="skeleton-tabs" />
                <div className="azure-billed-tab-skeleton-content">
                  <Skeleton className="skeleton-table" style={{ height: '400px' }} />
                </div>
              </>
            ) : (
              <TabStrip 
                selected={selectedTab} 
                onSelect={handleTabSelect}
                className="azure-billed-tabstrip tabstrip"
              >
                <TabStripTab title="Daily Consumption">
                  <div className="azure-billed-tab-content">
                    {/* Filters Section - Inside Daily Consumption Tab */}
                    <div className="azure-invoice-filters-section">
                      <div className="dropdown-row">
                          <div className="dropdown-group">
                            <label className="label-text-bold">Azure Subscription</label>
                            <MultiSelect
                              data={filterOptions.azureSubscriptions}
                              textField="label"
                              dataItemKey="value"
                              value={filterAzureSubscription}
                              name="msAzureSubscription"
                              placeholder="All"
                              onChange={(e) => setFilterAzureSubscription(e.value)}
                              disabled={isApplyingFilters}
                            />
                          </div>
                          
                          <div className="dropdown-group">
                            <label className="label-text-bold">Service Name</label>
                            <MultiSelect
                              data={filterOptions.serviceNames}
                              textField="label"
                              dataItemKey="value"
                              value={filterServiceName}
                              name="msServiceName"
                              placeholder="All"
                              onChange={(e) => setFilterServiceName(e.value)}
                              disabled={isApplyingFilters}
                            />
                          </div>
                          
                          <div className="">
                            <button
                              className="apply-filters-btn"
                              onClick={handleApplyFilters}
                              disabled={isApplyFiltersDisabled || isApplyingFilters}
                            >
                              Apply Filters
                            </button>
                          </div>
                        </div>
                    </div>

                    {/* Daily Consumption by Service Name Chart */}
                    {isApplyingFilters ? (
                      <div className="azure-billed-chart-section">
                        <Skeleton style={{ height: '400px', marginBottom: '24px' }} />
                      </div>
                    ) : (
                      spendTrendChartData && spendTrendChartData.length > 0 && (
                        <div className="azure-billed-chart-section">
                        <Chart onRefresh={handleChartRefresh}>
                          <BasicGroupedChart
                            chartType="column"
                            title={t("common.dailyConsumptionByServiceName", "Daily Consumption by Service Name")}
                            subTitle=""
                            data={spendTrendChartData}
                            categoryField="group"
                            categoryTitle=""
                            categoryFormat="MMM dd"
                            valueField="value"
                            valueFormat="c2"
                            groupedByField="label"
                            legendPosition="bottom"
                            legendTitle=""
                            tooltipFormat="c2"
                            showLabels={false}
                            labelFormat="c2"
                            locale={locale}
                            stacked={true}
                          />
                        </Chart>
                      </div>
                    ))}

                    {/* Daily Consumption Grid */}
                    <div className="billable_item_grid">
                      {(() => {
                        // Prepare data structure for GridTable with pagination info
                        let processedData = null;
                        let totalElements = 0;
                        
                        if (gridResponse?.content && Array.isArray(gridResponse.content)) {
                          processedData = gridResponse.content;
                          totalElements = gridResponse.totalElements || gridResponse.content.length;
                        } else if (Array.isArray(gridResponse)) {
                          processedData = gridResponse;
                          totalElements = gridResponse.length;
                        }
                        
                        const gridData = {
                          data: processedData || [],
                          total: totalElements
                        };
                        
                        return processedData && processedData.length > 0 ? (
                          <GridTable
                            name="azureBilledConsumption"
                            data={gridData}
                            gridData={processedData}
                            columns={azureDailyConsumptionColumns(t)}
                            className="azure-billed-details-grid"
                            loading={isLoadingGrid || isApplyingFilters || isLoadingDailyConsumption}
                            tenantId={isReseller ? (selectedCustomer?.value !== 'All' ? selectedCustomer?.value : 'All') : null}
                            sortable={true}
                            page={0}
                            dataState={dailyConsumptionDataState}
                            dataStateChange={handleDailyConsumptionDataStateChange}
                            setWidth={(width) => width}
                          />
                        ) : (
                          <div className="no-data-message">
                            <p>No consumption data available for the selected period.</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </TabStripTab>
                
                {/* New Azure Subscription Tab */}
                <TabStripTab title="Azure Subscription Summary">
                  <div className="azure-billed-tab-content">
                    {isLoadingSubscriptionTab ? (
                      <>
                        {/* Filter Dropdown Skeleton */}
                        <Skeleton style={{ width: '100%', height: '100px', marginBottom: '24px' }} />
                        
                        {/* Charts Row Skeleton - Match actual chart heights including titles */}
                        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                          <Skeleton style={{ flex: 1, height: '450px' }} />
                          <Skeleton style={{ flex: 1, height: '500px' }} />
                        </div>
                        
                        {/* Grid Skeleton - Match actual grid height */}
                        <Skeleton style={{ width: '100%', height: '450px' }} />
                      </>
                    ) : (
                      <>
                        {/* Azure Subscription Dropdown Filter */}
                        <div className="azure-invoice-filters-section">
                          <div className="dropdown-row">
                            <div className="dropdown-group">
                              <label className="label-text-bold">Azure Subscription</label>
                              <MultiSelect
                                data={azureSubscriptionOptions}
                                textField="label"
                                dataItemKey="value"
                                value={selectedAzureSubscription}
                                onChange={(e) => setSelectedAzureSubscription(e.value)}
                                placeholder="All"
                              />
                            </div>
                            <div className="">
                              <button
                                className="apply-filters-btn"
                                onClick={() => loadAzureSubscriptionTabData()}
                                disabled={!selectedAzureSubscription || selectedAzureSubscription.length === 0}
                              >
                                Apply Filters
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Charts Row - Monthly Consumption and Trending in same row */}
                        <div className="invoices-charts-row" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                          {/* Monthly Consumption by Azure Subscription Chart */}
                          <div style={{ flex: 1 }}>
                            {subscriptionChartData && subscriptionChartData.length > 0 ? (
                              <div className="azure-billed-chart-section">
                                <Chart onRefresh={handleChartRefresh}>
                                  <BasicGroupedChart
                                    chartType="column"
                                    title="Monthly Consumption by Azure Subscription"
                                    subTitle=""
                                    data={subscriptionChartData}
                                    categoryField="label"
                                    valueField="value"
                                    useColors={true}
                                    categoryTitle=""
                                    showCategoryLabels={false}
                                    legendPosition="bottom"
                                    legendVisible={false}
                                    tooltipFormat="c2"
                                    showLabels={true}
                                    showCategoryInLabels={true}
                                    valueFormat="c2"
                                    labelFormat="c2"
                                  />
                                </Chart>
                              </div>
                            ) : (
                              <div className="azure-billed-chart-section">
                                <p className="chart-title">Monthly Consumption by Azure Subscription</p>
                                <div className="no-data-message">
                                  <p>No consumption data available.</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Trending Monthly Spend Chart */}
                          <div style={{ flex: 1 }}>
                            <div className="azure-billed-chart-section">
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
                              {isLoadingTrendingChart ? (
                                <Skeleton style={{ width: '100%', height: '450px' }} />
                              ) : (
                                trendingChartData && trendingChartData.length > 0 ? (
                                  <Chart 
                                    key={`${trendingChartType}-${trendingChartData.length}`}
                                    onRefresh={handleChartRefresh}
                                    seriesColors={getInsightThemeColors()}
                                  >
                                    <BasicGroupedChart
                                      chartType={trendingChartType}
                                      title=""
                                      subTitle=""
                                      data={trendingChartData}
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
                                      stacked={trendingChartType === 'column'}
                                    />
                                  </Chart>
                                ) : (
                                  <div className="no-data-message">
                                    <p>No trending data available.</p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Azure Subscription Grid */}
                        <div className="billable_item_grid">
                          {(() => {
                            const gridData = {
                              data: subscriptionGridData || [],
                              total: subscriptionGridData?.length || 0
                            };
                            
                            return subscriptionGridData && subscriptionGridData.length > 0 ? (
                              <GridTable
                                name="azureSubscription"
                                data={gridData}
                                gridData={subscriptionGridData}
                                columns={azureEntitlementSummaryColumns(t)}
                                className="azure-billed-details-grid"
                                loading={isLoadingSubscriptionTab || isLoadingAzureSubscription}
                                tenantId="All"
                                sortable={true}
                                page={0}
                                dataState={azureSubscriptionDataState}
                                dataStateChange={handleAzureSubscriptionDataStateChange}
                                setWidth={(width) => width}
                              />
                            ) : (
                              <div className="no-data-message">
                                <p>No subscription data available for the selected period.</p>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </TabStripTab>
              </TabStrip>
            )}
          </div>
        </div>
      </div>
    </IntlProvider>
  );
}
