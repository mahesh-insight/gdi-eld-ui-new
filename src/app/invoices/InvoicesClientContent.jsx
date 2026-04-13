"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { flushSync } from 'react-dom';
import store from '@/store/store';
import { useTranslation } from 'react-i18next';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { Skeleton } from '@progress/kendo-react-indicators';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Chart } from '@progress/kendo-react-charts';
import request, { apiClient } from '@/lib/api/request';
import { exceptionHandler, formatCurrency } from '@/lib/utils';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { Tooltip } from '@progress/kendo-react-tooltip';
import { infoCircleIcon } from '@progress/kendo-svg-icons';
import { SvgIcon } from '@progress/kendo-react-common';
import GridTable from '@/components/GridTable/GridTable';
import { ArrowUpIcon, ArrowDownIcon, ArcheraIcon, ImportIcon } from '@/lib/svg/svgList';
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
import { Button } from '@progress/kendo-react-buttons';
import { DownloadButton } from '@/lib/download';

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
  
  // Next.js router for navigation
  const router = useRouter();
  
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
  
  // Final validation and logging
  console.log('🔍 InvoicesClientContent soldToId extraction:', {
    mode,
    selectedSoldToId,
    hasUserContext: !!userContext,
    hasLoginResponse: !!loginResponse,
    source: mode === 'ssr' ? 'userContext' : (loginResponse ? 'Redux loginResponse' : 'localStorage fallback')
  });
  
  // Ref to track in-flight API calls - prevents duplicate requests
  const monthChangeInProgress = useRef(false);
  const invoiceChangeInProgress = useRef(false);
  const lastMonthChangeTime = useRef(0);
  const lastMonthValue = useRef(null);
  const hasInitialized = useRef(false); // Track if initial data fetch has occurred
  const hasRestoredState = useRef(false); // Track if state restoration has been processed
  
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
  
  // Prevent chart auto-refresh to avoid flickering/fluctuation on unrelated state changes
  // But allow refresh when chart type or data actually changes
  const [refreshChart, setRefreshChart] = useState(false);
  
  const handleChartRefresh = (chartOptions, themeOptions, chartInstance) => {
    // Only prevent refresh if it's not a legitimate chart update
    // This stops flickering from unrelated dropdown changes while allowing
    // chart type changes and data updates to work properly
    setRefreshChart(false);
  };
    
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
  const [haveUnbilledConsumption, setHaveUnbilledConsumption] = useState(mode === 'ssr' ? (initialData?.summaryResponse?.data?.haveUnbilledConsumption || false) : false);
  
  // Get hasReservedInstanceOrAzureSavingsPlan from MPSA status (passed from SSR or fetched client-side)
  const [hasReservedInstanceOrAzureSavingsPlan, setHasReservedInstanceOrAzureSavingsPlan] = useState(
    mode === 'ssr' ? (initialData?.hasReservedInstanceOrAzureSavingsPlan || false) : false
  );

  // Additional filter states - empty by default, 'All' is just placeholder
  const [productCategories, setProductCategories] = useState([]);
  const [selectedProductCategory, setSelectedProductCategory] = useState([]); // MultiSelect: array
  const [productNames, setProductNames] = useState([]);
  const [selectedProductName, setSelectedProductName] = useState([]); // MultiSelect: array
  const [subscriptionIds, setSubscriptionIds] = useState([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState([]); // MultiSelect: array
  
  // Track last applied filter state to detect changes
  const [lastAppliedFilters, setLastAppliedFilters] = useState({
    productCategory: [],
    productName: [],
    subscriptionId: []
  });
  
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
    const categoryChanged = !arraysEqual(selectedProductCategory || [], lastAppliedFilters.productCategory || []);
    const nameChanged = !arraysEqual(selectedProductName || [], lastAppliedFilters.productName || []);
    const subscriptionChanged = !arraysEqual(selectedSubscriptionId || [], lastAppliedFilters.subscriptionId || []);
    
    // Enable button if ANY filter has changed from last applied state
    const hasChanges = categoryChanged || nameChanged || subscriptionChanged;
    
    // Disable if no changes OR if grid is loading
    return !hasChanges || isGridLoading;
  }, [selectedProductCategory, selectedProductName, selectedSubscriptionId, lastAppliedFilters, isGridLoading]);
  
  // Customer Name (tenantId) filter
  const [customerNames, setCustomerNames] = useState([{ label: 'All Customers', value: 'All' }]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Invoice breakdown chart data with fallback
  const [breakdownChartData, setBreakdownChartData] = useState(() => {
    if (mode === 'ssr' && initialData?.summaryResponse?.data) {
      const chartData = initialData.summaryResponse.data.chartData || 
                       initialData.summaryResponse.data.breakdown || 
                       [];
      
      // Transform chart data for BasicGroupedChart component - preserve URL and clickKey for navigation
      const transformedChartData = chartData.map(item => ({
        label: item.label || item.category || 'Unknown',
        value: item.value || 0,
        url: item.url || null,
        clickKey: item.clickKey || null
      }));
      
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
            setIsReseller(summaryResponse.data?.isReseller || false);
            setHaveUnbilledConsumption(summaryResponse.data?.haveUnbilledConsumption || false);
            const spendData = summaryResponse.data?.spendPeriod?.spend || [];
            const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
            
            // Transform chart data for BasicGroupedChart component - preserve URL and clickKey for navigation
            const transformedChartData = chartData.map(item => ({
              label: item.label || item.category || 'Unknown',
              value: item.value || 0,
              url: item.url || null,
              clickKey: item.clickKey || null
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
    
    // Reset filter dropdowns
    setSelectedProductCategory([]);
    setSelectedProductName([]);
    setSelectedSubscriptionId([]);
    setLastAppliedFilters({
      productCategory: [],
      productName: [],
      subscriptionId: []
    });

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
    
    // Reset filter dropdowns when month changes
    setSelectedProductCategory([]);
    setSelectedProductName([]);
    setSelectedSubscriptionId([]);
    setLastAppliedFilters({
      productCategory: [],
      productName: [],
      subscriptionId: []
    });
    
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
          value: item.value || 0,
          url: item.url || null,
          clickKey: item.clickKey || null
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
    // Update Product Categories - no 'All' option, just use items from API
    const productCategoryList = selectLists.find(list => list.name === 'productcategory');
    if (productCategoryList && productCategoryList.items) {
      setProductCategories(productCategoryList.items);
      setSelectedProductCategory([]); // Empty array for MultiSelect
    } else {
      setProductCategories([]);
      setSelectedProductCategory([]); // Empty array for MultiSelect
    }
    
    // Update Product Names - no 'All' option, just use items from API
    const productNameList = selectLists.find(list => list.name === 'productname');
    if (productNameList && productNameList.items) {
      const validProducts = productNameList.items.filter(item => item.label && item.value);
      setProductNames(validProducts);
      setSelectedProductName([]); // Empty array for MultiSelect
    } else {
      setProductNames([]);
      setSelectedProductName([]); // Empty array for MultiSelect
    }
    
    // Update Subscription IDs - no 'All' option, just use items from API
    const subscriptionIdList = selectLists.find(list => list.name === 'subscriptionid');
    if (subscriptionIdList && subscriptionIdList.items) {
      setSubscriptionIds(subscriptionIdList.items);
      setSelectedSubscriptionId([]); // Empty array for MultiSelect
    } else {
      setSubscriptionIds([]);
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
    
    // Reset filter dropdowns when invoice number changes
    setSelectedProductCategory([]);
    setSelectedProductName([]);
    setSelectedSubscriptionId([]);
    setLastAppliedFilters({
      productCategory: [],
      productName: [],
      subscriptionId: []
    });
    
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
        
        // Transform chart data for BasicGroupedChart component - preserve URL and clickKey for navigation
        const transformedChartData = chartData.map(item => ({
          label: item.label || item.category || 'Unknown',
          value: item.value || 0,
          url: item.url || null,
          clickKey: item.clickKey || null
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
    
    // Reset filter dropdowns when customer changes
    setSelectedProductCategory([]);
    setSelectedProductName([]);
    setSelectedSubscriptionId([]);
    setLastAppliedFilters({
      productCategory: [],
      productName: [],
      subscriptionId: []
    });
    
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
      
      // Update filtered data
      if (summaryResponse?.data) {
        const newTotalSpend = summaryResponse.data?.spendPeriod?.totalSpend || 0;
        const newMonthlyDiff = summaryResponse.data?.spendPeriod?.differenceTotalSpend || 0;
        const newMonthlyDiffPercent = summaryResponse.data?.spendPeriod?.differencePercentSpend || null;
        const newHaveDiffPercent = summaryResponse.data?.spendPeriod?.haveDifferencePercentSpend || false;
        const newInvoiceStatus = summaryResponse.data?.invoiceStatus || '';
        const newIsReseller = summaryResponse.data?.isReseller || false;
        const newHaveUnbilledConsumption = summaryResponse.data?.haveUnbilledConsumption || false;
        
        setTotalSpend(newTotalSpend);
        setMonthlyDifference(newMonthlyDiff);
        setMonthlyDifferencePercent(newMonthlyDiffPercent);
        setHaveDifferencePercent(newHaveDiffPercent);
        setInvoiceStatus(newInvoiceStatus);
        setIsReseller(newIsReseller);
        setHaveUnbilledConsumption(newHaveUnbilledConsumption);
        
        const spendData = summaryResponse.data?.spendPeriod?.spend || [];
        const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
        
        // Transform chart data for BasicGroupedChart component - preserve URL and clickKey for navigation
        const transformedChartData = chartData.map(item => ({
          label: item.label || item.category || 'Unknown',
          value: item.value || 0,
          url: item.url || null,
          clickKey: item.clickKey || null
        }));
        
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
        setGridData(newGridData);
        setGridTotal(newGridTotal);
      }      
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
      
      // Use component-level selectedSoldToId (already has all fallbacks)
      const soldToId = selectedSoldToId;
      
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
      
      // Build filter query string with consistent format using = (not "equals" keyword)
      const filterParams = [];
      if (selectedProductCategory && selectedProductCategory.length > 0) {
        selectedProductCategory.forEach(category => {
          const categoryValue = typeof category === 'object' ? category.value : category;
          if (categoryValue !== 'all') {
            filterParams.push(`filter=productcategory%3D${encodeURIComponent(categoryValue)}`);
          }
        });
      }
      if (selectedProductName && selectedProductName.length > 0) {
        selectedProductName.forEach(name => {
          const nameValue = typeof name === 'object' ? name.value : name;
          if (nameValue !== 'all') {
            filterParams.push(`filter=productname%3D${encodeURIComponent(nameValue)}`);
          }
        });
      }
      if (selectedSubscriptionId && selectedSubscriptionId.length > 0) {
        selectedSubscriptionId.forEach(sub => {
          const subValue = typeof sub === 'object' ? sub.value : sub;
          if (subValue !== 'all') {
            filterParams.push(`filter=subscriptionid%3D${encodeURIComponent(subValue)}`);
          }
        });
      }
      
      // Customer filter (limittenantid) - if customer is selected and not "All"
      if (selectedCustomer && selectedCustomer.value && selectedCustomer.value !== 'All') {
        filterParams.push(`filter=limittenantid%3D${encodeURIComponent(selectedCustomer.value)}`);
      }
      
      // Invoice Number filter
      const invoiceValue = selectedInvoiceNumber?.value || selectedInvoiceNumber;
      if (invoiceValue && invoiceValue !== 'All' && invoiceValue !== 'all') {
        filterParams.push(`filter=invoicenumber%3D${encodeURIComponent(invoiceValue)}`);
      }
      
      const filterQueryString = filterParams.length > 0 ? `&${filterParams.join('&')}` : '';

      const services = (await import('@/lib/api/services')).default;
      const serviceConfig = services.getService('invoiceMonthDetail');
      const baseURL = serviceConfig.baseURL;
      
      const apiUrl = `${baseURL}/ccr-billableitem-service/${apiEndpoint}/month/${formattedMonth}?page=${pageNumber}&size=${newDataState.take}${filterQueryString}`;
      
      const requestBody = Array.isArray(soldToId) ? soldToId : [soldToId];
      
      console.log('📄 Fetching Grid page:', { 
        pageNumber, 
        size: newDataState.take, 
        url: apiUrl,
        requestBody
      });

      const response = await apiClient.post(apiUrl, requestBody);
      const detailsResponse = response.data;
      
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
  }, [selectedSoldToId, selectedMonth, selectedProductCategory, selectedProductName, selectedSubscriptionId, selectedCustomer, selectedInvoiceNumber, apiEndpoint]);
  
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
    // Save current filter state as "last applied" for change detection
    setLastAppliedFilters({
      productCategory: [...(selectedProductCategory || [])],
      productName: [...(selectedProductName || [])],
      subscriptionId: [...(selectedSubscriptionId || [])]
    });
    
    // Show skeleton ONLY for grid section
    setGridSectionLoading(true);
    
    try {
      // Read fresh values from store
      const authState = store.getState().auth;
      const accessToken = authState?.loginResponse?.tokens?.bearerToken || authState?.accessToken;
      
      // Use component-level selectedSoldToId (already has all fallbacks)
      const soldToId = selectedSoldToId;
      
      const monthValue = selectedMonth?.value || selectedMonth?.date || selectedMonth?.display;
      
      if (!accessToken || !soldToId || !monthValue) {
        console.error('Missing required data for filters:', { 
          hasAccessToken: !!accessToken, 
          soldToIdValue: soldToId,
          hasSelectedMonth: !!selectedMonth,
          monthValue: monthValue
        });
        return;
      }

      const formattedMonth = monthValue.replace(/-/g, '');
      
      // Build filter query string with consistent format using = (not "equals" keyword)
      const filterParams = [];
      
      // Product Category filter
      if (selectedProductCategory && selectedProductCategory.length > 0) {
        selectedProductCategory.forEach(category => {
          const categoryValue = typeof category === 'object' ? category.value : category;
          if (categoryValue && categoryValue !== 'all') {
            filterParams.push(`filter=productcategory%3D${encodeURIComponent(categoryValue)}`);
          }
        });
      }
      
      // Subscription ID filter
      if (selectedSubscriptionId && selectedSubscriptionId.length > 0) {
        selectedSubscriptionId.forEach(sub => {
          const subValue = typeof sub === 'object' ? sub.value : sub;
          if (subValue && subValue !== 'all') {
            filterParams.push(`filter=subscriptionid%3D${encodeURIComponent(subValue)}`);
          }
        });
      }
      
      // Product Name filter
      if (selectedProductName && selectedProductName.length > 0) {
        selectedProductName.forEach(name => {
          const nameValue = typeof name === 'object' ? name.value : name;
          if (nameValue && nameValue !== 'all') {
            filterParams.push(`filter=productname%3D${encodeURIComponent(nameValue)}`);
          }
        });
      }
      
      // Customer filter (limittenantid) - if customer is selected and not "All"
      if (selectedCustomer && selectedCustomer.value && selectedCustomer.value !== 'All') {
        filterParams.push(`filter=limittenantid%3D${encodeURIComponent(selectedCustomer.value)}`);
      }
      
      // Invoice Number filter
      const invoiceValue = selectedInvoiceNumber?.value || selectedInvoiceNumber;
      if (invoiceValue && invoiceValue !== 'All' && invoiceValue !== 'all') {
        filterParams.push(`filter=invoicenumber%3D${encodeURIComponent(invoiceValue)}`);
      }
      
      const filterQueryString = filterParams.length > 0 ? `&${filterParams.join('&')}` : '';

      const services = (await import('@/lib/api/services')).default;
      const serviceConfig = services.getService('invoiceMonthDetail');
      const baseURL = serviceConfig.baseURL;
      
      const apiUrl = `${baseURL}/ccr-billableitem-service/${apiEndpoint}/month/${formattedMonth}?page=0&size=${gridDataState.take}${filterQueryString}`;
      
      const requestBody = Array.isArray(soldToId) ? soldToId : [soldToId];
      
      console.log('🔍 Applying filters with API call:', { 
        url: apiUrl,
        filters: filterParams,
        soldToId: soldToId,
        soldToIdType: typeof soldToId,
        soldToIdIsArray: Array.isArray(soldToId),
        requestBody: requestBody,
        requestBodyString: JSON.stringify(requestBody)
      });

      const response = await apiClient.post(apiUrl, requestBody);
      const detailsResponse = response.data;
      
      console.log('📦 Apply Filters Response:', {
        hasData: !!detailsResponse?.data,
        hasContent: !!detailsResponse?.content,
        responseKeys: Object.keys(detailsResponse || {}),
        dataStructure: detailsResponse?.data ? Object.keys(detailsResponse.data) : [],
        contentLength: detailsResponse?.data?.content?.length || detailsResponse?.content?.length,
        totalElements: detailsResponse?.data?.totalElements || detailsResponse?.totalElements,
        fullResponse: detailsResponse
      });
      
      // Handle both response structures: { data: { content, totalElements } } or { content, totalElements }
      const responseData = detailsResponse?.data || detailsResponse;
      
      if (responseData) {
        const newGridData = responseData?.content || [];
        const newTotal = responseData?.totalElements || responseData?.length || 0;
        
        console.log('🔄 Updating grid with filtered data:', {
          newDataLength: newGridData.length,
          newTotal: newTotal,
          firstItem: newGridData[0]
        });
        
        // Force immediate state update to show filtered data
        flushSync(() => {
          setGridData(newGridData);
          setGridTotal(newTotal);
          setGridDataState({ skip: 0, take: gridDataState.take });
        });
        
        console.log('✅ Grid state updated with filtered results');
      }
      
      console.log('✅ Filters applied successfully', {
        totalResults: detailsResponse.data?.totalElements || detailsResponse.data?.length || 0
      });
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
      // 🎯 CHECK FOR SAVED STATE FIRST - prevent visual flicker
      if (typeof window !== 'undefined') {
        const savedStateRaw = sessionStorage.getItem('invoices_page_state');
        if (savedStateRaw) {
          try {
            const savedState = JSON.parse(savedStateRaw);
            
            // Check if state is recent (within last 5 minutes)
            if (Date.now() - savedState.timestamp <= 5 * 60 * 1000) {
              console.log('⏭️ SSR: Found fresh saved state, skipping SSR initialization - restoration will handle it');
              hasRestoredState.current = true; // Mark that we're in restoration mode
              return; // Skip SSR initialization, let restoration handle everything
            } else {
              console.log('⏱️ SSR: Saved state is too old, proceeding with SSR initialization');
              sessionStorage.removeItem('invoices_page_state');
            }
          } catch (error) {
            console.error('❌ SSR: Error parsing saved state:', error);
            sessionStorage.removeItem('invoices_page_state');
          }
        }
      }
      
      // 🛡️ GUARD: If restoration has already been processed, don't run SSR init again
      if (hasRestoredState.current) {
        console.log('🛡️ SSR: State restoration already processed, skipping SSR init');
        return;
      }
      
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
          value: item.value || item.amount || item.spend || item.totalSpend || 0,
          url: item.url || null,
          clickKey: item.clickKey || null
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
      
      // Initialize Product Categories - populate from API response only
      console.log('Filtering for Product Categories from:', selectLists);
      const productCategoryList = selectLists.find(list => list.name === 'productcategory');
      if (productCategoryList && productCategoryList.items) {
        setProductCategories(productCategoryList.items);
        setSelectedProductCategory([]); // Empty array for MultiSelect
        console.log('Set categories:', productCategoryList.items);
      } else {
        setProductCategories([]);
        setSelectedProductCategory([]); // Empty array for MultiSelect
      }
      
      // Initialize Product Names - populate from API response only
      const productNameList = selectLists.find(list => list.name === 'productname');
      if (productNameList && productNameList.items) {
        const validProducts = productNameList.items.filter(item => item.label && item.value);
        setProductNames(validProducts);
        setSelectedProductName([]); // Empty array for MultiSelect
        console.log('Set products:', validProducts);
      } else {
        setProductNames([]);
        setSelectedProductName([]); // Empty array for MultiSelect
      }
      
      // Initialize Subscription IDs - populate from API response only
      const subscriptionIdList = selectLists.find(list => list.name === 'subscriptionid');
      if (subscriptionIdList && subscriptionIdList.items) {
        setSubscriptionIds(subscriptionIdList.items);
        setSelectedSubscriptionId([]); // Empty array for MultiSelect
        console.log('Set subscriptions:', subscriptionIdList.items);
      } else {
        setSubscriptionIds([]);
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

  // 🔄 CLIENT-SIDE INIT: When rendered in client-side mode (SSR skipped), auto-fetch data.
  // This surfaces 401s immediately so the Axios interceptor can redirect to login.
  useEffect(() => {
    if (mode !== 'client-side') return;
    if (!selectedSoldToId) return;
    fetchProviders();
    // fetchProviders is stable (useCallback with [selectedSoldToId])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedSoldToId]);

  // 🔄 STATE RESTORATION: Check for saved page state after SSR initialization
  useEffect(() => {
    // Only run in SSR mode with initial data
    if (mode !== 'ssr' || !initialData || isGlobalLoading) {
      return;
    }

    // Immediate check for saved state - no delay needed since SSR init checks for this
    const restoreState = async () => {
      if (typeof window === 'undefined') return;
      
      const savedState = sessionStorage.getItem('invoices_page_state');
      if (!savedState) return;
      
      try {
        const state = JSON.parse(savedState);
        
        // Check if state is recent (within last 5 minutes)
        if (Date.now() - state.timestamp > 5 * 60 * 1000) {
          console.log('⏱️ Saved state is too old, ignoring');
          sessionStorage.removeItem('invoices_page_state');
          return;
        }
        
        console.log('🔄 Found saved invoices page state:', state);
        
        // 🛡️ IMMEDIATELY clear saved state to prevent multiple restoration runs
        sessionStorage.removeItem('invoices_page_state');
        
        // Check if we need to restore (if current state is different from saved state)
        const needsRestore = 
          state.selectedProvider?.abbreviation !== selectedProvider?.abbreviation ||
          state.selectedMonth?.value !== selectedMonth?.value ||
          state.selectedCustomer?.value !== selectedCustomer?.value;
        
        if (!needsRestore) {
          console.log('✅ Current state matches saved state, no restoration needed');
          return;
        }
        
        console.log('🔄 Restoring invoices page state...');
        
        // 🎯 IMMEDIATELY set ALL values from saved state (optimistic UI)
        // This prevents "null" flicker - user sees correct values right away
        // API calls will then populate the dropdown options arrays to validate
        if (state.selectedProvider && state.selectedProvider.abbreviation !== selectedProvider?.abbreviation) {
          setSelectedProvider(state.selectedProvider);
          setApiEndpoint(state.apiEndpoint);
        }
        
        if (state.selectedMonth && state.selectedMonth.value) {
          console.log('🎯 RESTORE: Setting month immediately:', state.selectedMonth);
          setSelectedMonth(state.selectedMonth);
        }
        
        if (state.selectedInvoiceNumber && state.selectedInvoiceNumber.value) {
          console.log('🎯 RESTORE: Setting invoice immediately:', state.selectedInvoiceNumber);
          setSelectedInvoiceNumber(state.selectedInvoiceNumber);
        }
        
        if (state.selectedCustomer && state.selectedCustomer.value) {
          console.log('🎯 RESTORE: Setting customer immediately:', state.selectedCustomer);
          // 🎯 Pre-populate customerNames array to prevent layout shift when dropdown appears
          // This ensures the dropdown exists immediately with the saved customer
          setCustomerNames([state.selectedCustomer]);
          setSelectedCustomer(state.selectedCustomer);
        }
        
        // Now fetch data in background to populate dropdown options arrays
        // Small delay to let provider state update, then fetch data with restored filters
        setTimeout(async () => {
          console.log('📡 RESTORE: Step 1 - Fetching invoice months for provider:', state.apiEndpoint);
          
          try {
            // 🎯 STEP 1: Fetch invoice months for the restored provider
            const monthsResponse = await fetchInvoiceMonthsServer(selectedSoldToId, state.apiEndpoint);
            
            if (monthsResponse.error) {
              throw new Error(monthsResponse.error);
            }
            
            console.log('📅 RESTORE: Invoice months fetched:', monthsResponse.data?.length, 'months');
            setInvoiceMonths(monthsResponse.data || []);
            
            // 🎯 STEP 2: Fetch consolidated data with restored filters
            console.log('📡 RESTORE: Step 2 - Fetching data with restored filters...');
            
            // Build filter for customer
            let customerFilter = null;
            if (state.selectedCustomer?.value && state.selectedCustomer.value !== 'All' && state.selectedCustomer.value !== 'all') {
              customerFilter = state.selectedCustomer.value;
            }
            
            const consolidatedResponse = await fetchConsolidatedInvoiceData(
              selectedSoldToId,
              state.apiEndpoint,
              state.selectedMonth?.value,
              state.selectedInvoiceNumber?.value || null,
              customerFilter
            );
            
            if (consolidatedResponse.error) {
              throw new Error(consolidatedResponse.error);
            }
            
            const { summaryResponse, trendResponse, detailsResponse } = consolidatedResponse.data;
            
            // Update data from response
            if (summaryResponse?.data) {
              console.log('🔄 RESTORE: Processing summary response data');
              
              setTotalSpend(summaryResponse.data?.spendPeriod?.totalSpend || 0);
              setMonthlyDifference(summaryResponse.data?.spendPeriod?.differenceTotalSpend || 0);
              setMonthlyDifferencePercent(summaryResponse.data?.spendPeriod?.differencePercentSpend || null);
              setHaveDifferencePercent(summaryResponse.data?.spendPeriod?.haveDifferencePercentSpend || false);
              setInvoiceStatus(summaryResponse.data?.invoiceStatus || '');
              setIsReseller(summaryResponse.data?.isReseller || false);
              setHaveUnbilledConsumption(summaryResponse.data?.haveUnbilledConsumption || false);
              
              const spendData = summaryResponse.data?.spendPeriod?.spend || [];
              const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
              
              console.log('📊 RESTORE: Chart data source:', {
                hasChartData: !!summaryResponse.data?.chartData,
                hasBreakdown: !!summaryResponse.data?.breakdown,
                hasSpend: spendData.length > 0,
                usingSource: summaryResponse.data?.chartData ? 'chartData' : (summaryResponse.data?.breakdown ? 'breakdown' : 'spendPeriod.spend'),
                rawData: chartData
              });
              
              const transformedChartData = chartData.map(item => ({
                label: item.label || item.category || 'Unknown',
                value: item.value || 0,
                url: item.url || null,
                clickKey: item.clickKey || null
              }));
              
              console.log('📊 RESTORE: Setting breakdown chart data:', {
                length: transformedChartData.length,
                data: transformedChartData
              });
              
              setBreakdownChartData(transformedChartData);
              
              // 🎯 STEP 3: Extract and set dropdown options from selectLists
              const selectLists = summaryResponse.data?.selectLists || [];
              
              // Extract invoice numbers
              const invoiceNumbersList = selectLists.find(list => list.name === 'invoicenumber');
              if (invoiceNumbersList && invoiceNumbersList.items) {
                console.log('📋 RESTORE: Invoice numbers extracted:', invoiceNumbersList.items?.length, 'invoices');
                setInvoiceNumbers(invoiceNumbersList.items);
              } else {
                console.log('⚠️ RESTORE: No invoice numbers found in selectLists');
                setInvoiceNumbers([]);
              }
              
              // Extract customer names (tenantId) WITHOUT resetting selectedCustomer
              const tenantIdList = selectLists.find(list => list.name === 'tenantId');
              if (tenantIdList && tenantIdList.items) {
                console.log('👥 RESTORE: Customer names extracted:', tenantIdList.items?.length, 'customers');
                setCustomerNames(tenantIdList.items);
                // NOTE: NOT setting selectedCustomer here - it was already set at start
              } else {
                console.log('⚠️ RESTORE: No customer names found in selectLists');
                setCustomerNames([{ label: 'All Customers', value: 'All' }]);
              }
              
              // Update other filter dropdowns (product categories, names, subscriptions)
              // We'll manually update these to avoid resetting customer
              const productCategoryList = selectLists.find(list => list.name === 'productcategory');
              if (productCategoryList && productCategoryList.items) {
                setProductCategories(productCategoryList.items);
              } else {
                setProductCategories([]);
              }
              
              const productNameList = selectLists.find(list => list.name === 'productname');
              if (productNameList && productNameList.items) {
                const validProducts = productNameList.items.filter(item => item.label && item.value);
                setProductNames(validProducts);
              } else {
                setProductNames([]);
              }
              
              const subscriptionIdList = selectLists.find(list => list.name === 'subscriptionid');
              if (subscriptionIdList && subscriptionIdList.items) {
                setSubscriptionIds(subscriptionIdList.items);
              } else {
                setSubscriptionIds([]);
              }
              
              console.log('✅ RESTORE: Dropdown options populated - values already set at start of restoration');
            }
            
            if (trendResponse?.data) {
              setTrendData(trendResponse.data?.chartData || []);
            }
            
            if (detailsResponse?.data) {
              setGridData(detailsResponse.data?.content || detailsResponse.data || []);
              setGridTotal(detailsResponse.data?.totalElements || detailsResponse.data?.length || 0);
            }
            
            console.log('✅ Data restored with saved filters');
            
            // Note: Saved state already cleared at the start of restoration
          } catch (error) {
            console.error('❌ Error restoring data:', error);
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ Error parsing saved state:', error);
      }
    };
    
    // Execute restoration immediately
    restoreState();
  }, [mode, initialData, isGlobalLoading, selectedProvider, selectedMonth, selectedCustomer, selectedSoldToId]);

  const onChartClick = function (e) {
    const { url, label, group } = e.dataItem || {};
    if (url) {
      if (typeof window !== 'undefined') {
        // Prepare navigation context with all filters
        const context = {
          label: label || '',
          month: selectedMonth?.value || '',
          provider: apiEndpoint || '',
          customerValue: selectedCustomer?.value || 'All',
          invoiceNumber: selectedInvoiceNumber?.value || null,
        };
        
        // Store in sessionStorage for client-side access
        sessionStorage.setItem('navigationContext', JSON.stringify(context));
        
        // Also set as cookie for server-side access
        document.cookie = `billed_navigation=${encodeURIComponent(JSON.stringify(context))}; path=/; max-age=1800`;
        
        // Store current invoices page state for restoration on back navigation
        const invoicesPageState = {
          selectedProvider: selectedProvider,
          selectedMonth: selectedMonth,
          selectedInvoiceNumber: selectedInvoiceNumber,
          selectedCustomer: selectedCustomer,
          apiEndpoint: apiEndpoint,
          timestamp: Date.now()
        };
        sessionStorage.setItem('invoices_page_state', JSON.stringify(invoicesPageState));
        
        console.log('📤 Navigation context stored:', context);
        console.log('💾 Invoices page state saved for restoration:', invoicesPageState);
        
        router.push(url);
      }
    }
  };

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
            {/* Links Column - View Unbilled Usage and Archera RI Reporting stacked vertically */}
            {(haveUnbilledConsumption && apiEndpoint !== 'aws' || hasReservedInstanceOrAzureSavingsPlan && apiEndpoint !== 'adobe') && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                {/* View Unbilled Usage Link - Show if haveUnbilledConsumption is true and provider is not AWS */}
                {haveUnbilledConsumption && apiEndpoint !== 'aws' && (
                  isStatsLoading ? (
                    <div style={{ width: '180px', height: '35px', flexShrink: 0 }}>
                      <Skeleton style={{ width: '100%', height: '100%' }} />
                    </div>
                  ) : (
                    <Link href="#" className="kpi-card unbilled-usage-link">
                      View Unbilled Usage
                    </Link>
                  )
                )}

                {/* Archera RI Reporting - Show if hasReservedInstanceOrAzureSavingsPlan is true and provider is not Adobe */}
                {hasReservedInstanceOrAzureSavingsPlan && apiEndpoint !== 'adobe' && (
                  isStatsLoading ? (
                    <div style={{ width: '180px', height: '35px', flexShrink: 0 }}>
                      <Skeleton style={{ width: '100%', height: '100%' }} />
                    </div>
                  ) : (
                    <div>
                      <Link href="#" className="kpi-card archera-link">
                        <Tooltip anchorElement="target" position="right">
                          <span title="Insight has partnered with Archera for this reporting. You can purchase Archera for free on buy.insight.com">
                            <ArcheraIcon className="archera-icon" />
                          </span>
                        </Tooltip>
                        Archera RI Reporting
                      </Link>
                    </div>
                  )
                )}
              </div>
            )}

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
                <Chart 
                  key={`breakdown-chart-${selectedProvider?.abbreviation}-${selectedMonth?.value}-${selectedCustomer?.value || 'all'}-${breakdownChartData.length}`}
                  onRefresh={handleChartRefresh}
                  seriesColors={getInsightThemeColors()}
                  onSeriesClick={onChartClick}
                >
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
          {isChartsLoading ? (
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
              {trendChartLoading ? (
                <Skeleton style={{ width: '100%', height: '300px' }} />
              ) : (
                <Chart 
                  key={`${trendingChartType}-${formattedTrendData.length}`}
                  onRefresh={handleChartRefresh}
                  seriesColors={getInsightThemeColors()}
                >
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
              )}
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

            {/* Product Name - Only visible for Microsoft provider */}
            {apiEndpoint === 'microsoft' && (
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
            )}

            {/* Subscription ID - Only visible for Microsoft provider */}
            {apiEndpoint === 'microsoft' && (
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
            )}

            <div className="">
              <button 
                className="apply-filters-btn" 
                onClick={handleApplyFilters}
                disabled={isApplyFiltersDisabled}
              >
                Apply Filters
              </button>&nbsp;
              <DownloadButton
                requestTypeID="Billing_Items"
                fileName="Invoice-Report"
                soldToId={selectedSoldToId}
                invoiceMonth={selectedMonth?.value}
                filterState={typeof window !== 'undefined' ? window.location.search : ''}
                gridTotalElements={gridTotal}
                fillMode="outline"
                className="k-grid-download"
                title="Schedule Download"
              >
                <ImportIcon className="svg-style-sm" />
              </DownloadButton>
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