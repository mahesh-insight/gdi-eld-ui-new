"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Skeleton } from '@progress/kendo-react-indicators';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Chart } from '@progress/kendo-react-charts';
import request from '@/lib/api/request';
import { exceptionHandler } from '@/lib/utils';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import { getInsightThemeColors } from '@/lib/chartColors';
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

  // Section-specific loading states - more granular control
  const [providerSectionLoading, setProviderSectionLoading] = useState(mode !== 'ssr');
  const [monthSectionLoading, setMonthSectionLoading] = useState(mode !== 'ssr');
  const [invoiceSectionLoading, setInvoiceSectionLoading] = useState(mode !== 'ssr');
  const [statsSectionLoading, setStatsSectionLoading] = useState(mode !== 'ssr');
  const [chartsSectionLoading, setChartsSectionLoading] = useState(mode !== 'ssr');
  const [gridSectionLoading, setGridSectionLoading] = useState(mode !== 'ssr');
  const [filtersSectionLoading, setFiltersSectionLoading] = useState(mode !== 'ssr');
  const [chartTypeLoading, setChartTypeLoading] = useState(false);
  
  // 🔍 DEBUG: Log initial loading states
  console.log('🔄 DEBUG: Initial loading states:', {
    mode,
    providerLoading: mode !== 'ssr',
    monthLoading: mode !== 'ssr',
    invoiceLoading: mode !== 'ssr',
    statsLoading: mode !== 'ssr',
    chartsLoading: mode !== 'ssr',
    gridLoading: mode !== 'ssr',
    filtersLoading: mode !== 'ssr'
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
  const [apiEndpoint, setApiEndpoint] = useState(mode === 'ssr' ? (initialData?.defaultProvider?.abbreviation || 'microsoft') : 'microsoft');

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

  // Additional filter states with default 'All' values
  const [productCategories, setProductCategories] = useState([{ label: 'All', value: 'all' }]);
  const [selectedProductCategory, setSelectedProductCategory] = useState({ label: 'All', value: 'all' });
  const [productNames, setProductNames] = useState([{ label: 'All', value: 'all' }]);
  const [selectedProductName, setSelectedProductName] = useState({ label: 'All', value: 'all' });
  const [subscriptionIds, setSubscriptionIds] = useState([{ label: 'All', value: 'all' }]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState({ label: 'All', value: 'all' });
  
  // Invoice breakdown chart data with fallback
  const [breakdownChartData, setBreakdownChartData] = useState(() => {
    if (mode === 'ssr' && initialData?.summaryResponse?.data) {
      const chartData = initialData.summaryResponse.data.chartData || 
                       initialData.summaryResponse.data.breakdown || 
                       [];
      
      // Transform chart data for BasicGroupedChart component
      const transformedChartData = chartData.map(item => ({
        group: item.label || item.category || 'Unknown',
        value: item.value || 0,
        label: item.label || item.category || 'Unknown'
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
        // Try to parse as date and format to month/year
        const date = new Date(item.group);
        if (!isNaN(date.getTime())) {
          formattedGroup = date.toLocaleDateString('en-US', { 
            month: 'long', 
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

      // Set default provider (first one or microsoft)
      const defaultProvider = response.data.find(p => p.abbreviation === 'microsoft') || response.data[0];
      if (defaultProvider) {
        console.log('✅ Setting default provider:', defaultProvider);
        setSelectedProvider(defaultProvider);
        setApiEndpoint(defaultProvider.abbreviation);
        // Trigger next API call
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
  const fetchInitialInvoiceMonths = useCallback(async (abbreviation = apiEndpoint) => {
    if (!selectedSoldToId || !abbreviation) return;

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
            const spendData = summaryResponse.data?.spendPeriod?.spend || [];
            const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
            
            // Transform chart data for BasicGroupedChart component
            const transformedChartData = chartData.map(item => ({
              group: item.label || item.category || 'Unknown',
              value: item.value || 0,
              label: item.label || item.category || 'Unknown'
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
        }
      }
    } catch (error) {
      console.error('fetchInitialInvoiceMonths error:', error);
      setErrorState(exceptionHandler(error));
      // Clear loading states even on error
      setSectionLoadingStates(false);
    }
  }, [selectedSoldToId, apiEndpoint]);

  // Event handlers for dropdown changes - only trigger on user interaction
  const handleProviderChange = async (event) => {
    const newProvider = event.value; // Kendo uses event.value not event.target.value
    console.log('👤 USER INTERACTION: Provider changed to:', newProvider);
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

    // Show skeletons for ALL sections EXCEPT provider section
    setSectionLoadingStates(true, ['provider']);

    // Client-side API call triggered by user interaction
    console.log('🔄 Fetching data for user-selected provider:', newProvider.abbreviation);
    await fetchInitialInvoiceMonths(newProvider.abbreviation);
  };

  const handleMonthChange = async (event) => {
    const newMonth = event.value; // Kendo uses event.value not event.target.value
    console.log('👤 USER INTERACTION: Month changed to:', newMonth);
    setSelectedMonth(newMonth);
    
    // Reset dependent states
    setInvoiceNumbers([]);
    setSelectedInvoiceNumber(null);
    setTotalSpend(0);
    setTrendData([]);
    setGridData([]);

    // Make consolidated fetch with invoice number filter
    const abbreviation = selectedProvider?.abbreviation || apiEndpoint;
    const monthValue = formatMonthValue(newMonth?.value || newMonth);
    
    console.log('🔄 CLIENT-SIDE: Month change processing for user selection:', { newMonth, monthValue, abbreviation });
    
    // Show skeletons for ALL sections EXCEPT provider and month sections
    setSectionLoadingStates(true, ['provider', 'month']);
    
    const fetchStart = Date.now();
    try {
      // Use consolidated call with no invoice filter (will get 'all' by default)
      const consolidatedResponse = await fetchConsolidatedInvoiceData(
        selectedSoldToId,
        abbreviation,
        monthValue,
        null // No specific invoice filter for month change
      );
      
      const fetchTime = Date.now() - fetchStart;
      console.log(`⚡ Month change fetch: ${fetchTime}ms (${fetchTime < 200 ? '🟢 CACHED' : '🟡 API'})`);
      
      if (consolidatedResponse.error) {
        throw new Error(consolidatedResponse.error);
      }

      const { summaryResponse, trendResponse, detailsResponse } = consolidatedResponse.data;
      
      // Update data from consolidated response
      if (summaryResponse?.data) {
        const selectLists = summaryResponse.data?.selectLists || [];
        
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
        const spendData = summaryResponse.data?.spendPeriod?.spend || [];
        const chartData = summaryResponse.data?.chartData || summaryResponse.data?.breakdown || spendData;
        
        // Transform chart data for BasicGroupedChart component
        const transformedChartData = chartData.map(item => ({
          group: item.label || item.category || 'Unknown',
          value: item.value || 0,
          label: item.label || item.category || 'Unknown'
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
      
      // Start preloading adjacent months
      preloadAdjacentMonths(monthValue);
      
    } catch (error) {
      console.error('Month change error:', error);
      setErrorState(exceptionHandler(error));
    } finally {
      // Minimal loading time for smooth UX (prevent flash)
      const minLoadTime = 150;
      const elapsed = Date.now() - fetchStart;
      const remainingTime = Math.max(0, minLoadTime - elapsed);
      
      setTimeout(() => {
        setSectionLoadingStates(false, ['provider', 'month']);
      }, remainingTime);
    }
  };

  // Helper function to update filter dropdowns from selectLists
  const updateFilterDropdowns = (selectLists) => {
    // Update Product Categories
    const productCategoryList = selectLists.find(list => list.name === 'productcategory');
    const allCategoryOption = { label: 'All', value: 'all' };
    if (productCategoryList && productCategoryList.items) {
      const categoriesWithAll = [allCategoryOption, ...productCategoryList.items];
      setProductCategories(categoriesWithAll);
      setSelectedProductCategory(allCategoryOption);
    } else {
      setProductCategories([allCategoryOption]);
      setSelectedProductCategory(allCategoryOption);
    }
    
    // Update Product Names
    const productNameList = selectLists.find(list => list.name === 'productname');
    const allProductOption = { label: 'All', value: 'all' };
    if (productNameList && productNameList.items) {
      const productsWithAll = [allProductOption, ...productNameList.items.filter(item => item.label && item.value)];
      setProductNames(productsWithAll);
      setSelectedProductName(allProductOption);
    } else {
      setProductNames([allProductOption]);
      setSelectedProductName(allProductOption);
    }
    
    // Update Subscription IDs
    const subscriptionIdList = selectLists.find(list => list.name === 'subscriptionid');
    const allSubscriptionOption = { label: 'All', value: 'all' };
    if (subscriptionIdList && subscriptionIdList.items) {
      const subscriptionsWithAll = [allSubscriptionOption, ...subscriptionIdList.items];
      setSubscriptionIds(subscriptionsWithAll);
      setSelectedSubscriptionId(allSubscriptionOption);
    } else {
      setSubscriptionIds([allSubscriptionOption]);
      setSelectedSubscriptionId(allSubscriptionOption);
    }
  };

  const handleInvoiceNumberChange = async (event) => {
    const newInvoiceNumber = event.target.value;
    console.log('👤 USER INTERACTION: Invoice number changed to:', newInvoiceNumber);
    
    if (!newInvoiceNumber || newInvoiceNumber === selectedInvoiceNumber) return;
    
    setSelectedInvoiceNumber(newInvoiceNumber);
    
    // Show skeletons for ALL sections EXCEPT provider, month, and invoice sections
    setSectionLoadingStates(true, ['provider', 'month', 'invoice']);
    
    const fetchStart = Date.now();
    try {
      // Make consolidated fetch with invoice number filter
      const invoiceFilter = newInvoiceNumber?.value || newInvoiceNumber;
      console.log('🔄 CLIENT-SIDE: Fetching filtered data for user-selected invoice:', invoiceFilter);
      const consolidatedResponse = await fetchConsolidatedInvoiceData(
        selectedSoldToId,
        selectedProvider,
        formatMonthValue(selectedMonth),
        invoiceFilter
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
          group: item.label || item.category || 'Unknown',
          value: item.value || 0,
          label: item.label || item.category || 'Unknown'
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
      }, remainingTime);
    }
  };

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
  // Chart type change handler
  const handleChartTypeChange = useCallback(async (newType) => {
    setChartTypeLoading(true);
    setTrendingChartType(newType);
    setTimeout(() => setChartTypeLoading(false), 300);
  }, []);
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
      
      // Preload in background without blocking UI
      setTimeout(() => {
        Promise.all([
          fetchConsolidatedInvoiceData(
            selectedSoldToId,
            selectedProvider,
            prevMonthValue,
            null
          ).catch(err => console.log('📦 Preload failed for prev month:', err)),
          fetchConsolidatedInvoiceData(
            selectedSoldToId,
            selectedProvider,
            nextMonthValue,
            null
          ).catch(err => console.log('📦 Preload failed for next month:', err))
        ]);
      }, 1000); // Delay to not interfere with main data loading
    } catch (err) {
      console.log('⚠️ Preload calculation failed:', err);
    }
  }, [selectedSoldToId, selectedProvider]);

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
          group: item.label || item.category || item.name || item.productCategory || 'Unknown',
          value: item.value || item.amount || item.spend || item.totalSpend || 0,
          label: item.label || item.category || item.name || item.productCategory || 'Unknown'
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
        setSelectedProductCategory(allCategoryOption);
        console.log('Set categories:', categoriesWithAll);
      } else {
        setProductCategories([allCategoryOption]);
        setSelectedProductCategory(allCategoryOption);
      }
      
      // Initialize Product Names with 'All' as first option
      const productNameList = selectLists.find(list => list.name === 'productname');
      const allProductOption = { label: 'All', value: 'all' };
      if (productNameList && productNameList.items) {
        const productsWithAll = [allProductOption, ...productNameList.items.filter(item => item.label && item.value)];
        setProductNames(productsWithAll);
        setSelectedProductName(allProductOption);
        console.log('Set products:', productsWithAll);
      } else {
        setProductNames([allProductOption]);
        setSelectedProductName(allProductOption);
      }
      
      // Initialize Subscription IDs with 'All' as first option
      const subscriptionIdList = selectLists.find(list => list.name === 'subscriptionid');
      const allSubscriptionOption = { label: 'All', value: 'all' };
      if (subscriptionIdList && subscriptionIdList.items) {
        const subscriptionsWithAll = [allSubscriptionOption, ...subscriptionIdList.items];
        setSubscriptionIds(subscriptionsWithAll);
        setSelectedSubscriptionId(allSubscriptionOption);
        console.log('Set subscriptions:', subscriptionsWithAll);
      } else {
        setSubscriptionIds([allSubscriptionOption]);
        setSelectedSubscriptionId(allSubscriptionOption);
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
    if (mode === 'ssr') {
      console.log('🛡️ SAFETY: Forcing loading states OFF for SSR mode');
      setSectionLoadingStates(false);
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
    <div className="invoices-container">
      {/* Header Section with horizontal layout */}
      <div className="invoices-header-row">
        <div className="header-left">
          <h1>Invoice Reporting</h1>
        </div>
        <div className="header-right">
          <div className="header-stats">
            <div className="stat-item unbilled">
              {isStatsLoading ? (
                <a href="#" className="stat-link">
                  <Skeleton style={{ width: '150px', height: '20px' }} />
                </a>
              ) : (
                <a href="#" className="stat-link">View Unbilled Usage</a>
              )}
            </div>
            <div className="stat-item invoice-total">
              <div className="stat-content">
                {isStatsLoading ? (
                  <>
                    <span className="stat-label">
                      <Skeleton style={{ width: '90px', height: '16px', marginBottom: '4px' }} />
                    </span>
                    <span className="stat-value">
                      <Skeleton style={{ width: '60px', height: '20px' }} />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="stat-label">Invoice Total <span className="info-icon">ℹ️</span></span>
                    <span className="stat-value">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSpend)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="stat-item monthly-diff">
              <div className="stat-content">
                {isStatsLoading ? (
                  <>
                    <span className="stat-label">
                      <Skeleton style={{ width: '120px', height: '16px', marginBottom: '4px' }} />
                    </span>
                    <span className="stat-value">
                      <Skeleton style={{ width: '80px', height: '20px' }} />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="stat-label">Monthly Difference <span className="info-icon">ℹ️</span></span>
                    <span className="stat-value">$0.00 (0%)</span>
                  </>
                )}
              </div>
            </div>
            <div className="stat-item invoice-status">
              <div className="stat-content">
                {isStatsLoading ? (
                  <>
                    <span className="stat-label">
                      <Skeleton style={{ width: '100px', height: '16px', marginBottom: '4px' }} />
                    </span>
                    <div className="status-content">
                      <span className="status-badge">
                        <Skeleton style={{ width: '50px', height: '24px', marginRight: '8px' }} />
                      </span>
                      <button className="download-pdf" disabled>
                        <Skeleton style={{ width: '100px', height: '32px' }} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="stat-label">Invoice Status <span className="info-icon">ℹ️</span></span>
                    <div className="status-content">
                      <span className="status-badge">Paid</span>
                      <button className="download-pdf">Download PDF</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdowns Section - 70% width */}
      <div className="invoices-filters-section">
        <div className="filters-container">
          <div className="primary-filters">
            <div className="dropdown-group">
              {isProviderLoading ? (
                <label>
                  <Skeleton style={{ width: '60px', height: '16px', marginBottom: '4px' }} />
                </label>
              ) : (
                <label>Provider</label>
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

            <div className="dropdown-group">
              {isMonthLoading ? (
                <label>
                  <Skeleton style={{ width: '90px', height: '16px', marginBottom: '4px' }} />
                </label>
              ) : (
                <label>Invoice Month</label>
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
                />
              )}
            </div>

            <div className="dropdown-group">
              {isInvoiceLoading ? (
                <label>
                  <Skeleton style={{ width: '65px', height: '16px', marginBottom: '4px' }} />
                </label>
              ) : (
                <label>Invoice #</label>
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
              <h3>Invoice Breakdown by Product Category</h3>
              {breakdownChartData && breakdownChartData.length > 0 ? (
                <Chart onRefresh={() => {}} seriesColors={getInsightThemeColors()}>
                  <BasicGroupedChart
                    chartType="column"
                    title=""
                    subTitle=""
                    data={breakdownChartData}
                    categoryField="group"
                    valueField="value"
                    groupedByField="label"
                    categoryTitle=""
                    showCategoryLabels={true}
                    legendPosition="bottom"
                    legendTitle=""
                    legendVisible={false}
                    tooltipFormat="c2"
                    showLabels={true}
                    valueFormat="c2"
                    labelFormat="c2"
                    labelIncludeGroup={true}
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
              <div className="chart-title-skeleton">
                <Skeleton style={{ width: '200px', height: '24px', marginBottom: '8px' }} />
                <Skeleton style={{ width: '120px', height: '32px', marginBottom: '16px' }} />
              </div>
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
                apiEndPoint=""
                pageType="invoice"
              />
              <Chart style={{ height: '300px' }} seriesColors={getInsightThemeColors()}>
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

      {/* Additional Filters Section */}
      <div className="invoices-additional-filters">
        {isFiltersLoading ? (
          <div className="dropdown-row">
            <div className="dropdown-group">
              <label>
                <Skeleton style={{ width: '120px', height: '16px', marginBottom: '4px' }} />
              </label>
              <Skeleton style={{ width: '200px', height: '32px' }} />
            </div>
            <div className="dropdown-group">
              <label>
                <Skeleton style={{ width: '100px', height: '16px', marginBottom: '4px' }} />
              </label>
              <Skeleton style={{ width: '200px', height: '32px' }} />
            </div>
            <div className="dropdown-group">
              <label>
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
              <label>Product Category:</label>
              <DropDownList
                data={productCategories}
                textField="label"
                dataItemKey="value"
                value={selectedProductCategory}
                onChange={(e) => setSelectedProductCategory(e.value)}
                disabled={isFiltersLoading}
              />
            </div>

            <div className="dropdown-group">
              <label>Product Name:</label>
              <DropDownList
                data={productNames}
                textField="label"
                dataItemKey="value"
                value={selectedProductName}
                onChange={(e) => setSelectedProductName(e.value)}
                disabled={isFiltersLoading}
              />
            </div>

            <div className="dropdown-group">
              <label>Subscription ID:</label>
              <DropDownList
                data={subscriptionIds}
                textField="label"
                dataItemKey="value"
                value={selectedSubscriptionId}
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
            <h3>Invoice Details</h3>
            <Grid
              data={gridData}
              sortable={true}
              pageable={true}
              pageSize={20}
              sort={initialSort}
              style={{ height: '400px' }}
            >
              <GridColumn field="productName" title="Product Name" width="200px" />
              <GridColumn field="productCategory" title="Product Category" width="150px" />
              <GridColumn field="subscriptionId" title="Subscription ID" width="200px" />
              <GridColumn field="resourceGroup" title="Resource Group" width="150px" />
              <GridColumn field="quantity" title="Quantity" width="100px" />
              <GridColumn field="unitPrice" title="Unit Price" width="120px" format="{0:c}" />
              <GridColumn field="totalCost" title="Total Cost" width="120px" format="{0:c}" />
              <GridColumn field="invoiceDate" title="Invoice Date" width="120px" format="{0:MM/dd/yyyy}" />
            </Grid>
          </>
        )}
      </div>

    </div>
  );
}