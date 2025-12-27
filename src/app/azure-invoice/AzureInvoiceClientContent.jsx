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
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { fetchConsolidatedAzureInvoiceData } from './actions';
import './AzureInvoice.css';

export default function AzureInvoiceClientContent(props) {
  const { mode, initialData, userContext, ssrPerformance } = props;
  
  // Get auth state from Redux - use defensive approach like invoices page
  const authState = useSelector((state) => state?.auth || {});
  const loginResponse = useSelector((state) => state?.auth?.loginResponse);
  const accessToken = useSelector((state) => state?.auth?.accessToken);
  
  // Extract user context and soldToId - same pattern as invoices
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

  // Extract data from SSR structure (same pattern as invoices page)
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

  console.log('🔍 Azure Invoice data extraction:', {
    mode,
    hasInitialData: !!initialData,
    monthsCount: extractedMonthsData?.length || 0,
    monthsData: extractedMonthsData,
    firstMonthStructure: extractedMonthsData[0] ? Object.keys(extractedMonthsData[0]) : 'no months',
    firstMonth: extractedMonthsData[0],
    hasSummary: !!extractedSummaryData,
    hasCredits: !!extractedCreditsData,
    hasTrends: !!extractedTrendsData,
    summaryStructure: extractedSummaryData ? Object.keys(extractedSummaryData) : 'null',
    initialDataKeys: initialData ? Object.keys(initialData) : 'null',
    selectedSoldToId,
    hasAccessToken: !!accessToken,
    accessTokenLength: accessToken?.length || 0
  });

  // Handle client-side mode with preserved Redux state
  if (mode === 'client-side') {
    console.log('⏭️ AzureInvoice: Client-side mode, reading auth state READ-ONLY');
    // IMPORTANT: Never modify auth state from page components
  }

  // Local state - initialize with extracted data
  const [monthsData, setMonthsData] = useState(extractedMonthsData);
  const [selectedMonth, setSelectedMonth] = useState(extractedMonthsData[0] || null);
  const [currentSummaryData, setCurrentSummaryData] = useState(extractedSummaryData);
  const [currentCreditsData, setCurrentCreditsData] = useState(extractedCreditsData);
  const [currentTrendsData, setCurrentTrendsData] = useState(extractedTrendsData);

  // Debug state initialization
  console.log('🔄 Component state initialized:', {
    monthsDataLength: monthsData?.length || 0,
    hasSelectedMonth: !!selectedMonth,
    hasSummary: !!currentSummaryData,
    hasCredits: !!currentCreditsData,
    hasTrends: !!currentTrendsData
  });
  
  // Chart type states
  const [trendingChartType, setTrendingChartType] = useState('column');
  const [topNExpensiveProductsChartType, setTopNExpensiveProductsChartType] = useState('bar');
  const [chartTypeLoading, setChartTypeLoading] = useState(false);
  const [topNExpensiveProductsChartTypeLoading, setTopNExpensiveProductsChartTypeLoading] = useState(false);

  // Error state
  const [errorState, setErrorState] = useState(null);

  // Loading states - initialize to false for SSR, true for CSR
  const [isLoading, setIsLoading] = useState(mode !== 'ssr');

  // Initialize data from SSR - EXACT same pattern as invoices page
  useEffect(() => {
    if (mode === 'ssr' && initialData) {
      console.log('🏗️ SSR: Azure invoice page initialized with server data only - no client API calls triggered');
      console.log('🔒 SSR: Preserving existing Redux auth state during azure invoice hydration');
      
      // Extract data from SSR response structure
      const months = initialData.monthsResponse?.data?.invoiceMonths || initialData.invoiceMonths || [];
      const summary = initialData.summaryResponse?.data || initialData.summary;
      const credits = initialData.creditsResponse?.data || initialData.credits;
      const trends = initialData.trendsResponse?.data || initialData.trend;
      
      console.log('🔍 SSR Data extracted:', {
        monthsCount: months.length,
        firstMonth: months[0],
        hasSummary: !!summary,
        hasCredits: !!credits,
        hasTrends: !!trends
      });
      
      if (months.length > 0) {
        setMonthsData(months);
        setSelectedMonth(months[0]);
        console.log('✅ Set monthsData with', months.length, 'months');
      }
      
      setCurrentSummaryData(summary);
      setCurrentCreditsData(credits);
      setCurrentTrendsData(trends);
      // Turn off loading states after SSR data is populated
      setIsLoading(false);
      console.log('✅ SSR: Azure invoice initialization complete with', months.length, 'months');
    } else {
      console.log('⚠️ SSR: No data available in initialData for Azure invoice');
    }
  }, [mode, initialData]);

  // Safety mechanism: Ensure loading states are off in SSR mode (same as invoices page)
  useEffect(() => {
    if (mode === 'ssr') {
      setIsLoading(false);
    }
  }, [mode]);

  // Helper function to format month names for display
  const formatMonthDisplay = (monthData) => {
    if (!monthData) return 'Unknown';
    
    // Try different possible date fields
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

  // Helper function to get month value for API calls
  const getMonthValue = (monthData) => {
    return monthData?.value || monthData?.date || monthData?.display;
  };

  // ✅ SSR BEHAVIOR: No automatic API calls on initial load
  // ✅ CSR BEHAVIOR: Only user interactions trigger client-side API calls  
  // Note: SSR provides initial data, client-side calls only triggered by user interactions

  // Month change handler - triggered by user interaction only with consolidated API call
  const handleMonthChange = async (event) => {
    const newMonth = event.value;
    const monthValue = getMonthValue(newMonth);
    
    console.log('👤 USER INTERACTION: Azure invoice month changed to:', {
      newMonth,
      monthValue,
      displayName: formatMonthDisplay(newMonth),
      hasAccessToken: !!accessToken,
      selectedSoldToId
    });
    
    // Update selected month immediately for UI feedback
    setSelectedMonth(newMonth);
    
    // Check if we have necessary authentication data
    if (!accessToken || !selectedSoldToId) {
      console.error('❌ Missing authentication data for API call:', {
        hasAccessToken: !!accessToken,
        hasSelectedSoldToId: !!selectedSoldToId
      });
      setErrorState('Authentication required. Please refresh the page.');
      return;
    }

    // Make consolidated API call to get all data for the selected month
    try {
      console.log('🔄 Fetching consolidated data for month:', monthValue);
      
      const result = await fetchConsolidatedAzureInvoiceData(
        accessToken,
        selectedSoldToId,
        monthValue
      );
      
      if (result.error) {
        console.error('❌ Error fetching month data:', result.error);
        setErrorState(result.error);
        return;
      }
      
      if (result.data) {
        console.log('✅ Updated data for month:', monthValue);
        
        // Update all state with new data from API
        const { data } = result;
        setCurrentSummaryData(data.summaryResponse?.data || data.summary);
        setCurrentCreditsData(data.creditsResponse?.data || data.credits);
        setCurrentTrendsData(data.trendsResponse?.data || data.trend);
        
        console.log('📊 Page updated with new month data');
      }
    } catch (error) {
      console.error('❌ Month change error:', error);
      setErrorState('Failed to load data for selected month');
    }
  };

  // Chart type change handlers (user interactions only)
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

  // Calculate summary values using useMemo (same pattern as invoices page)
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
    const spendData = currentSummaryData?.spend || currentSummaryData?.spendPeriod?.spend || [];
    return spendData.map(item => ({
      group: item?.label || 'Unknown',
      label: item?.label || 'Unknown', 
      value: item?.value || 0
    }));
  }, [currentSummaryData]);

  const invoiceTrendData = useMemo(() => {
    let periodsData = [];
    if (currentTrendsData?.spendPeriod) {
      periodsData = currentTrendsData.spendPeriod;
    } else if (Array.isArray(currentTrendsData)) {
      periodsData = currentTrendsData;
    }
    
    const last6Months = periodsData?.slice(-6) || [];
    const data = [];
    
    last6Months.forEach(period => {
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
    
    return data;
  }, [currentTrendsData]);

  const topNExpensiveProducts = useMemo(() => {
    const spendData = currentSummaryData?.topNExpensiveProducts?.spend || [];
    return spendData.map(item => ({
      group: item?.label || 'Unknown',
      label: item?.label || 'Unknown',
      value: item?.value || 0
    }));
  }, [currentSummaryData]);

  // Error display (same pattern as invoices page)
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
        <div className="azure-invoice-header">
          <h1>Azure Plan Invoice</h1>
          
          {/* Month Selector */}
          <div className="month-selector">
            <label>Invoice Month:</label>
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
                style={{ width: '250px' }}
              />
            ) : (
              <span>Loading months... (Found: {monthsData?.length || 0} months)</span>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Invoice Total</h3>
            <div className="amount">${invoiceTotal.toFixed(2)}</div>
          </div>
          <div className="summary-card">
            <h3>Monthly Difference</h3>
            <div className={`amount ${monthlyDifference >= 0 ? 'positive' : 'negative'}`}>
              ${Math.abs(monthlyDifference).toFixed(2)} ({monthlyDifferencePercent.toFixed(2)}%)
            </div>
          </div>
          <div className="summary-card">
            <h3>Invoice Credits</h3>
            <div className="amount">${invoiceCredits.toFixed(2)}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-section">
          {/* Invoice Breakdown Chart */}
          <div className="chart-container">
            <ChartTitleAndButtons
              title="Invoice Breakdown"
              chartType="bar"
              onChartTypeChange={() => {}}
              availableChartTypes={[{ type: 'bar', icon: 'chartBarIcon', title: 'Bar chart' }]}
            />
            {invoiceBreakdownData.length > 0 ? (
              <Chart onRefresh={() => {}} seriesColors={getInsightThemeColors()}>
                <BasicGroupedChart
                  chartType="bar"
                  title=""
                  subTitle=""
                  data={invoiceBreakdownData}
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
              <p>No breakdown data available</p>
            )}
          </div>

          {/* Trending Chart */}
          <div className="chart-container">
            <ChartTitleAndButtons
              title="Trending Monthly Spend"
              chartType={trendingChartType}
              onChartTypeChange={handleChartTypeChange}
              loading={chartTypeLoading}
              availableChartTypes={[
                { type: 'column', icon: 'chartColumnIcon', title: 'Column chart' },
                { type: 'line', icon: 'chartLineIcon', title: 'Line chart' }
              ]}
            />
            {invoiceTrendData.length > 0 ? (
              <Chart onRefresh={() => {}} seriesColors={getInsightThemeColors()}>
                <BasicGroupedChart
                  chartType={trendingChartType}
                  title=""
                  subTitle=""
                  data={invoiceTrendData}
                  categoryField="group"
                  valueField="value"
                  groupedByField="label"
                  categoryTitle=""
                  showCategoryLabels={true}
                  legendPosition="bottom"
                  legendTitle=""
                  legendVisible={true}
                  tooltipFormat="c2"
                  showLabels={false}
                  valueFormat="c2"
                  labelFormat="c2"
                  labelIncludeGroup={true}
                />
              </Chart>
            ) : (
              <p>No trending data available</p>
            )}
          </div>

          {/* Top Products Chart */}
          <div className="chart-container">
            <ChartTitleAndButtons
              title="Top Expensive Products"
              chartType={topNExpensiveProductsChartType}
              onChartTypeChange={handleTopNExpensiveProductsChartTypeChange}
              loading={topNExpensiveProductsChartTypeLoading}
              availableChartTypes={[
                { type: 'bar', icon: 'chartBarIcon', title: 'Bar chart' },
                { type: 'column', icon: 'chartColumnIcon', title: 'Column chart' }
              ]}
            />
            {topNExpensiveProducts.length > 0 ? (
              <BasicChart
                chartType={topNExpensiveProductsChartType}
                title=""
                data={topNExpensiveProducts}
                valueField="value"
                categoryField="group"
                legendPosition="bottom"
                tooltipFormat="c2"
                showLabels={true}
                valueFormat="c2"
                labelFormat="c2"
                height={400}
              />
            ) : (
              <p>No top products data available</p>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}