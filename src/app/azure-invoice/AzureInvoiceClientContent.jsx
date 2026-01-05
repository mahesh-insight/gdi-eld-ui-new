"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { BasicChart } from '@/common/Charts/BasicChart';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import { BasicPieDoughnutChart } from '@/common/Charts/BasicPieDoughnutChart';
import { Chart } from '@progress/kendo-react-charts';
import { getInsightThemeColors } from '@/lib/chartColors';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import ErrorBoundary from '@/components/ErrorBoundary';
import Carousel from '@/components/Carousel/Carousel';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { Button } from '@progress/kendo-react-buttons';
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
  const [trendingPeriod, setTrendingPeriod] = useState('last6months');
  const [refreshChart, setRefreshChart] = useState(true);
  
  // Filter states
  const [filterProductCategory, setFilterProductCategory] = useState([]);
  const [filterProductName, setFilterProductName] = useState([]);
  const [filterSkuName, setFilterSkuName] = useState([]);
  
  // Tab state
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  // Error and loading states
  const [errorState, setErrorState] = useState(null);
  const [isLoading, setIsLoading] = useState(mode !== 'ssr');
  const [isLoadingMonthData, setIsLoadingMonthData] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(!extractedSummaryData);
  const [isLoadingCredits, setIsLoadingCredits] = useState(!extractedCreditsData);
  const [isLoadingTrends, setIsLoadingTrends] = useState(!extractedTrendsData);
  const [isLoadingTabData, setIsLoadingTabData] = useState(false);

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
      
      // Extract content array from pagination response
      const monthDetailContent = monthDetail?.content || monthDetail;
      const monthlyDifferenceContent = monthlyDifference?.content || monthlyDifference;
      
      console.log('🔍 SSR Data extraction debug:', {
        monthDetail,
        monthDetailContent,
        monthDetailContentLength: monthDetailContent?.length || 0,
        monthlyDifference,
        monthlyDifferenceContent,
        monthlyDifferenceContentLength: monthlyDifferenceContent?.length || 0,
        hasSelectLists: !!monthDetail?.selectLists
      });
      
      setCurrentMonthDetailData(monthDetailContent);
      setCurrentMonthlyDifferenceData(monthlyDifferenceContent);
      setIsLoading(false);
    }
  }, [mode, initialData]);

  useEffect(() => {
    if (mode === 'ssr') {
      setIsLoading(false);
    }
  }, [mode]);

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
    return monthData?.value || monthData?.date || monthData?.display;
  };

  // Month change handler
  const handleMonthChange = async (event) => {
    const newMonth = event.value;
    const monthValue = getMonthValue(newMonth);
    
    console.log('🔄 Month change triggered:', {
      oldMonth: selectedMonth,
      newMonth: newMonth,
      monthValue: monthValue,
      soldToId: selectedSoldToId,
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length
    });
    
    setSelectedMonth(newMonth);
    
    if (!accessToken || !selectedSoldToId) {
      setErrorState('Authentication required. Please refresh the page.');
      return;
    }

    // Show skeleton loaders IMMEDIATELY for ALL UI elements
    setIsLoadingMonthData(true);
    setIsLoadingSummary(true);
    setIsLoadingCredits(true);
    setIsLoadingTrends(true);
    setIsLoadingTabData(true);
    setIsLoading(true); // Master loading state for filters and other UI
    
    // Use setTimeout with 0 delay to ensure state updates render before API calls
    setTimeout(async () => {
      try {
        console.log('🔄 Month changed - making SINGLE CONSOLIDATED server action call for:', monthValue);
        console.log('🔑 Access Token available:', !!accessToken);
        console.log('🔑 soldToId:', selectedSoldToId);
      
      // Call the SERVER ACTION for consolidated data (like invoices page)
      // This makes ONE server-side call that fetches all data together
      const consolidatedResult = await fetchConsolidatedAzureInvoiceData(
        accessToken,
        selectedSoldToId,
        monthValue // Pass the month value
      );
      
      if (consolidatedResult.error) {
        console.error('❌ Consolidated fetch error:', consolidatedResult.error);
        throw new Error(consolidatedResult.error);
      }
      
      const consolidatedData = consolidatedResult.data;
      
      console.log('✅ Consolidated API response received:', {
        cached: consolidatedResult.cached,
        hasSummary: !!consolidatedData?.summary,
        hasCredits: !!consolidatedData?.credits,
        hasTrends: !!consolidatedData?.trend,
        hasMonthDetail: !!consolidatedData?.monthDetail,
        hasMonthlyDifference: !!consolidatedData?.monthlyDifference
      });
      
      // Update all state from the single consolidated response
      if (consolidatedData?.summary) {
        console.log('📊 Setting summary data');
        setCurrentSummaryData(consolidatedData.summary);
      } else {
        console.warn('⚠️ No summary data in consolidated response');
      }
      setIsLoadingSummary(false);
      
      if (consolidatedData?.credits) {
        console.log('💳 Setting credits data');
        setCurrentCreditsData(consolidatedData.credits);
      } else {
        console.warn('⚠️ No credits data in consolidated response');
      }
      setIsLoadingCredits(false);
      
      if (consolidatedData?.trend) {
        console.log('📈 Setting trends data');
        setCurrentTrendsData(consolidatedData.trend);
      } else {
        console.warn('⚠️ No trends data in consolidated response');
      }
      setIsLoadingTrends(false);
      
      // Update BOTH tab data states (not just the currently selected tab)
      // since the consolidated call fetches data for both tabs
      const monthDetailContent = consolidatedData?.monthDetail?.content || consolidatedData?.monthDetail;
      const monthlyDiffContent = consolidatedData?.monthlyDifference?.content || consolidatedData?.monthlyDifference;
      
      console.log('📄 Setting tab data:', {
        monthDetailCount: monthDetailContent?.length || 0,
        monthlyDiffCount: monthlyDiffContent?.length || 0
      });
      
      setCurrentMonthDetailData(monthDetailContent);
      setCurrentMonthlyDifferenceData(monthlyDiffContent);
      
      setIsLoadingTabData(false);
      setIsLoadingMonthData(false);
      setIsLoading(false); // Hide master loading state
      
      } catch (error) {
        console.error('❌ Month change error:', error);
        setErrorState('Failed to load data for selected month');
        // Hide all loaders on error
        setIsLoadingMonthData(false);
        setIsLoadingSummary(false);
        setIsLoadingCredits(false);
        setIsLoading(false);
        setIsLoadingTrends(false);
        setIsLoadingTabData(false);
      }
    }, 0); // End setTimeout
  };

  const handleChartRefresh = (chartOptions, themeOptions, chartInstance) => {
    setRefreshChart(false);
  };

  // Chart type handlers
  const handleChartTypeChange = useCallback((newType) => {
    console.log('🔄 Trending chart type changing to', newType);
    setTrendingChartType(newType);
  }, []);

  const handleTopNExpensiveProductsChartTypeChange = useCallback((newType) => {
    console.log('🔄 Top products chart type changing to', newType);
    setTopNExpensiveProductsChartType(newType);
  }, []);

  const handleTrendingPeriodChange = useCallback((event) => {
    setTrendingPeriod(event.value);
  }, []);

  const handleApplyFilters = useCallback(async () => {
    console.log('🔍 Applying filters:', {
      productCategory: filterProductCategory,
      productName: filterProductName,
      skuName: filterSkuName
    });
  }, [filterProductCategory, filterProductName, filterSkuName]);

  const handleDownload = useCallback(() => {
    console.log('💾 Download triggered');
  }, []);

  // Tab change handler - fetch monthly difference data when that tab is selected
  const handleTabSelect = useCallback(async (e) => {
    const newTabIndex = e.selected;
    setSelectedTabIndex(newTabIndex);
    
    // If Monthly Differences tab is selected (index 1) and we don't have data yet
    if (newTabIndex === 1 && (!currentMonthlyDifferenceData || currentMonthlyDifferenceData.length === 0)) {
      console.log('📊 Monthly Differences tab selected - fetching data...');
      
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
        
        console.log('📅 Monthly difference months:', {
          previousMonth: previousMonthValue,
          currentMonth: monthValue,
          apiPath: `${previousMonthValue}/${monthValue}`
        });
        
        // Import the API function
        const { fetchInvoiceMonthlyDifferenceDetail } = await import('@/lib/azureInvoiceApi');
        
        // Call monthly difference API with both previous and current month
        const response = await fetchInvoiceMonthlyDifferenceDetail({
          soldToId: selectedSoldToId,
          value: `${previousMonthValue}/${monthValue}?page=0&size=20`,
          filter: [],
          accessToken
        });
        
        console.log('✅ Monthly difference API response:', response);
        
        // Extract content from response
        const monthlyDiffContent = response?.content || response;
        
        console.log('📊 Monthly difference data extracted:', {
          responseType: typeof response,
          hasContent: !!response?.content,
          contentLength: monthlyDiffContent?.length || 0,
          isArray: Array.isArray(monthlyDiffContent)
        });
        
        setCurrentMonthlyDifferenceData(monthlyDiffContent);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Failed to fetch monthly difference data:', error);
        setIsLoading(false);
      }
    }
  }, [currentMonthlyDifferenceData, accessToken, selectedSoldToId, selectedMonth]);

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
    
    console.log('📊 Invoice Breakdown Data Debug:', {
      currentSummaryData,
      spendData,
      spendDataLength: spendData?.length || 0,
      mappedData,
      mappedDataLength: mappedData?.length || 0,
      mode
    });
    
    return mappedData;
  }, [currentSummaryData, mode]);

  const invoiceTrendData = useMemo(() => {
    console.log('🔍 Trending data raw:', currentTrendsData);
    
    let periodsData = [];
    if (currentTrendsData?.spendPeriod) {
      periodsData = currentTrendsData.spendPeriod;
    } else if (currentTrendsData?.chartData) {
      periodsData = currentTrendsData.chartData;
    } else if (Array.isArray(currentTrendsData)) {
      periodsData = currentTrendsData;
    }
    
    console.log('🔍 Periods data:', periodsData, 'Length:', periodsData?.length || 0);
    
    const monthsToShow = trendingPeriod === 'last12months' ? 12 : 6;
    const data = [];
    
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
    
    console.log('✅ Trending chart data:', data, 'Length:', data.length);
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
    
    console.log('📊 Top Expensive Products Debug:', {
      currentSummaryData,
      topNData,
      topNDataLength: topNData?.length || 0,
      mappedData,
      mappedDataLength: mappedData?.length || 0,
      mode
    });
    
    return mappedData;
  }, [currentSummaryData, mode]);

  // Filter options from summary API selectList
  const filterOptions = useMemo(() => {
    const selectLists = currentSummaryData?.selectLists || [];
    console.log('🔍 SelectList data:', selectLists);
    
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
    
    console.log('🔍 Mapped filter options:', options);
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

  return (
    <ErrorBoundary>
      <div className="azure-invoice-page">
        <div className="azure-invoice-container">
          <div className="azure-invoice-header">
            <div className="azure-invoice-header-top">
              <h1 className="azure-invoice-title">Azure Plan Invoice</h1>
              
              <div className="azure-invoice-kpi-cards">
                {/* Archera Link */}
                <div className="azure-invoice-kpi-card archera-link">
                  {isLoadingSummary ? (
                    <>
                      <div className="skeleton-loader" style={{ height: '18px', width: '100px', marginBottom: '12px' }}></div>
                      <div className="skeleton-loader" style={{ height: '36px', width: '140px' }}></div>
                    </>
                  ) : (
                    <>
                      <div className="azure-invoice-kpi-label">
                        <Tooltip anchorElement="target" position="right">
                          <span title="Insight has partnered with Archera for this reporting. You can purchase Archera for free on buy.insight.com">
                            <ArcheraIcon className="archera-icon" />
                          </span>
                        </Tooltip>
                        Archera RI Reporting
                      </div>
                    </>
                  )}
                </div>

                {/* Invoice Total */}
                <div className="azure-invoice-kpi-card invoice-total">
                  {isLoadingSummary ? (
                    <>
                      <div className="skeleton-loader skeleton-kpi-label"></div>
                      <div className="skeleton-loader skeleton-kpi-value"></div>
                    </>
                  ) : (
                    <>
                      <div className="azure-invoice-kpi-label">
                        Invoice Total
                        <Tooltip anchorElement="target" position="auto">
                          <SvgIcon icon={infoCircleIcon} size="small" className="info-icon" title="Taxes are not included in totals." />
                        </Tooltip>
                      </div>
                      <div className="azure-invoice-kpi-value invoice-total">
                        {formatCurrency(invoiceTotal)}
                      </div>
                    </>
                  )}
                </div>

                {/* Monthly Difference */}
                <div className="azure-invoice-kpi-card monthly-difference">
                  {isLoadingSummary ? (
                    <>
                      <div className="skeleton-loader skeleton-kpi-label-wide"></div>
                      <div className="skeleton-loader skeleton-kpi-value-wide"></div>
                    </>
                  ) : (
                    <>
                      <div className="azure-invoice-kpi-label">
                        Monthly Difference
                        {monthlyDifference > 0 ? (
                          <ArrowUpIcon className="svg-style arrow-icon" />
                        ) : monthlyDifference < 0 ? (
                          <ArrowDownIcon className="svg-style arrow-icon" />
                        ) : null}
                      </div>
                      <div className="azure-invoice-kpi-value monthly-difference">
                        {formatCurrency(Math.abs(monthlyDifference))}
                        <span> ({monthlyDifferencePercent.toFixed(2)}%)</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Invoice Credits */}
                <div className="azure-invoice-kpi-card invoice-credits">
                  {isLoadingCredits ? (
                    <>
                      <div className="skeleton-loader skeleton-kpi-label-credits"></div>
                      <div className="skeleton-loader skeleton-kpi-value"></div>
                    </>
                  ) : (
                    <>
                      <div className="azure-invoice-kpi-label">Invoice Credits</div>
                      <div className="azure-invoice-kpi-value invoice-credits">
                        {formatCurrency(invoiceCredits)}
                      </div>
                    </>
                  )}
                </div>
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
                  <div className="skeleton-loader" style={{ height: '32px', width: '200px' }}></div>
                )}
              </div>
              <a href="#" className="azure-invoice-view-usage-link">View Billed Usage</a>
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
                    {isLoadingCredits ? (
                      <div className="azure-invoice-skeleton-chart-title skeleton-chart-title-margin"></div>
                    ) : (
                      <p className="u-text-center -tiny">
                        Invoice Breakdown by Product Category
                      </p>
                    )}
                    {isLoadingCredits ? (
                      <div className="skeleton-loader skeleton-chart-body-large"></div>
                    ) : invoiceBreakdownData.length > 0 ? (

                      <Chart
                        onRefresh={handleChartRefresh}
                        className="chart1 clickableChart"
                      >
                        <BasicGroupedChart
                          chartType="column"
                          title=""
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
                          locale={'en_US'}
                        />
                      </Chart>
                    ) : (
                      <div className="chart-content chart-loading">
                        📊 Loading chart data...
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="o-grid__item u-1/1 u-1/2@desktop trending6MonthSpend azure-invoice-chart-container">
                    <div className="azure-invoice-chart-box">
                    {isLoadingTrends ? (
                      <div className="chart-header-layout">
                        <div className="azure-invoice-skeleton-chart-title skeleton-chart-title-180"></div>
                        <div className="skeleton-button-group">
                          <div className="azure-invoice-skeleton-filter-button skeleton-filter-button-120"></div>
                          <div className="azure-invoice-skeleton-filter-button skeleton-filter-button-100"></div>
                        </div>
                      </div>
                    ) : (
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
                      />
                    )}
                    {isLoadingTrends ? (
                      <div className="skeleton-loader skeleton-chart-body-large"></div>
                    ) : (
                      <Chart key={trendingChartType} onRefresh={() => {}} className="clickableChart">
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
                    </div>
                  </div>
                </div>
                {/* Slide 2: Top Expensive Products - Full Width */}
                <div className="azure-invoice-chart-container full-width">
                  <div className="azure-invoice-chart-box">
                  {isLoadingTrends ? (
                    <div className="chart-header-layout">
                      <div className="azure-invoice-skeleton-chart-title skeleton-chart-title-200"></div>
                      <div className="azure-invoice-skeleton-filter-button skeleton-filter-button-100"></div>
                    </div>
                  ) : (
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
                  )}
                  {isLoadingTrends ? (
                    <div className="chart-content chart-loading">
                      📊 Loading chart data...
                    </div>
                  ) : topNExpensiveProductsChartType === "bar" ? (
                    <Chart onRefresh={() => {}} className="chart3 chart-full-width">
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
                      />
                    </Chart>
                  ) : (
                    <Chart onRefresh={() => {}}>
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
                  </div>
                </div>
              </Carousel>
            </div>
          </div>
        </div>

        <div className="azure-invoice-container">
          {/* Filters Section */}
          <div className="azure-invoice-filters-section">
            {isLoading || isLoadingSummary ? (
              // Skeleton loaders for filters
              <div className="filter-container">
                <div className="filter-item">
                  <div className="azure-invoice-skeleton-filter-label filter-label-skeleton"></div>
                  <div className="azure-invoice-skeleton-filter-dropdown"></div>
                </div>
                
                <div className="filter-item">
                  <div className="azure-invoice-skeleton-filter-label filter-label-skeleton"></div>
                  <div className="azure-invoice-skeleton-filter-dropdown"></div>
                </div>
                
                <div className="filter-item">
                  <div className="azure-invoice-skeleton-filter-label filter-label-skeleton"></div>
                  <div className="azure-invoice-skeleton-filter-dropdown"></div>
                </div>
                
                <div className="filter-actions">
                  <div className="azure-invoice-skeleton-filter-button skeleton-filter-button-primary"></div>
                  <div className="azure-invoice-skeleton-filter-button skeleton-filter-button-download"></div>
                </div>
              </div>
            ) : (
              // Actual filters
              <div className="filter-container">
                <div className="filter-item">
                  <span className="label-text-bold">Product Category</span>
                  <MultiSelect
                    data={filterOptions.productCategories}
                    textField="label"
                    dataItemKey="value"
                    value={filterProductCategory}
                    name="msCategory"
                    placeholder="All"
                    onChange={(e) => setFilterProductCategory(e.value)}
                    className="filter-dropdown"
                  />
                </div>
                
                <div className="filter-item">
                  <span className="label-text-bold">Product Name</span>
                  <MultiSelect
                    data={filterOptions.productNames}
                    textField="label"
                    dataItemKey="value"
                    value={filterProductName}
                    name="msProducts"
                    placeholder="All"
                    onChange={(e) => setFilterProductName(e.value)}
                    className="filter-dropdown"
                  />
                </div>
                
                <div className="filter-item">
                  <span className="label-text-bold">Sku Name</span>
                  <MultiSelect
                    data={filterOptions.skuNames}
                    textField="label"
                    dataItemKey="value"
                    value={filterSkuName}
                    name="msSkuName"
                    placeholder="All"
                    onChange={(e) => setFilterSkuName(e.value)}
                    className="filter-dropdown"
                  />
                </div>
                
                <div className="filter-item filter-actions">
                  <Button
                    themeColor="primary"
                    onClick={handleApplyFilters}
                    className="apply-filters-button"
                  >
                    Apply Filters
                  </Button>
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
            {isLoading || isLoadingTabData ? (
              <div>
                <div className="tab-skeleton-header">
                  <div className="azure-invoice-skeleton-filter-button tab-skeleton-item-1"></div>
                  <div className="azure-invoice-skeleton-filter-button tab-skeleton-item-2"></div>
                </div>
                <div className="tab-content-padding">
                  <div className="skeleton-loader skeleton-row"></div>
                  <div className="skeleton-loader skeleton-row"></div>
                  <div className="skeleton-loader skeleton-row"></div>
                  <div className="skeleton-loader skeleton-row"></div>
                  <div className="skeleton-loader skeleton-row-last"></div>
                </div>
              </div>
            ) : (
              <TabStrip 
                selected={selectedTabIndex} 
                onSelect={handleTabSelect}
                className="azure-invoice-tabstrip tabstrip"
              >
              <TabStripTab title="Invoice Details">
                <div className="azure-invoice-tab-content">
                  {isLoadingTabData ? (
                    <div className="tab-content-padding">
                      <div className="skeleton-loader skeleton-row"></div>
                      <div className="skeleton-loader skeleton-row"></div>
                      <div className="skeleton-loader skeleton-row"></div>
                      <div className="skeleton-loader skeleton-row"></div>
                      <div className="skeleton-loader skeleton-row"></div>
                    </div>
                  ) : (() => {
                    // Enhanced data processing for Invoice Details
                    console.log('📋 Invoice Details tab data:', {
                      currentMonthDetailData,
                      type: typeof currentMonthDetailData,
                      isArray: Array.isArray(currentMonthDetailData),
                      keys: currentMonthDetailData ? Object.keys(currentMonthDetailData) : 'null',
                      length: currentMonthDetailData?.length || 'N/A',
                      firstItem: currentMonthDetailData?.[0] || 'N/A'
                    });
                    
                    // Handle different data structures
                    let processedData = null;
                    if (Array.isArray(currentMonthDetailData) && currentMonthDetailData.length > 0) {
                      processedData = currentMonthDetailData;
                    } else if (currentMonthDetailData?.data && Array.isArray(currentMonthDetailData.data)) {
                      processedData = currentMonthDetailData.data;
                    } else if (currentMonthDetailData?.content && Array.isArray(currentMonthDetailData.content)) {
                      processedData = currentMonthDetailData.content;
                    } else if (currentMonthDetailData?.items && Array.isArray(currentMonthDetailData.items)) {
                      processedData = currentMonthDetailData.items;
                    }
                    
                    // Convert invoiceDate strings to Date objects for proper Kendo Grid formatting
                    if (processedData && processedData.length > 0) {
                      processedData = processedData.map(item => ({
                        ...item,
                        invoiceDate: item.invoiceDate ? new Date(item.invoiceDate) : item.invoiceDate
                      }));
                    }
                    
                    console.log('📋 Processed Invoice Details data:', {
                      processedData,
                      processedLength: processedData?.length || 0
                    });
                    
                    if (processedData && processedData.length > 0) {``
                      return (
                        <GridTable 
                          data={processedData}
                          columns={azureInvoiceDetailsColumns(t)}
                          className="azure-invoice-details-grid"
                          loading={isLoading}
                        />
                      );
                    }
                  })()}
                </div>
              </TabStripTab>
              <TabStripTab title="Monthly Differences">
                <div className="azure-invoice-tab-content">
                  {isLoadingTabData ? (
                    <div className="tab-content-padding">
                      <div className="skeleton-loader skeleton-row"></div>
                      <div className="skeleton-loader skeleton-row"></div>
                      <div className="skeleton-loader skeleton-row"></div>
                      <div className="skeleton-loader skeleton-row"></div>
                      <div className="skeleton-loader skeleton-row"></div>
                    </div>
                  ) : (() => {
                    // Enhanced data processing for Monthly Differences
                    console.log('📊 Monthly Differences tab data:', {
                      currentMonthlyDifferenceData,
                      type: typeof currentMonthlyDifferenceData,
                      isArray: Array.isArray(currentMonthlyDifferenceData),
                      keys: currentMonthlyDifferenceData ? Object.keys(currentMonthlyDifferenceData) : 'null',
                      length: currentMonthlyDifferenceData?.length || 'N/A'
                    });
                    
                    // Handle different data structures
                    let processedData = null;
                    if (Array.isArray(currentMonthlyDifferenceData) && currentMonthlyDifferenceData.length > 0) {
                      processedData = currentMonthlyDifferenceData;
                    } else if (currentMonthlyDifferenceData?.data && Array.isArray(currentMonthlyDifferenceData.data)) {
                      processedData = currentMonthlyDifferenceData.data;
                    } else if (currentMonthlyDifferenceData?.content && Array.isArray(currentMonthlyDifferenceData.content)) {
                      processedData = currentMonthlyDifferenceData.content;
                    } else if (currentMonthlyDifferenceData?.items && Array.isArray(currentMonthlyDifferenceData.items)) {
                      processedData = currentMonthlyDifferenceData.items;
                    }
                    
                    if (processedData && processedData.length > 0) {
                      return (
                        <GridTable 
                          data={processedData}
                          columns={monthlyDifferenceColumns(t)}
                          className="azure-invoice-differences-grid"
                          loading={isLoading}
                        />
                      );
                    } else {
                      return (
                        <div className="no-data-message">
                          <p>No monthly difference data available</p>
                          <small>
                            Data available: {currentMonthlyDifferenceData ? 'Yes' : 'No'}
                            <br />
                            Data type: {typeof currentMonthlyDifferenceData}
                            <br />
                            Is Array: {Array.isArray(currentMonthlyDifferenceData) ? 'Yes' : 'No'}
                            <br />
                            Items count: {processedData?.length || 0}
                            <br />
                            Loading: {isLoading ? 'Yes' : 'No'}
                            <br />
                            Raw data keys: {currentMonthlyDifferenceData ? Object.keys(currentMonthlyDifferenceData).join(', ') : 'N/A'}
                          </small>
                        </div>
                      );
                    }
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