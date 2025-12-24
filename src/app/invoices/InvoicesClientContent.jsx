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
  // Redux state (fallback for CSR mode)
  const loginResponse = useSelector((state) => state.auth?.loginResponse);
  const selectedSoldToId = mode === 'ssr' ? userContext?.soldToId : loginResponse?.userProfile?.defaultContext?.soldToId;

  // Section-specific loading states - more granular control
  const [providerSectionLoading, setProviderSectionLoading] = useState(mode !== 'ssr');
  const [monthSectionLoading, setMonthSectionLoading] = useState(mode !== 'ssr');
  const [invoiceSectionLoading, setInvoiceSectionLoading] = useState(mode !== 'ssr');
  const [statsSectionLoading, setStatsSectionLoading] = useState(mode !== 'ssr');
  const [chartsSectionLoading, setChartsSectionLoading] = useState(mode !== 'ssr');
  const [gridSectionLoading, setGridSectionLoading] = useState(mode !== 'ssr');
  const [filtersSectionLoading, setFiltersSectionLoading] = useState(mode !== 'ssr');
  const [chartTypeLoading, setChartTypeLoading] = useState(false);
  
  // Centralized section loading state manager
  const setSectionLoadingStates = (loading, excludeSections = []) => {
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
    if (!selectedSoldToId) return;

    try {
      // For initial page load, show ALL section skeletons
      setSectionLoadingStates(true);
      const response = await fetchProvidersServer(selectedSoldToId);

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('Providers response:', response.data);
      setProviders(response.data);

      // Set default provider (first one or microsoft)
      const defaultProvider = response.data.find(p => p.abbreviation === 'microsoft') || response.data[0];
      if (defaultProvider) {
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

  // Event handlers for dropdown changes
  const handleProviderChange = async (event) => {
    const newProvider = event.value; // Kendo uses event.value not event.target.value
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

    // Fetch new data for selected provider
    await fetchInitialInvoiceMonths(newProvider.abbreviation);
  };

  const handleMonthChange = async (event) => {
    const newMonth = event.value; // Kendo uses event.value not event.target.value
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
    
    console.log('🔄 Month change processing:', { newMonth, monthValue, abbreviation });
    
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
    console.log('Invoice number changed to:', newInvoiceNumber);
    
    if (!newInvoiceNumber || newInvoiceNumber === selectedInvoiceNumber) return;
    
    setSelectedInvoiceNumber(newInvoiceNumber);
    
    // Show skeletons for ALL sections EXCEPT provider, month, and invoice sections
    setSectionLoadingStates(true, ['provider', 'month', 'invoice']);
    
    const fetchStart = Date.now();
    try {
      // Make consolidated fetch with invoice number filter
      const invoiceFilter = newInvoiceNumber?.value || newInvoiceNumber;
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
    if (mode === 'ssr' && initialData?.summaryResponse?.data) {
      const selectLists = initialData.summaryResponse.data?.selectLists || [];
      setSummarySelectLists(selectLists);
      console.log('All selectLists from API:', selectLists);
      
      // Initialize Invoice Numbers - prioritize first actual invoice (not "All")
      const invoiceNumbersList = selectLists.find(list => list.name === 'invoicenumber');
      if (invoiceNumbersList && invoiceNumbersList.items) {
        setInvoiceNumbers(invoiceNumbersList.items);
        // Find first actual invoice number (not "All"), fallback to first item
        const defaultInvoice = invoiceNumbersList.items.find(item => 
          item.value !== 'All' && item.value !== 'all'
        ) || invoiceNumbersList.items[0];
        setSelectedInvoiceNumber(defaultInvoice);
        console.log('🏷️ SSR: Selected default invoice:', defaultInvoice);
        
        // If we selected an actual invoice number (not "All"), fetch filtered data
        if (defaultInvoice && defaultInvoice.value !== 'All' && defaultInvoice.value !== 'all' && selectedSoldToId && initialData.defaultProvider) {
          console.log('🎯 SSR: Fetching filtered data for invoice:', defaultInvoice.value);
          
          // Trigger filtered fetch with selected invoice number (optimized for cache)
          setTimeout(async () => {
            const fetchStart = Date.now();
            try {
              // Minimal loading states for cached responses - exclude dropdown sections for SSR
              setSectionLoadingStates(true, ['provider', 'month', 'invoice']);
              
              const consolidatedResponse = await fetchConsolidatedInvoiceData(
                selectedSoldToId,
                initialData.defaultProvider,
                formatMonthValue(initialData.firstMonth),
                defaultInvoice.value
              );
              
              const fetchTime = Date.now() - fetchStart;
              console.log(`⚡ Filtered fetch completed in ${fetchTime}ms (${fetchTime < 200 ? '🟢 CACHED' : '🟡 API'})`);
              
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
              
              // Start preloading adjacent months after main data loads
              preloadAdjacentMonths(initialData.firstMonth);
              
            } catch (error) {
              console.error('SSR filtered fetch error:', error);
              setErrorState(exceptionHandler(error));
            } finally {
              // Minimal loading time for smooth UX - show loading for at least 50ms for cached data
              const minLoadTime = 50;
              const elapsed = Date.now() - fetchStart;
              const remainingTime = Math.max(0, minLoadTime - elapsed);
              
              setTimeout(() => {
                setSectionLoadingStates(false, ['provider', 'month', 'invoice']);
              }, remainingTime);
            }
          }, 50); // Minimal delay for cached responses
        }
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
    }
  }, [mode, initialData, selectedSoldToId]);

  // Initial load for CSR mode only
  useEffect(() => {
    if (mode === 'csr' && selectedSoldToId) {
      fetchProviders();
    }
  }, [mode, selectedSoldToId, fetchProviders]);

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
                <Skeleton style={{ width: '150px', height: '20px' }} />
              ) : (
                <a href="#" className="stat-link">View Unbilled Usage</a>
              )}
            </div>
            <div className="stat-item invoice-total">
              <div className="stat-content">
                <span className="stat-label">Invoice Total <span className="info-icon">ℹ️</span></span>
                <span className="stat-value">
                  {isStatsLoading ? (
                    <Skeleton style={{ width: '60px', height: '20px' }} />
                  ) : (
                    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSpend)
                  )}
                </span>
              </div>
            </div>
            <div className="stat-item monthly-diff">
              <div className="stat-content">
                {isStatsLoading ? (
                  <>
                    <Skeleton style={{ width: '120px', height: '16px', marginBottom: '4px' }} />
                    <Skeleton style={{ width: '80px', height: '20px' }} />
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
                    <Skeleton style={{ width: '100px', height: '16px', marginBottom: '4px' }} />
                    <div className="status-content">
                      <Skeleton style={{ width: '50px', height: '24px', marginRight: '8px' }} />
                      <Skeleton style={{ width: '100px', height: '32px' }} />
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
                <Skeleton style={{ width: '60px', height: '16px', marginBottom: '4px' }} />
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
                <Skeleton style={{ width: '90px', height: '16px', marginBottom: '4px' }} />
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
                <Skeleton style={{ width: '65px', height: '16px', marginBottom: '4px' }} />
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
          <h3>Invoice Breakdown by Product Category</h3>
          {isChartsLoading ? (
            <Skeleton style={{ width: '100%', height: '300px' }} />
          ) : (
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
          )}
        </div>

        {/* Trending Chart */}
        <div className="invoices-trend-chart">
          <ChartTitleAndButtons
            title="Trending Monthly Spend"
            trendingChartType={trendingChartType}
            handleChartTypeChange={handleChartTypeChange}
            chartOptions={columnLineAreaOptions}
            dropDownList={true}
            apiEndPoint=""
            pageType="invoice"
          />
          {isChartsLoading ? (
            <Skeleton style={{ width: '100%', height: '300px' }} />
          ) : (
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
          )}
        </div>
      </div>

      {/* Additional Filters Section */}
      <div className="invoices-additional-filters">
        {isFiltersLoading ? (
          <div className="dropdown-row">
            <div className="dropdown-group">
              <Skeleton style={{ width: '120px', height: '16px', marginBottom: '4px' }} />
              <Skeleton style={{ width: '200px', height: '32px' }} />
            </div>
            <div className="dropdown-group">
              <Skeleton style={{ width: '100px', height: '16px', marginBottom: '4px' }} />
              <Skeleton style={{ width: '200px', height: '32px' }} />
            </div>
            <div className="dropdown-group">
              <Skeleton style={{ width: '110px', height: '16px', marginBottom: '4px' }} />
              <Skeleton style={{ width: '200px', height: '32px' }} />
            </div>
            <div className="">
              <Skeleton style={{ width: '100px', height: '36px' }} />
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
          <Skeleton style={{ width: '120px', height: '24px', marginBottom: '16px' }} />
        ) : (
          <h3>Invoice Details</h3>
        )}
        {isGridLoading ? (
          <Skeleton style={{ width: '100%', height: '400px' }} />
        ) : (
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
        )}
      </div>

    </div>
  );
}