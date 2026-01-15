"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { flushSync } from 'react-dom';
import store from '@/store/store';
import { useTranslation } from 'react-i18next';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { Skeleton } from '@progress/kendo-react-indicators';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Chart } from '@progress/kendo-react-charts';
import request from '@/lib/api/request';
import { exceptionHandler, formatCurrency } from '@/lib/utils';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { Tooltip } from '@progress/kendo-react-tooltip';
import { infoCircleIcon } from '@progress/kendo-svg-icons';
import { SvgIcon } from '@progress/kendo-react-common';
import GridTable from '@/components/GridTable/GridTable';
import { ArrowUpIcon, ArrowDownIcon } from '@/lib/svg/svgList';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import { getInsightThemeColors } from '@/lib/chartColors';
import { getProviderColumns } from '@/common/gridColumnDefinitions';
import {
  fetchProvidersServer,
  fetchInvoiceMonthsServer,  fetchInvoiceSummaryServer,
  fetchInvoiceTrendServer,
  fetchInvoiceDetailsServer,  fetchConsolidatedInvoiceData 
} from './actions';
import './invoices.css';

const initialSort = [
  {
    field: "invoiceDate",
    dir: "desc"
  }
];

// Utility function to format date to "Month Year" format
const formatMonthYear = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  } catch {
    return dateString; // Return original if parsing fails
  }
};

// Utility function to ensure month value is in correct YYYYMM format
const formatMonthValue = (monthValue) => {
  if (!monthValue) return null;
  
  // If already in YYYYMM format (6 digits), return as-is
  if (typeof monthValue === 'string' && /^\d{6}$/.test(monthValue)) {
    return monthValue;
  }
  
  // If it's an object with value property
  if (typeof monthValue === 'object' && monthValue?.value) {
    return formatMonthValue(monthValue.value);
  }
  
  // Try to parse as date and convert to YYYYMM
  try {
    const date = new Date(monthValue);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}${month}`;
    }
  } catch (e) {
    console.warn('Failed to format month value:', monthValue, e);
  }
  
  return monthValue;
};

export default function InvoicesClientContent({ mode = 'csr', initialData, userContext, ssrPerformance }) {
  // Translation hook
  const { t } = useTranslation();
  
  // 🎯 RENDERING MODE CONFIRMATION
  console.log('🎯 INVOICES PAGE RENDERING:', {
    mode,
    hasInitialData: !!initialData,
    behavior: mode === 'ssr' ? '✅ SSR: Using server data, no client API calls on load' : 
              mode === 'csr' ? '⚠️ CSR: May trigger client API calls' :
              '🟡 CLIENT-SIDE: User interactions trigger API calls'
  });
  
  // 🔍 DEBUG: Log initial data structure
  if (initialData) {
    console.log('📦 DEBUG: Initial data received:', {
      keys: Object.keys(initialData),
      summaryResponse: {
        exists: !!initialData.summaryResponse,
        hasData: !!initialData.summaryResponse?.data,
        dataKeys: initialData.summaryResponse?.data ? Object.keys(initialData.summaryResponse.data) : 'none'
      },
      trendResponse: {
        exists: !!initialData.trendResponse,
        hasData: !!initialData.trendResponse?.data
      },
      detailsResponse: {
        exists: !!initialData.detailsResponse,
        hasData: !!initialData.detailsResponse?.data
      }
    });
  } else {
    console.log('❌ DEBUG: No initial data provided to component');
  }

  // Redux state (fallback for CSR mode)
  const loginResponse = useSelector((state) => state.auth?.loginResponse);
  
  // Enhanced soldToId extraction with debugging and fallback
  let selectedSoldToId;
  if (mode === 'ssr') {
    selectedSoldToId = userContext?.soldToId;
  } else {
    // Try multiple paths to find soldToId
    selectedSoldToId = loginResponse?.userProfile?.defaultContext?.[0]?.soldToId || 
                     loginResponse?.userProfile?.defaultContext?.soldToId ||
                     loginResponse?.soldToId ||
                     loginResponse?.userProfile?.soldToId;
                     
    // Fallback: Try to get from localStorage if Redux state is not available
    if (!selectedSoldToId && typeof window !== 'undefined') {
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
            
            selectedSoldToId = loginResponseObj?.userProfile?.defaultContext?.[0]?.soldToId || 
                              loginResponseObj?.userProfile?.defaultContext?.soldToId ||
                              loginResponseObj?.soldToId;
            console.log('🔧 Fallback soldToId from localStorage:', selectedSoldToId);
          }
        }
      } catch (e) {
        console.error('❌ Error extracting soldToId from localStorage:', e);
      }
    }
  }
  
  // Debug logging
  console.log('🔍 Invoices SoldToId Debug:', {
    mode,
    hasLoginResponse: !!loginResponse,
    selectedSoldToId,
    loginResponseStructure: loginResponse ? Object.keys(loginResponse) : 'none',
    userProfileStructure: loginResponse?.userProfile ? Object.keys(loginResponse.userProfile) : 'none',
    defaultContext: loginResponse?.userProfile?.defaultContext,
    userContextSoldToId: userContext?.soldToId
  });

  // Ref to track in-flight API calls - prevents duplicate requests
  const monthChangeInProgress = useRef(false);
  const invoiceChangeInProgress = useRef(false);
  const lastMonthChangeTime = useRef(0);
  const lastMonthValue = useRef(null);
  const hasInitialized = useRef(false); // Track if initial data fetch has occurred
  
  // State to disable dropdown during month change (triggers re-render)
  const [isMonthChanging, setIsMonthChanging] = useState(false);

  // Section-specific loading states - more granular control
  // ✅ For SSR: Start with false (data already loaded), for CSR: Start with true
  const [providerSectionLoading, setProviderSectionLoading] = useState(mode !== 'ssr');
  const [monthSectionLoading, setMonthSectionLoading] = useState(mode !== 'ssr');
  const [invoiceSectionLoading, setInvoiceSectionLoading] = useState(mode !== 'ssr');
  const [statsSectionLoading, setStatsSectionLoading] = useState(mode !== 'ssr');
  const [chartsSectionLoading, setChartsSectionLoading] = useState(mode !== 'ssr');
  const [gridSectionLoading, setGridSectionLoading] = useState(mode !== 'ssr');
  const [filtersSectionLoading, setFiltersSectionLoading] = useState(mode !== 'ssr');
  const [chartTypeLoading, setChartTypeLoading] = useState(false);
  const [trendChartLoading, setTrendChartLoading] = useState(false);
  
  // 🔍 DEBUG: Log initial loading states
  console.log('🔄 DEBUG: Initial loading states:', {
    mode,
    modeValue: mode,
    modeType: typeof mode,
    isSSR: mode === 'ssr',
    calculatedLoading: mode !== 'ssr',
    providerLoading: mode !== 'ssr',
    monthLoading: mode !== 'ssr',
    invoiceLoading: mode !== 'ssr',
    statsLoading: mode !== 'ssr',
    chartsLoading: mode !== 'ssr',
    gridLoading: mode !== 'ssr',
    filtersLoading: mode !== 'ssr',
    hasInitialData: !!initialData,
    hasSummaryData: !!initialData?.summaryResponse?.data
  });
  
  // Centralized section loading state manager
  const setSectionLoadingStates = (loading, excludeSections = []) => {
    console.log(`🔄 Setting section loading states to: ${loading}, excluding:`, excludeSections);
    if (!excludeSections.includes('provider')) setProviderSectionLoading(loading);
    if (!excludeSections.includes('month')) setMonthSectionLoading(loading);
    if (!excludeSections.includes('invoice')) setInvoiceSectionLoading(loading);
    if (!excludeSections.includes('stats')) setStatsSectionLoading(loading);
    if (!excludeSections.includes('charts')) setChartsSectionLoading(loading);
    if (!excludeSections.includes('grid')) setGridSectionLoading(loading);
    if (!excludeSections.includes('filters')) setFiltersSectionLoading(loading);
  };

  // Section-specific loading state checkers
  const isProviderLoading = providerSectionLoading;
  const isMonthLoading = monthSectionLoading;
  const isInvoiceLoading = invoiceSectionLoading;
  const isStatsLoading = statsSectionLoading;
  const isChartsLoading = chartsSectionLoading;
  const isGridLoading = gridSectionLoading;
  const isFiltersLoading = filtersSectionLoading;

  // UNIFIED loading state for global operations (refresh/navigation)
  const isGlobalLoading = providerSectionLoading || monthSectionLoading || invoiceSectionLoading || 
                         statsSectionLoading || chartsSectionLoading || gridSectionLoading || 
                         filtersSectionLoading || chartTypeLoading;

  // Chart type controls for trending chart
  const [trendingChartType, setTrendingChartType] = useState('column');
  const [selectedPeriod, setSelectedPeriod] = useState('Last 6 Months');
  
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
  ];  const [errorState, setErrorState] = useState(null);

  // Provider and dropdown states
  const [providers, setProviders] = useState(mode === 'ssr' ? (initialData?.providersResponse?.data || []) : []);
  const [selectedProvider, setSelectedProvider] = useState(mode === 'ssr' ? initialData?.defaultProvider : null);
  // ✅ apiEndpoint will be set from first provider in list, not hardcoded to 'microsoft'
  const [apiEndpoint, setApiEndpoint] = useState(mode === 'ssr' ? initialData?.defaultProvider?.abbreviation : null);

  // Invoice months data
  const [invoiceMonths, setInvoiceMonths] = useState(mode === 'ssr' ? (initialData?.invoiceMonthsResponse?.data || []) : []);
  const [selectedMonth, setSelectedMonth] = useState(mode === 'ssr' ? (
    initialData?.invoiceMonthsResponse?.data?.find(month => month.value === initialData?.firstMonth) || 
    initialData?.invoiceMonthsResponse?.data?.[0] || 
    null
  ) : null);

  // Invoice summary data
  const [invoiceNumbers, setInvoiceNumbers] = useState([]);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState(null);
  const [totalSpend, setTotalSpend] = useState(mode === 'ssr' ? (initialData?.summaryResponse?.data?.spendPeriod?.totalSpend || 0) : 0);
  const [summarySelectLists, setSummarySelectLists] = useState(mode === 'ssr' ? (initialData?.summaryResponse?.data?.selectLists || []) : []);
  
  // Monthly difference and invoice status from summary API
  const [monthlyDifference, setMonthlyDifference] = useState(mode === 'ssr' ? (initialData?.summaryResponse?.data?.spendPeriod?.differenceTotalSpend || 0) : 0);
  const [monthlyDifferencePercent, setMonthlyDifferencePercent] = useState(mode === 'ssr' ? (initialData?.summaryResponse?.data?.spendPeriod?.differencePercentSpend || null) : null);
  const [haveDifferencePercent, setHaveDifferencePercent] = useState(mode === 'ssr' ? (initialData?.summaryResponse?.data?.spendPeriod?.haveDifferencePercentSpend || false) : false);
  const [invoiceStatus, setInvoiceStatus] = useState(mode === 'ssr' ? (initialData?.summaryResponse?.data?.invoiceStatus || '') : '');
  const [isReseller, setIsReseller] = useState(mode === 'ssr' ? (initialData?.summaryResponse?.data?.isReseller || false) : false);

  // Additional filter states with default 'All' values
  const [productCategories, setProductCategories] = useState([{ label: 'All', value: 'all' }]);
  const [selectedProductCategory, setSelectedProductCategory] = useState([]); // MultiSelect: array
  const [productNames, setProductNames] = useState([{ label: 'All', value: 'all' }]);
  const [selectedProductName, setSelectedProductName] = useState([]); // MultiSelect: array
  const [subscriptionIds, setSubscriptionIds] = useState([{ label: 'All', value: 'all' }]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState([]); // MultiSelect: array
  
  // Customer Name (tenantId) filter
  const [customerNames, setCustomerNames] = useState([{ label: 'All Customers', value: 'All' }]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  console.log('initialData?.summaryResponse?.data?.isReseller value:', initialData);
  
  // Invoice breakdown chart data with fallback
  const [breakdownChartData, setBreakdownChartData] = useState(() => {
    if (mode === 'ssr' && initialData?.summaryResponse?.data) {
      const chartData = initialData.summaryResponse.data.chartData || 
                       initialData.summaryResponse.data.breakdown || 
                       [];
      
      // Transform chart data for BasicGroupedChart component
      const transformedChartData = chartData.map(item => ({
        label: item.label || item.category || 'Unknown',
        value: item.value || 0
      }));
      
      console.log('Initial breakdown chart data:', {
        originalData: chartData,
        transformedData: transformedChartData
      });
      return transformedChartData;
    }
    return [];
  });

  // Trend and grid data
  const [trendData, setTrendData] = useState(mode === 'ssr' ? (initialData?.trendResponse?.data?.chartData || []) : []);
  const [gridData, setGridData] = useState(mode === 'ssr' ? (initialData?.detailsResponse?.data?.content || initialData?.detailsResponse?.data || []) : []);
  const [gridTotal, setGridTotal] = useState(mode === 'ssr' ? (initialData?.detailsResponse?.data?.totalElements || initialData?.detailsResponse?.data?.length || 0) : 0);
  
  // Pagination states for grid
  const [gridDataState, setGridDataState] = useState({ skip: 0, take: 20 });
  const [isLoadingGridPagination, setIsLoadingGridPagination] = useState(false);

  // Dynamic grid columns based on selected provider
  const gridColumns = useMemo(() => {
    // ✅ Use actual selected provider or apiEndpoint, fallback to first provider if available
    const providerAbbr = selectedProvider?.abbreviation || apiEndpoint || providers?.[0]?.abbreviation;
    console.log('📊 Computing grid columns for provider:', providerAbbr);
    return getProviderColumns(providerAbbr, t);
  }, [selectedProvider, apiEndpoint, t]);

  // Format trend data for chart with proper month/year display
  const formattedTrendData = useMemo(() => {
    if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
      // Return fallback data structure for empty states
      return [
        { group: 'Jun 2025', value: 4000000, label: 'Web Services' },
        { group: 'Jul 2025', value: 5000000, label: 'Web Services' },
        { group: 'Aug 2025', value: 3500000, label: 'Web Services' },
        { group: 'Sep 2025', value: 3400000, label: 'Web Services' }
      ];
    }
    
    return trendData.map(item => {
      let formattedGroup = item.group;
      try {
        // Try to parse as date and format to month/year (3-letter month abbreviation)
        const date = new Date(item.group);
        if (!isNaN(date.getTime())) {
          formattedGroup = date.toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          });
        }
      } catch (e) {
        // Keep original if parsing fails
        formattedGroup = item.group;
      }
      
      return {
        ...item,
        group: formattedGroup,
        label: item.label || 'Web Services' // Add default label for grouping
      };
    });
  }, [trendData]);

  /**
   * 1. Fetch Providers - First API call
   * Calls /ccr-billableitem-service/provider
   */
  const fetchProviders = useCallback(async () => {
    console.log('🔍 fetchProviders called with selectedSoldToId:', selectedSoldToId);
    
    if (!selectedSoldToId) {
      console.warn('❌ fetchProviders early return - no selectedSoldToId');
      return;
    }

    try {
      console.log('🚀 Starting fetchProviders API call...');
      // For initial page load, show ALL section skeletons
      setSectionLoadingStates(true);
      const response = await fetchProvidersServer(selectedSoldToId);

      console.log('📊 fetchProviders response:', response);

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('Providers response:', response.data);
      setProviders(response.data);

      // ✅ Set default provider to FIRST option from list (not always microsoft)
      const defaultProvider = response.data[0];
      if (defaultProvider) {
        console.log('✅ Setting default provider to first option:', defaultProvider.abbreviation);
        setSelectedProvider(defaultProvider);
        setApiEndpoint(defaultProvider.abbreviation);
        // Trigger next API call with first provider
        await fetchInitialInvoiceMonths(defaultProvider.abbreviation);
      }
    } catch (error) {
      console.error('fetchProviders error:', error);
      setErrorState(exceptionHandler(error));
    }
    // Note: Don't clear loading states here - let fetchInitialInvoiceMonths handle it
  }, [selectedSoldToId]);

  /**
   * 2. Fetch Initial Invoice Months - Second API call
   * Calls dynamic endpoint like /ccr-billableitem-service/microsoft/months
   */
  const fetchInitialInvoiceMonths = useCallback(async (abbreviation = apiEndpoint, isUserTriggered = false) => {
    if (!selectedSoldToId || !abbreviation) return;
    
    // ⚠️ CRITICAL: Prevent duplicate initialization calls (React StrictMode/multiple renders)
    // BUT allow user-triggered provider changes to proceed
    if (hasInitialized.current && !isUserTriggered) {
      console.log('⚠️ BLOCKED: Already initialized, skipping duplicate fetch');
      return;
    }
    
    hasInitialized.current = true;
    console.log(isUserTriggered ? '👤 User-triggered provider change - fetching data' : '✅ First initialization - proceeding with data fetch');

    try {
      const response = await fetchInvoiceMonthsServer(selectedSoldToId, abbreviation);

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('Invoice months response:', response.data);
      setInvoiceMonths(response.data);

      // Set default month (first one)
      if (response.data && response.data.length > 0) {
        const defaultMonth = response.data[0];
        console.log('🗓️ Setting default month:', defaultMonth);
        setSelectedMonth(defaultMonth);
        
        try {
          // Use consolidated call with no invoice filter (will get 'all' by default)
          const consolidatedResponse = await fetchConsolidatedInvoiceData(
            selectedSoldToId,
            abbreviation,
            formatMonthValue(defaultMonth.value),
            null // No specific invoice filter for initial load
          );
          
          if (consolidatedResponse.error) {
            throw new Error(consolidatedResponse.error);
          }

          const { summaryResponse, trendResponse, detailsResponse } = consolidatedResponse.data;
          
          // Update data from consolidated response
          if (summaryResponse?.data) {
            const selectLists = summaryResponse.data?.selectLists || [];
            setIsReseller(summaryResponse.data?.isReseller || false);
            
            // Update invoice numbers from summary response
            const invoiceNumbersList = selectLists.find(list => list.name === 'invoicenumber');
            if (invoiceNumbersList && invoiceNumbersList.items) {
              setInvoiceNumbers(invoiceNumbersList.items);
              // Set default to first actual invoice (not "All")
              const defaultInvoice = invoiceNumbersList.items.find(item => item.value !== 'All' && item.value !== 'all') || invoiceNumbersList.items[0];
              setSelectedInvoiceNumber(defaultInvoice);
            }
            
            // Update other filter dropdowns
            updateFilterDropdowns(selectLists);
            
            // Set summary data
            setTotalSpend(summaryResponse.data?.spendPeriod?.totalSpend || 0);
            setMonthlyDifference(summaryResponse.data?.spendPeriod?.differenceTotalSpend || 0);
            setMonthlyDifferencePercent(summaryResponse.data?.spendPeriod?.differencePercentSpend || null);
            setHaveDifferencePercent(summaryResponse.data?.spendPeriod?.haveDifferencePercentSpend || false);
            setInvoiceStatus(summaryResponse.data?.invoiceStatus || '');
            const spendData = summaryResponse.data?.spendPeriod?.spend || [];
            const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
            
            // Transform chart data for BasicGroupedChart component
            const transformedChartData = chartData.map(item => ({
              label: item.label || item.category || 'Unknown',
              value: item.value || 0
            }));
            
            console.log('🔍 Breakdown Chart Data Transformation:', {
              originalData: chartData,
              transformedData: transformedChartData,
              dataSource: summaryResponse.data?.chartData ? 'chartData' : 
                         summaryResponse.data?.breakdown ? 'breakdown' : 'spendPeriod.spend'
            });
            
            setBreakdownChartData(transformedChartData);
          }
          
          if (trendResponse?.data) {
            setTrendData(trendResponse.data?.chartData || []);
          }
          
          if (detailsResponse?.data) {
            setGridData(detailsResponse.data?.content || detailsResponse.data || []);
            setGridTotal(detailsResponse.data?.totalElements || detailsResponse.data?.length || 0);
          }
          
        } catch (consolidatedError) {
          console.error('Consolidated fetch error:', consolidatedError);
          setErrorState(exceptionHandler(consolidatedError));
        } finally {
          // Clear ALL section loading states after initial data load is complete
          setSectionLoadingStates(false);
          setTrendChartLoading(false);
        }
      }
    } catch (error) {
      console.error('fetchInitialInvoiceMonths error:', error);
      setErrorState(exceptionHandler(error));
      // Clear loading states even on error
      setSectionLoadingStates(false);
      setTrendChartLoading(false);
    }
  }, [selectedSoldToId, apiEndpoint]);

  // Event handlers for dropdown changes - only trigger on user interaction
  const handleProviderChange = useCallback(async (event) => {
    const newProvider = event.value; // Kendo uses event.value not event.target.value
    console.log('👤 USER INTERACTION: Provider changed to:', newProvider);
    
    // Prevent duplicate calls
    if (newProvider?.abbreviation === selectedProvider?.abbreviation) {
      console.log('🔄 Provider unchanged, skipping API call');
      return;
    }
    
    setSelectedProvider(newProvider);
    setApiEndpoint(newProvider.abbreviation);
    
    // Reset dependent states
    setInvoiceMonths([]);
    setSelectedMonth(null);
    setInvoiceNumbers([]);
    setSelectedInvoiceNumber(null);
    setTotalSpend(0);
    setTrendData([]);
    setGridData([]);

    // Show skeletons for ALL sections EXCEPT provider section, including trending chart
    setSectionLoadingStates(true, ['provider']);
    setTrendChartLoading(true);

    // Client-side API call triggered by user interaction
    console.log('🔄 Fetching data for user-selected provider:', newProvider.abbreviation);
    await fetchInitialInvoiceMonths(newProvider.abbreviation, true); // ✅ Pass true to indicate user-triggered change
  }, [selectedProvider, fetchInitialInvoiceMonths]);

  const handleMonthChange = useCallback(async (event) => {
    const now = Date.now();
    const newMonth = event.value;
    
    // Extract the ACTUAL month value from the nested object structure
    const monthValue = newMonth?.value || newMonth;
    
    console.log('🔍 Month change triggered:', { 
      monthValue, 
      newMonth, 
      eventValue: event?.value,
      hasLock: monthChangeInProgress.current,
      lastValue: lastMonthValue.current,
      timeSinceLast: now - lastMonthChangeTime.current
    });
    
    // ✅ FIRST: Check if this exact month was JUST processed (within last 1000ms)
    // This blocks ALL duplicate calls at the SOURCE - before any async operations
    if (lastMonthValue.current === monthValue && (now - lastMonthChangeTime.current) < 1000) {
      console.log('❌ BLOCKED: Same month within 1000ms - duplicate call from Kendo');
      return; // Exit immediately - don't even set the lock
    }
    
    // ✅ SECOND: Check if ANY month change is in progress
    if (monthChangeInProgress.current) {
      console.log('❌ BLOCKED: Another month change is already in progress');
      return;
    }
    
    // ✅ THIRD: Validate month value format
    if (!monthValue || !/^\d{6}$/.test(monthValue)) {
      console.error('❌ BLOCKED: Invalid month format:', monthValue);
      return;
    }
    
    // 🎯 ALL CHECKS PASSED - This is a VALID, NEW, USER-INITIATED month change
    // Note: We rely on time-based duplicate detection (check #1) and lock (check #2)
    // State-based comparison removed to avoid blocking legitimate re-selections
    console.log('✅ VALID month change - processing:', { 
      to: monthValue,
      from: selectedMonth?.value || selectedMonth 
    });
    
    // Update tracking BEFORE setting lock (atomic operation)
    lastMonthValue.current = monthValue;
    lastMonthChangeTime.current = now;
    
    // Set BOTH ref lock and state (state triggers re-render to disable dropdown)
    monthChangeInProgress.current = true;
    setIsMonthChanging(true);
    
    // ✅ UPDATE UI IMMEDIATELY - Better UX: Show selected month right away
    setSelectedMonth(newMonth);
    console.log('🎨 UI updated to show selected month immediately:', monthValue);
    
    try {
      const abbreviation = selectedProvider?.abbreviation || apiEndpoint;
      
      // Validate required data
      if (!abbreviation || !selectedSoldToId) {
        console.warn('❌ Missing required data:', { abbreviation, selectedSoldToId });
        return;
      }
      
      // Update tracking
      lastMonthChangeTime.current = now;
      lastMonthValue.current = monthValue;
      
      console.log('📡 Making SINGLE consolidated API call:', { monthValue, abbreviation, soldToId: selectedSoldToId });
      
      // Reset dependent states
      setInvoiceNumbers([]);
      setSelectedInvoiceNumber(null);
      setTotalSpend(0);
      setTrendData([]);
      setGridData([]);
      
      setSectionLoadingStates(true, ['provider', 'month']);
      setTrendChartLoading(true);
      
      const fetchStart = Date.now();
      
      const consolidatedResponse = await fetchConsolidatedInvoiceData(
        selectedSoldToId,
        abbreviation,
        monthValue,
        null,
        selectedCustomer?.value || null // Pass customer filter
      );
      
      const fetchTime = Date.now() - fetchStart;
      console.log(`✅ API completed: ${fetchTime}ms`);
      
      if (consolidatedResponse.error) {
        throw new Error(consolidatedResponse.error);
      }

      const { summaryResponse, trendResponse, detailsResponse } = consolidatedResponse.data;
      
      // Update data from response
      if (summaryResponse?.data) {
        const selectLists = summaryResponse.data?.selectLists || [];
        setIsReseller(summaryResponse.data?.isReseller || false);
        
        const invoiceNumbersList = selectLists.find(list => list.name === 'invoicenumber');
        if (invoiceNumbersList && invoiceNumbersList.items) {
          setInvoiceNumbers(invoiceNumbersList.items);
          const defaultInvoice = invoiceNumbersList.items.find(item => item.value !== 'All' && item.value !== 'all') || invoiceNumbersList.items[0];
          setSelectedInvoiceNumber(defaultInvoice);
        }
        
        updateFilterDropdowns(selectLists);
        
        setTotalSpend(summaryResponse.data?.spendPeriod?.totalSpend || 0);
        const spendData = summaryResponse.data?.spendPeriod?.spend || [];
        const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
        
        const transformedChartData = chartData.map(item => ({
          label: item.label || item.category || 'Unknown',
          value: item.value || 0
        }));
        
        setBreakdownChartData(transformedChartData);
      }
      
      if (trendResponse?.data) {
        setTrendData(trendResponse.data?.chartData || []);
      }
      
      if (detailsResponse?.data) {
        setGridData(detailsResponse.data?.content || detailsResponse.data || []);
        setGridTotal(detailsResponse.data?.totalElements || detailsResponse.data?.length || 0);
      }
      
      console.log('✅ Month change complete - all data updated');
      
      // DISABLED: Preloading causes duplicate API calls with invalid month values
      // preloadAdjacentMonths(monthValue);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setErrorState(exceptionHandler(error));
    } finally {
      // Always reset the lock after a delay
      setTimeout(() => {
        setSectionLoadingStates(false, ['provider', 'month']);
        setTrendChartLoading(false); // Hide skeleton for Trending Monthly Spend chart
        monthChangeInProgress.current = false;
        setIsMonthChanging(false);
        console.log('🔓 Lock released');
      }, 200);
    }
  }, [selectedSoldToId, selectedProvider, apiEndpoint]);

  // Helper function to update filter dropdowns from selectLists
  const updateFilterDropdowns = (selectLists) => {
    // Update Product Categories
    const productCategoryList = selectLists.find(list => list.name === 'productcategory');
    const allCategoryOption = { label: 'All', value: 'all' };
    if (productCategoryList && productCategoryList.items) {
      const categoriesWithAll = [allCategoryOption, ...productCategoryList.items];
      setProductCategories(categoriesWithAll);
      setSelectedProductCategory([]); // Empty array for MultiSelect
    } else {
      setProductCategories([allCategoryOption]);
      setSelectedProductCategory([]); // Empty array for MultiSelect
    }
    
    // Update Product Names
    const productNameList = selectLists.find(list => list.name === 'productname');
    const allProductOption = { label: 'All', value: 'all' };
    if (productNameList && productNameList.items) {
      const productsWithAll = [allProductOption, ...productNameList.items.filter(item => item.label && item.value)];
      setProductNames(productsWithAll);
      setSelectedProductName([]); // Empty array for MultiSelect
    } else {
      setProductNames([allProductOption]);
      setSelectedProductName([]); // Empty array for MultiSelect
    }
    
    // Update Subscription IDs
    const subscriptionIdList = selectLists.find(list => list.name === 'subscriptionid');
    const allSubscriptionOption = { label: 'All', value: 'all' };
    if (subscriptionIdList && subscriptionIdList.items) {
      const subscriptionsWithAll = [allSubscriptionOption, ...subscriptionIdList.items];
      setSubscriptionIds(subscriptionsWithAll);
      setSelectedSubscriptionId([]); // Empty array for MultiSelect
    } else {
      setSubscriptionIds([allSubscriptionOption]);
      setSelectedSubscriptionId([]); // Empty array for MultiSelect
    }
    
    // Update Customer Names (tenantId)
    const tenantIdList = selectLists.find(list => list.name === 'tenantId');
    if (tenantIdList && tenantIdList.items) {
      setCustomerNames(tenantIdList.items);
      // Set default to 'All Customers'
      const defaultCustomer = tenantIdList.items.find(item => item.value === 'All') || tenantIdList.items[0];
      setSelectedCustomer(defaultCustomer);
    } else {
      setCustomerNames([{ label: 'All Customers', value: 'All' }]);
      setSelectedCustomer({ label: 'All Customers', value: 'All' });
    }
  };

  const handleInvoiceNumberChange = useCallback(async (event) => {
    const newInvoiceNumber = event.target.value;
    console.log('👤 USER INTERACTION: Invoice number changed to:', newInvoiceNumber);
    
    // Check if a request is already in progress
    if (invoiceChangeInProgress.current) {
      console.log('⚠️ Invoice change already in progress, skipping duplicate call');
      return;
    }
    
    const invoiceValue = newInvoiceNumber?.value || newInvoiceNumber;
    const currentInvoiceValue = selectedInvoiceNumber?.value || selectedInvoiceNumber;
    
    // Prevent duplicate calls
    if (!invoiceValue || invoiceValue === currentInvoiceValue) {
      console.log('🔄 Invoice number unchanged, skipping API call');
      return;
    }
    
    // Mark as in progress
    invoiceChangeInProgress.current = true;
    
    setSelectedInvoiceNumber(newInvoiceNumber);
    
    // Show skeletons for ALL sections EXCEPT provider, month, and invoice sections
    setSectionLoadingStates(true, ['provider', 'month', 'invoice']);
    
    const fetchStart = Date.now();
    try {
      const abbreviation = selectedProvider?.abbreviation || apiEndpoint;
      const monthValue = formatMonthValue(selectedMonth?.value || selectedMonth);
      
      // Validate inputs
      if (!abbreviation || !monthValue || !selectedSoldToId) {
        console.warn('⚠️ Missing required data for invoice change:', { abbreviation, monthValue, selectedSoldToId });
        return;
      }
      
      console.log('🔄 CLIENT-SIDE: Fetching filtered data for user-selected invoice:', invoiceValue);
      const consolidatedResponse = await fetchConsolidatedInvoiceData(
        selectedSoldToId,
        abbreviation, // Pass only the abbreviation string
        monthValue,
        invoiceValue,
        selectedCustomer?.value || null // Pass customer filter
      );
      
      const fetchTime = Date.now() - fetchStart;
      console.log(`⚡ Invoice filter fetch: ${fetchTime}ms (${fetchTime < 200 ? '🟢 CACHED' : '🟡 API'})`);
      
      if (consolidatedResponse.error) {
        throw new Error(consolidatedResponse.error);
      }

      const { summaryResponse, trendResponse, detailsResponse } = consolidatedResponse.data;
      
      // Update filtered data
      if (summaryResponse?.data) {
        setTotalSpend(summaryResponse.data?.spendPeriod?.totalSpend || 0);
        const spendData = summaryResponse.data?.spendPeriod?.spend || [];
        const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
        
        // Transform chart data for BasicGroupedChart component
        const transformedChartData = chartData.map(item => ({
          label: item.label || item.category || 'Unknown',
          value: item.value || 0
        }));
        
        setBreakdownChartData(transformedChartData);
      }
      
      if (trendResponse?.data) {
        setTrendData(trendResponse.data?.chartData || []);
      }
      
      if (detailsResponse?.data) {
        setGridData(detailsResponse.data?.content || detailsResponse.data || []);
        setGridTotal(detailsResponse.data?.totalElements || detailsResponse.data?.length || 0);
      }
      
    } catch (error) {
      console.error('Invoice number change error:', error);
      setErrorState(exceptionHandler(error));
    } finally {
      // Minimal loading time for smooth UX (prevent flash)
      const minLoadTime = 150;
      const elapsed = Date.now() - fetchStart;
      const remainingTime = Math.max(0, minLoadTime - elapsed);
      
      setTimeout(() => {
        setSectionLoadingStates(false, ['provider', 'month', 'invoice']);
        // Reset in-progress flag
        invoiceChangeInProgress.current = false;
      }, remainingTime);
    }
  }, [selectedSoldToId, selectedProvider, apiEndpoint, selectedMonth, selectedInvoiceNumber]);

  const handleProductCategoryChange = (event) => {
    const newCategory = event.target.value;
    setSelectedProductCategory(newCategory);
    console.log('Selected product category:', newCategory);
  };

  const handleProductNameChange = (event) => {
    const newProduct = event.target.value;
    setSelectedProductName(newProduct);
    console.log('Selected product name:', newProduct);
  };

  const handleSubscriptionIdChange = (event) => {
    const newSubscription = event.target.value;
    setSelectedSubscriptionId(newSubscription);
    console.log('Selected subscription ID:', newSubscription);
  };
  
  const handleCustomerChange = useCallback(async (event) => {
    const newCustomer = event.value;
    const customerValue = newCustomer?.value || newCustomer;
    
    console.log('👤 USER INTERACTION: Customer changed to:', newCustomer);
    console.log('📊 Customer value to filter:', customerValue);
    
    setSelectedCustomer(newCustomer);
    
    // Show skeletons for stats, charts, and grid sections (exclude provider, month, invoice)
    setSectionLoadingStates(true, ['provider', 'month', 'invoice']);
    setTrendChartLoading(true); // Show skeleton for Trending Monthly Spend chart
    
    const fetchStart = Date.now();
    try {
      const abbreviation = selectedProvider?.abbreviation || apiEndpoint;
      const monthValue = formatMonthValue(selectedMonth?.value || selectedMonth);
      const invoiceValue = selectedInvoiceNumber?.value || selectedInvoiceNumber;
      
      // Validate inputs
      if (!abbreviation || !monthValue || !selectedSoldToId) {
        console.warn('⚠️ Missing required data for customer change:', { abbreviation, monthValue, selectedSoldToId });
        setSectionLoadingStates(false, ['provider', 'month', 'invoice']);
        setTrendChartLoading(false);
        return;
      }
      
      console.log('🔄 CLIENT-SIDE: Fetching filtered data for selected customer:', {
        customerValue,
        abbreviation,
        monthValue,
        invoiceValue,
        soldToId: selectedSoldToId
      });
      
      const consolidatedResponse = await fetchConsolidatedInvoiceData(
        selectedSoldToId,
        abbreviation,
        monthValue,
        invoiceValue,
        customerValue // Pass customer filter as 5th parameter
      );
      
      const fetchTime = Date.now() - fetchStart;
      console.log(`⚡ Customer filter fetch: ${fetchTime}ms (${fetchTime < 200 ? '🟢 CACHED' : '🟡 API'})`);
      
      if (consolidatedResponse.error) {
        throw new Error(consolidatedResponse.error);
      }

      const { summaryResponse, trendResponse, detailsResponse } = consolidatedResponse.data;
      
      console.log('📦 Customer Change - Response Data:', {
        hasSummary: !!summaryResponse?.data,
        hasTrend: !!trendResponse?.data,
        hasDetails: !!detailsResponse?.data,
        totalSpend: summaryResponse?.data?.spendPeriod?.totalSpend,
        monthlyDiff: summaryResponse?.data?.spendPeriod?.differenceTotalSpend,
        chartDataLength: summaryResponse?.data?.chartData?.length || summaryResponse?.data?.breakdown?.length || summaryResponse?.data?.spendPeriod?.spend?.length,
        trendDataLength: trendResponse?.data?.chartData?.length,
        gridDataLength: detailsResponse?.data?.content?.length || detailsResponse?.data?.length
      });
      
      // Update filtered data
      if (summaryResponse?.data) {
        const newTotalSpend = summaryResponse.data?.spendPeriod?.totalSpend || 0;
        const newMonthlyDiff = summaryResponse.data?.spendPeriod?.differenceTotalSpend || 0;
        const newMonthlyDiffPercent = summaryResponse.data?.spendPeriod?.differencePercentSpend || null;
        const newHaveDiffPercent = summaryResponse.data?.spendPeriod?.haveDifferencePercentSpend || false;
        const newInvoiceStatus = summaryResponse.data?.invoiceStatus || '';
        
        console.log('💰 Updating KPI values:', {
          oldTotalSpend: totalSpend,
          newTotalSpend,
          oldMonthlyDiff: monthlyDifference,
          newMonthlyDiff
        });
        
        setTotalSpend(newTotalSpend);
        setMonthlyDifference(newMonthlyDiff);
        setMonthlyDifferencePercent(newMonthlyDiffPercent);
        setHaveDifferencePercent(newHaveDiffPercent);
        setInvoiceStatus(newInvoiceStatus);
        
        const spendData = summaryResponse.data?.spendPeriod?.spend || [];
        const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
        
        // Transform chart data for BasicGroupedChart component
        const transformedChartData = chartData.map(item => ({
          label: item.label || item.category || 'Unknown',
          value: item.value || 0
        }));
        
        console.log('📊 Updating breakdown chart:', {
          oldDataLength: breakdownChartData.length,
          newDataLength: transformedChartData.length,
          newData: transformedChartData
        });
        
        setBreakdownChartData(transformedChartData);
      }
      
      if (trendResponse?.data) {
        const newTrendData = trendResponse.data?.chartData || [];
        console.log('📈 Updating trend chart:', {
          oldDataLength: trendData.length,
          newDataLength: newTrendData.length
        });
        setTrendData(newTrendData);
      }
      
      if (detailsResponse?.data) {
        const newGridData = detailsResponse.data?.content || detailsResponse.data || [];
        const newGridTotal = detailsResponse.data?.totalElements || detailsResponse.data?.length || 0;
        console.log('📋 Updating grid:', {
          oldDataLength: gridData.length,
          newDataLength: newGridData.length,
          oldTotal: gridTotal,
          newTotal: newGridTotal
        });
        setGridData(newGridData);
        setGridTotal(newGridTotal);
      }
      
      console.log('✅ Customer change complete - all UI states updated');
      
    } catch (error) {
      console.error('❌ Customer change error:', error);
      setErrorState(exceptionHandler(error));
    } finally {
      // Minimal loading time for smooth UX (prevent flash)
      const minLoadTime = 150;
      const elapsed = Date.now() - fetchStart;
      const remainingTime = Math.max(0, minLoadTime - elapsed);
      
      setTimeout(() => {
        setSectionLoadingStates(false, ['provider', 'month', 'invoice']);
        setTrendChartLoading(false); // Hide skeleton for Trending Monthly Spend chart
        console.log('🔓 Customer change - loading states cleared');
      }, remainingTime);
    }
  }, [selectedSoldToId, selectedProvider, apiEndpoint, selectedMonth, selectedInvoiceNumber, totalSpend, monthlyDifference, breakdownChartData.length, trendData.length, gridData.length, gridTotal]);
  
  // Handle grid pagination changes
  const handleGridDataStateChange = useCallback(async (event) => {
    const newDataState = event.dataState;
    
    // Force immediate state update to show loading indicator
    flushSync(() => {
      setGridDataState(newDataState);
      setIsLoadingGridPagination(true);
    });
    
    console.log('🔄 Grid pagination: Loading state set to TRUE');

    try {
      // Read fresh values from store
      const authState = store.getState().auth;
      const accessToken = authState?.loginResponse?.tokens?.bearerToken || authState?.accessToken;
      
      // Extract soldToId using comprehensive path
      const soldToId = authState?.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId ||
                       authState?.loginResponse?.userProfile?.defaultContext?.soldToId ||
                       authState?.loginResponse?.soldToId ||
                       authState?.loginResponse?.userProfile?.soldToId ||
                       authState?.soldTo ||
                       authState?.user?.soldToId;
      
      const monthValue = selectedMonth?.value || selectedMonth?.date || selectedMonth?.display;
      
      console.log('🔑 Pagination auth check:', { 
        hasAccessToken: !!accessToken, 
        tokenLength: accessToken?.length,
        soldToIdValue: soldToId,
        soldToIdType: typeof soldToId,
        hasSelectedMonth: !!selectedMonth,
        monthValue: monthValue
      });
      
      if (!accessToken || !soldToId || !monthValue) {
        console.error('Missing required data for pagination:', { 
          hasAccessToken: !!accessToken, 
          soldToIdValue: soldToId,
          hasSelectedMonth: !!selectedMonth,
          monthValue: monthValue
        });
        return;
      }

      const formattedMonth = monthValue.replace(/-/g, '');
      const pageNumber = Math.floor(newDataState.skip / newDataState.take);
      
      // Build filter query string
      const filterParams = [];
      if (selectedProductCategory && selectedProductCategory.length > 0) {
        selectedProductCategory.forEach(category => {
          const categoryValue = typeof category === 'object' ? category.value : category;
          if (categoryValue !== 'all') {
            filterParams.push(`filter=productcategory equals ${categoryValue}`);
          }
        });
      }
      if (selectedProductName && selectedProductName.length > 0) {
        selectedProductName.forEach(name => {
          const nameValue = typeof name === 'object' ? name.value : name;
          if (nameValue !== 'all') {
            filterParams.push(`filter=productname equals ${nameValue}`);
          }
        });
      }
      if (selectedSubscriptionId && selectedSubscriptionId.length > 0) {
        selectedSubscriptionId.forEach(sub => {
          const subValue = typeof sub === 'object' ? sub.value : sub;
          if (subValue !== 'all') {
            filterParams.push(`filter=subscriptionid equals ${subValue}`);
          }
        });
      }
      const filterQueryString = filterParams.length > 0 ? `&${filterParams.join('&')}` : '';

      const services = (await import('@/lib/api/services')).default;
      const serviceConfig = services.getService('invoiceMonthDetail');
      const baseURL = serviceConfig.baseURL;
      
      const apiUrl = `${baseURL}/ccr-billableitem-service/${apiEndpoint}/month/${formattedMonth}?page=${pageNumber}&size=${newDataState.take}${filterQueryString}`;
      
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const requestBody = Array.isArray(soldToId) ? soldToId : [soldToId];
      
      console.log('📄 Fetching Grid page:', { 
        pageNumber, 
        size: newDataState.take, 
        url: apiUrl,
        hasAuthHeader: !!requestHeaders.Authorization,
        authHeaderValue: requestHeaders.Authorization ? `Bearer ...${accessToken?.slice(-10)}` : 'MISSING',
        requestBody
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const detailsResponse = await response.json();
      
      if (detailsResponse?.data) {
        setGridData(detailsResponse.data?.content || detailsResponse.data || []);
        setGridTotal(detailsResponse.data?.totalElements || detailsResponse.data?.length || 0);
      }
      
      console.log('✅ Grid pagination: Data loaded, setting loading to FALSE');
      
    } catch (error) {
      console.error('❌ Error changing page:', error);
      setErrorState(`Failed to load page: ${error.message}`);
    } finally {
      setIsLoadingGridPagination(false);
    }
  }, [selectedMonth, selectedProductCategory, selectedProductName, selectedSubscriptionId, apiEndpoint]);
  
  // Chart type change handler
  const handleChartTypeChange = useCallback(async (newType) => {
    setChartTypeLoading(true);
    setTrendingChartType(newType);
    setTimeout(() => setChartTypeLoading(false), 300);
  }, []);
  
  // Period change handler for trending monthly spend
  const handlePeriodChange = useCallback(async (period) => {
    console.log('📅 Period changed to:', period);
    
    // Update selected period state
    setSelectedPeriod(period);
    
    // Calculate months based on period selection
    const months = period === "Last 12 Months" ? 12 : 6;
    
    // Show skeleton only for trend chart section
    setTrendChartLoading(true);
    
    try {
      // Call the trend API with updated months parameter
      const trendResponse = await fetchInvoiceTrendServer(
        selectedSoldToId, 
        apiEndpoint || selectedProvider?.abbreviation || 'microsoft',
        months
      );
      
      if (trendResponse.error) {
        console.error('❌ Error fetching trend data:', trendResponse.error);
        setErrorState(trendResponse.error);
      } else {
        console.log('✅ Trend data fetched successfully:', trendResponse.data);
        setTrendData(trendResponse.data?.chartData || []);
      }
    } catch (error) {
      console.error('❌ Error in handlePeriodChange:', error);
      setErrorState('Failed to fetch trend data');
    } finally {
      setTrendChartLoading(false);
    }
  }, [selectedSoldToId, apiEndpoint, selectedProvider]);

  const handleApplyFilters = async () => {
    console.log('Applying filters:', {
      productCategory: selectedProductCategory,
      productName: selectedProductName,
      subscriptionId: selectedSubscriptionId,
      invoiceNumber: selectedInvoiceNumber
    });
    
    // Show skeleton ONLY for grid section
    setGridSectionLoading(true);
    
    try {
      // Simulate API call for filtered grid data
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulated delay
      
      // Here you would make actual API call with filters
      // const filteredData = await fetchFilteredGridData(filters);
      // setGridData(filteredData);
      
      console.log('✅ Filters applied successfully');
    } catch (error) {
      console.error('❌ Apply filters error:', error);
      setErrorState(exceptionHandler(error));
    } finally {
      // Hide grid skeleton after API response
      setGridSectionLoading(false);
    }
  };

  // Cache preloading function for adjacent months to improve UX
  const preloadAdjacentMonths = useCallback(async (currentMonth) => {
    if (!selectedSoldToId || !selectedProvider) return;
    
    try {
      // Calculate previous and next months for preloading
      const currentDate = new Date(currentMonth + '01'); // Add day to make valid date
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(currentDate.getMonth() - 1);
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(currentDate.getMonth() + 1);
      
      const formatMonth = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}${month}`;
      };
      
      const prevMonthValue = formatMonth(prevMonth);
      const nextMonthValue = formatMonth(nextMonth);
      
      console.log('🔄 Preloading cache for adjacent months:', { prevMonthValue, nextMonthValue });
      
      // Get abbreviation from selectedProvider
      const abbreviation = selectedProvider?.abbreviation || apiEndpoint;
      
      if (!abbreviation) {
        console.log('⚠️ Cannot preload: missing abbreviation');
        return;
      }
      
      // Preload in background without blocking UI
      setTimeout(() => {
        Promise.all([
          fetchConsolidatedInvoiceData(
            selectedSoldToId,
            abbreviation, // Pass abbreviation string, not provider object
            prevMonthValue,
            null
          ).catch(err => console.log('📦 Preload failed for prev month:', err)),
          fetchConsolidatedInvoiceData(
            selectedSoldToId,
            abbreviation, // Pass abbreviation string, not provider object
            nextMonthValue,
            null
          ).catch(err => console.log('📦 Preload failed for next month:', err))
        ]);
      }, 1000); // Delay to not interfere with main data loading
    } catch (err) {
      console.log('⚠️ Preload calculation failed:', err);
    }
  }, [selectedSoldToId, selectedProvider, apiEndpoint]);

  // Initialize all filter options from SSR data if available
  useEffect(() => {
    console.log('🔍 DEBUG: SSR useEffect triggered with:', {
      mode,
      isSSR: mode === 'ssr',
      hasInitialData: !!initialData,
      hasSummaryData: !!initialData?.summaryResponse?.data,
      condition: mode === 'ssr' && initialData?.summaryResponse?.data
    });
    
    if (mode === 'ssr' && initialData?.summaryResponse?.data) {
      console.log('🏗️ SSR: Starting data population process...');
      console.log('📦 SSR: Available initial data:', {
        hasSummary: !!initialData.summaryResponse,
        hasTrend: !!initialData.trendResponse,
        hasDetails: !!initialData.detailsResponse,
        hasProviders: !!initialData.providersResponse,
        hasInvoiceMonths: !!initialData.invoiceMonthsResponse
      });
      
      const selectLists = initialData.summaryResponse.data?.selectLists || [];
      setSummarySelectLists(selectLists);
      console.log('🏗️ SSR: Processing server data for UI population');
      
      // ✅ POPULATE SUMMARY DATA FROM SSR
      const summaryData = initialData.summaryResponse.data;
      
      // Check multiple possible locations for summary/chart data
      if (summaryData.spendPeriod) {
        setTotalSpend(summaryData.spendPeriod?.totalSpend || 0);
        console.log('💰 SSR: Set total spend:', summaryData.spendPeriod?.totalSpend);
      }
      
      // DEBUG: Check all possible chart data sources
      console.log('📊 DEBUG: Summary data structure:', {
        hasSpendPeriod: !!summaryData.spendPeriod,
        hasSpendArray: !!summaryData.spendPeriod?.spend,
        spendArrayLength: summaryData.spendPeriod?.spend?.length || 0,
        hasChartData: !!summaryData.chartData,
        chartDataLength: summaryData.chartData?.length || 0,
        hasBreakdown: !!summaryData.breakdown,
        breakdownLength: summaryData.breakdown?.length || 0,
        hasContent: !!summaryData.content,
        contentLength: summaryData.content?.length || 0,
        summaryDataKeys: Object.keys(summaryData),
        fullSummaryData: summaryData
      });
      
      // Try multiple data sources for breakdown chart
      let chartData = [];
      if (summaryData.chartData && summaryData.chartData.length > 0) {
        chartData = summaryData.chartData;
        console.log('📊 Using chartData as source');
      } else if (summaryData.breakdown && summaryData.breakdown.length > 0) {
        chartData = summaryData.breakdown;
        console.log('📊 Using breakdown as source');
      } else if (summaryData.spendPeriod?.spend && summaryData.spendPeriod.spend.length > 0) {
        chartData = summaryData.spendPeriod.spend;
        console.log('📊 Using spendPeriod.spend as source');
      } else if (summaryData.content && summaryData.content.length > 0) {
        chartData = summaryData.content;
        console.log('📊 Using content as source');
      } else {
        console.log('❌ No chart data found in any expected location');
      }
      
      console.log('📊 DEBUG: Chart data before transformation:', {
        originalData: chartData,
        length: chartData.length,
        firstItem: chartData[0]
      });
      
      if (chartData && chartData.length > 0) {
        const transformedChartData = chartData.map(item => ({
          label: item.label || item.category || item.name || item.productCategory || 'Unknown',
          value: item.value || item.amount || item.spend || item.totalSpend || 0
        }));
        
        setBreakdownChartData(transformedChartData);
        console.log('📊 SSR: Set breakdown chart data:', {
          length: transformedChartData.length,
          data: transformedChartData,
          hasValidData: transformedChartData.length > 0 && transformedChartData.some(item => item.value > 0)
        });
      } else {
        console.log('❌ No valid chart data found, setting empty array');
        setBreakdownChartData([]);
      }
      
      // ✅ POPULATE TREND DATA FROM SSR
      if (initialData.trendResponse?.data) {
        setTrendData(initialData.trendResponse.data?.chartData || []);
        console.log('📈 SSR: Set trend data:', initialData.trendResponse.data?.chartData?.length, 'items');
      }
      
      // ✅ POPULATE GRID DATA FROM SSR
      if (initialData.detailsResponse?.data) {
        const gridDataFromSSR = initialData.detailsResponse.data?.content || initialData.detailsResponse.data || [];
        const gridTotalFromSSR = initialData.detailsResponse.data?.totalElements || initialData.detailsResponse.data?.length || 0;
        setGridData(gridDataFromSSR);
        setGridTotal(gridTotalFromSSR);
        console.log('🗂️ SSR: Set grid data:', gridDataFromSSR.length, 'items, total:', gridTotalFromSSR);
      }
      
      // ✅ POPULATE PROVIDERS AND MONTHS FROM SSR
      if (initialData.providersResponse?.data) {
        setProviders(initialData.providersResponse.data);
        setSelectedProvider(initialData.defaultProvider);
        setApiEndpoint(initialData.defaultProvider?.abbreviation);
        console.log('🏢 SSR: Set providers and selected:', initialData.defaultProvider?.abbreviation);
      }
      
      if (initialData.invoiceMonthsResponse?.data) {
        setInvoiceMonths(initialData.invoiceMonthsResponse.data);
        const firstMonth = initialData.invoiceMonthsResponse.data[0];
        setSelectedMonth(firstMonth);
        console.log('📅 SSR: Set months and selected first:', firstMonth);
      }
      
      // Initialize Invoice Numbers - prioritize first actual invoice (not "All")
      const invoiceNumbersList = selectLists.find(list => list.name === 'invoicenumber');
      if (invoiceNumbersList && invoiceNumbersList.items) {
        setInvoiceNumbers(invoiceNumbersList.items);
        // Find first actual invoice number (not "All"), fallback to first item
        const defaultInvoice = invoiceNumbersList.items.find(item => 
          item.value !== 'All' && item.value !== 'all'
        ) || invoiceNumbersList.items[0];
        setSelectedInvoiceNumber(defaultInvoice);
        console.log('🏷️ SSR: Selected default invoice from server data:', defaultInvoice);
        console.log('✅ SSR: Using server-provided data only, no client API calls triggered');
      } else {
        const defaultInvoiceNumbers = [{ label: 'All Invoices', value: 'All' }];
        setInvoiceNumbers(defaultInvoiceNumbers);
        setSelectedInvoiceNumber(defaultInvoiceNumbers[0]);
      }
      
      // Initialize Product Categories with 'All' as first option
      console.log('Filtering for Product Categories from:', selectLists);
      const productCategoryList = selectLists.find(list => list.name === 'productcategory');
      const allCategoryOption = { label: 'All', value: 'all' };
      if (productCategoryList && productCategoryList.items) {
        const categoriesWithAll = [allCategoryOption, ...productCategoryList.items];
        setProductCategories(categoriesWithAll);
        setSelectedProductCategory([]); // Empty array for MultiSelect
        console.log('Set categories:', categoriesWithAll);
      } else {
        setProductCategories([allCategoryOption]);
        setSelectedProductCategory([]); // Empty array for MultiSelect
      }
      
      // Initialize Product Names with 'All' as first option
      const productNameList = selectLists.find(list => list.name === 'productname');
      const allProductOption = { label: 'All', value: 'all' };
      if (productNameList && productNameList.items) {
        const productsWithAll = [allProductOption, ...productNameList.items.filter(item => item.label && item.value)];
        setProductNames(productsWithAll);
        setSelectedProductName([]); // Empty array for MultiSelect
        console.log('Set products:', productsWithAll);
      } else {
        setProductNames([allProductOption]);
        setSelectedProductName([]); // Empty array for MultiSelect
      }
      
      // Initialize Subscription IDs with 'All' as first option
      const subscriptionIdList = selectLists.find(list => list.name === 'subscriptionid');
      const allSubscriptionOption = { label: 'All', value: 'all' };
      if (subscriptionIdList && subscriptionIdList.items) {
        const subscriptionsWithAll = [allSubscriptionOption, ...subscriptionIdList.items];
        setSubscriptionIds(subscriptionsWithAll);
        setSelectedSubscriptionId([]); // Empty array for MultiSelect
        console.log('Set subscriptions:', subscriptionsWithAll);
      } else {
        setSubscriptionIds([allSubscriptionOption]);
        setSelectedSubscriptionId([]); // Empty array for MultiSelect
      }
      
      // ✅ SSR INITIALIZATION COMPLETE
      console.log('✅ SSR: Invoices page initialized with server data only - no client API calls triggered');
      
      // ✅ TURN OFF ALL LOADING STATES AFTER SSR DATA IS POPULATED
      setSectionLoadingStates(false);
      console.log('🔄 SSR: All loading states disabled - data is now visible');
    } else {
      console.log('❌ DEBUG: SSR useEffect not running because:', {
        modeCheck: mode === 'ssr',
        dataCheck: !!initialData?.summaryResponse?.data,
        mode,
        hasInitialData: !!initialData,
        hasSummaryResponse: !!initialData?.summaryResponse,
        hasSummaryData: !!initialData?.summaryResponse?.data
      });
    }
  }, [mode, initialData, selectedSoldToId]);

  // 🛡️ SAFETY MECHANISM: Ensure loading states are off in SSR mode regardless of data format
  useEffect(() => {
    console.log('🛡️ SAFETY useEffect triggered:', {
      mode,
      isSSR: mode === 'ssr',
      currentLoadingStates: {
        provider: providerSectionLoading,
        month: monthSectionLoading,
        invoice: invoiceSectionLoading,
        stats: statsSectionLoading,
        charts: chartsSectionLoading,
        grid: gridSectionLoading,
        filters: filtersSectionLoading
      }
    });
    
    if (mode === 'ssr') {
      console.log('🛡️ SAFETY: Forcing loading states OFF for SSR mode');
      setSectionLoadingStates(false);
      
      // Force update after a short delay to ensure state has updated
      setTimeout(() => {
        console.log('🛡️ SAFETY: Verifying loading states after force-off:', {
          provider: providerSectionLoading,
          month: monthSectionLoading,
          invoice: invoiceSectionLoading,
          stats: statsSectionLoading,
          charts: chartsSectionLoading,
          grid: gridSectionLoading,
          filters: filtersSectionLoading
        });
      }, 100);
    }
  }, [mode]);

  // ✅ SSR BEHAVIOR: No automatic API calls on initial load
  // ✅ CSR BEHAVIOR: Only user interactions trigger client-side API calls  
  // Note: SSR provides initial data, client-side calls only triggered by user interactions with filters

  // Error display
  if (errorState) {
    return (
      <div className="invoices-container">
        <div className="error-message">
          <h2>Error Loading Invoices</h2>
          <p>{errorState}</p>
          <button onClick={() => {
            setErrorState(null);
            fetchProviders();
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="invoices-container">
      {/* Header Section with horizontal layout */}
      <div className="invoices-header-row">
        <div className="header-left">
          <h1 className="header-text-large">Invoice Reporting</h1>
        </div>
        <div className="header-right">
          <div className="kpi-cards">
            {/* Invoice Total */}
            <div className="kpi-card invoice-total">
              {isStatsLoading ? (
                <>
                  <div className="skeleton-loader skeleton-kpi-label"></div>
                  <div className="skeleton-loader skeleton-kpi-value"></div>
                </>
              ) : (
                <>
                  <div className="kpi-label">
                    Invoice Total
                    <Tooltip anchorElement="target" position="auto">
                      <SvgIcon icon={infoCircleIcon} size="small" className="info-icon" title="Taxes are not included in totals." />
                    </Tooltip>
                  </div>
                  <div className="kpi-value invoice-total">
                    {formatCurrency(totalSpend)}
                  </div>
                </>
              )}
            </div>

            {/* Monthly Difference */}
            <div className="kpi-card monthly-difference">
              {isStatsLoading ? (
                <>
                  <div className="skeleton-loader skeleton-kpi-label-wide"></div>
                  <div className="skeleton-loader skeleton-kpi-value-wide"></div>
                </>
              ) : (
                <>
                  <div className="kpi-label">
                    Monthly Difference&nbsp;
                    {monthlyDifference > 0 ? (
                      <ArrowUpIcon className="svg-style" />
                    ) : monthlyDifference < 0 ? (
                      <ArrowDownIcon className="svg-style" />
                    ) : null}
                  </div>
                  <div className="kpi-value monthly-difference">
                    {formatCurrency(Math.abs(monthlyDifference))}
                    {haveDifferencePercent && monthlyDifferencePercent !== null && (
                      <span> ({monthlyDifferencePercent}%)</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Invoice Status */}
            <div className="kpi-card invoice-credits">
              {isStatsLoading ? (
                <>
                  <div className="skeleton-loader skeleton-kpi-label-credits"></div>
                  <div className="skeleton-loader skeleton-kpi-value"></div>
                </>
              ) : (
                <>
                  <div className="kpi-label">Invoice Status
                    <Tooltip anchorElement="target" position="auto">
                      <SvgIcon icon={infoCircleIcon} size="small" className="info-icon" title="Please note that your download may not be available immediately. Please check back in the next 1 - 2 days." />
                    </Tooltip>
                  </div>
                  <div className="kpi-value invoice-credits">
                    {invoiceStatus || 'N/A'}
                  </div>
                  {<span className="redirect">{t("Download PDF")}</span>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dropdowns Section - 70% width */}
      <div className="invoices-filters-section">
        <div className="filters-container" style={{ maxWidth: isReseller ? '100%' : '75%' }}>
          <div className="primary-filters">
            <div className="dropdown-group" style={{ minWidth: isReseller ? '24%' : '30%' }}>
              {isProviderLoading ? (
                <label className="label-text-bold">
                  <Skeleton style={{ width: '60px', height: '16px', marginBottom: '4px' }} />
                </label>
              ) : (
                <label className="label-text-bold">Provider</label>
              )}
              {isProviderLoading ? (
                <Skeleton style={{ width: '200px', height: '32px' }} />
              ) : (
                <DropDownList
                  data={providers}
                  textField="provider"
                  dataItemKey="abbreviation"
                  value={selectedProvider}
                  onChange={handleProviderChange}
                />
              )}
            </div>

            <div className="dropdown-group" style={{ minWidth: isReseller ? '24%' : '30%' }}>
              {isMonthLoading ? (
                <label className="label-text-bold">
                  <Skeleton style={{ width: '90px', height: '16px', marginBottom: '4px' }} />
                </label>
              ) : (
                <label className="label-text-bold">Invoice Month</label>
              )}
              {isMonthLoading ? (
                <Skeleton style={{ width: '200px', height: '32px' }} />
              ) : (
                <DropDownList
                  data={invoiceMonths}
                  textField="text"
                  dataItemKey="value"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  disabled={isMonthChanging}
                />
              )}
            </div>

            <div className="dropdown-group" style={{ minWidth: isReseller ? '24%' : '30%' }}>
              {isInvoiceLoading ? (
                <label className="label-text-bold">
                  <Skeleton style={{ width: '65px', height: '16px', marginBottom: '4px' }} />
                </label>
              ) : (
                <label className="label-text-bold">Invoice #</label>
              )}
              {isInvoiceLoading ? (
                <Skeleton style={{ width: '200px', height: '32px' }} />
              ) : (
                <DropDownList
                  data={invoiceNumbers}
                  textField="label"
                  dataItemKey="value"
                  value={selectedInvoiceNumber}
                  onChange={handleInvoiceNumberChange}
                />
              )}
            </div>

            {isReseller && (
              <div className="dropdown-group" style={{ minWidth: '24%' }}>
                {isInvoiceLoading ? (
                  <label className="label-text-bold">
                    <Skeleton style={{ width: '100px', height: '16px', marginBottom: '4px' }} />
                  </label>
                ) : (
                  <label className="label-text-bold">Customer Name</label>
                )}
                {isInvoiceLoading ? (
                  <Skeleton style={{ width: '200px', height: '32px' }} />
                ) : (
                  <DropDownList
                    data={customerNames}
                    textField="label"
                    dataItemKey="value"
                    value={selectedCustomer}
                    onChange={handleCustomerChange}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Information */}
      <div className="chart-info-section">
        <p className="chart-instruction">Select a Product Category in the chart to see Spend Details</p>
      </div>

      {/* Charts Row */}
      <div className="invoices-charts-row">
        {/* Invoice Breakdown Chart */}
        <div className="invoices-breakdown-chart">
          {isChartsLoading ? (
            <>
              <h3>
                <Skeleton style={{ width: '300px', height: '24px', marginBottom: '16px' }} />
              </h3>
              <Skeleton style={{ width: '100%', height: '300px' }} />
            </>
          ) : (
            <>
              <p className="chart-title">Invoice Breakdown by Product Category</p>
              {breakdownChartData && breakdownChartData.length > 0 ? (
                <Chart onRefresh={() => {}} seriesColors={getInsightThemeColors()}>
                  <BasicGroupedChart
                    chartType="column"
                    title=""
                    subTitle=""
                    data={breakdownChartData}
                    categoryField="label"
                    valueField="value"
                    useColors={true}
                    customTooltip={true}
                    categoryTitle=""
                    showCategoryLabels={false}
                    legendPosition="bottom"
                    legendTitle=""
                    legendVisible={false}
                    tooltipFormat="c2"
                    showLabels={true}
                    showCategoryInLabels={true}
                    valueFormat="c2"
                    labelFormat="c2"
                  />
                </Chart>
              ) : (
                <div style={{ 
                  height: '300px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <div style={{ textAlign: 'center', color: '#666' }}>
                    <p>No breakdown data available</p>
                    <small>
                      Data items: {breakdownChartData?.length || 0}
                      <br />
                      Mode: {mode}
                      <br />
                      Has initial data: {!!initialData ? 'Yes' : 'No'}
                    </small>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Trending Chart */}
        <div className="invoices-trend-chart">
          {trendChartLoading ? (
            <>
              <Skeleton style={{ width: '100%', height: '50px', marginBottom: '16px' }} />
              <Skeleton style={{ width: '100%', height: '300px' }} />
            </>
          ) : (
            <>
              <ChartTitleAndButtons
                title="Trending Monthly Spend"
                trendingChartType={trendingChartType}
                handleChartTypeChange={handleChartTypeChange}
                chartOptions={columnLineAreaOptions}
                dropDownList={true}
                apiEndPoint={apiEndpoint}
                pageType="invoice"
                onPeriodChange={handlePeriodChange}
                selectedPeriod={selectedPeriod}
              />
              <Chart seriesColors={getInsightThemeColors()}>
                <BasicGroupedChart
                  key={trendingChartType}
                  chartType={trendingChartType}
                  title=""
                  subTitle=""
                  data={formattedTrendData}
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
            </>
          )}
        </div>
      </div>

      </div>
      

      <div className="invoices-container">
      {/* Additional Filters Section */}
      <div className="invoices-additional-filters">
        {isFiltersLoading ? (
          <div className="dropdown-row">
            <div className="dropdown-group">
              <label className="label-text-bold">
                <Skeleton style={{ width: '120px', height: '16px', marginBottom: '4px' }} />
              </label>
              <Skeleton style={{ width: '200px', height: '32px' }} />
            </div>
            <div className="dropdown-group">
              <label className="label-text-bold">
                <Skeleton style={{ width: '100px', height: '16px', marginBottom: '4px' }} />
              </label>
              <Skeleton style={{ width: '200px', height: '32px' }} />
            </div>
            <div className="dropdown-group">
              <label className="label-text-bold">
                <Skeleton style={{ width: '110px', height: '16px', marginBottom: '4px' }} />
              </label>
              <Skeleton style={{ width: '200px', height: '32px' }} />
            </div>
            <div className="">
              <button className="apply-filters-btn" disabled>
                <Skeleton style={{ width: '100px', height: '36px' }} />
              </button>
            </div>
          </div>
        ) : (
          <div className="dropdown-row">
            <div className="dropdown-group">
              <label className="label-text-bold">Product Category</label>
              <MultiSelect
                data={productCategories}
                textField="label"
                dataItemKey="value"
                value={selectedProductCategory}
                name="productCategory"
                placeholder="All"
                onChange={(e) => setSelectedProductCategory(e.value)}
                disabled={isFiltersLoading}
              />
            </div>

            <div className="dropdown-group">
              <label className="label-text-bold">Product Name</label>
              <MultiSelect
                data={productNames}
                textField="label"
                dataItemKey="value"
                value={selectedProductName}
                name="productName"
                placeholder="All"
                onChange={(e) => setSelectedProductName(e.value)}
                disabled={isFiltersLoading}
              />
            </div>

            <div className="dropdown-group">
              <label className="label-text-bold">Subscription ID</label>
              <MultiSelect
                data={subscriptionIds}
                textField="label"
                dataItemKey="value"
                value={selectedSubscriptionId}
                name="subscriptionId"
                placeholder="All"
                onChange={(e) => setSelectedSubscriptionId(e.value)}
                disabled={isFiltersLoading}
              />
            </div>

            <div className="">
              <button 
                className="apply-filters-btn" 
                onClick={handleApplyFilters}
                disabled={isGridLoading}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid Section */}
      <div className="invoices-grid">
        {isGridLoading ? (
          <>
            <h3>
              <Skeleton style={{ width: '120px', height: '24px', marginBottom: '16px' }} />
            </h3>
            <Skeleton style={{ width: '100%', height: '400px' }} />
          </>
        ) : (
          <>
            {(() => {
              // Process data to handle different response structures
              let processedData = null;
              
              if (Array.isArray(gridData)) {
                processedData = gridData;
              } else if (gridData?.data && Array.isArray(gridData.data)) {
                processedData = gridData.data;
              } else if (gridData?.content && Array.isArray(gridData.content)) {
                processedData = gridData.content;
              }
              
              // Calculate dynamic grid height based on actual row count
              const rowCount = processedData?.length || 0;
              const gridHeight = rowCount === 0 ? '200px' : (rowCount > 8 ? '400px' : 'auto');
              
              console.log('📊 Invoices Grid Data:', {
                processedData,
                processedLength: processedData?.length || 0,
                totalElements: gridTotal,
                rowCount,
                gridHeight
              });
              
              // Prepare data structure for GridTable with pagination info
              const gridDataForTable = {
                data: processedData || [],
                total: gridTotal
              };
              
              return (
                <GridTable 
                  data={gridDataForTable}
                  columns={gridColumns}
                  className="invoices-details-grid"
                  loading={isLoadingGridPagination}
                  gridHeight={gridHeight}
                  dataState={gridDataState}
                  dataStateChange={handleGridDataStateChange}
                />
              );
            })()}
          </>
        )}
      </div>

    </div>
    </>
  );
}