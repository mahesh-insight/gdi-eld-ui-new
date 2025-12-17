// src/app/azure-invoice/AzureInvoiceClientContent.jsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Chart, ChartArea, ChartSeries, ChartSeriesItem, ChartCategoryAxis, ChartCategoryAxisItem, ChartValueAxis, ChartValueAxisItem, ChartLegend } from '@progress/kendo-react-charts';
import { Skeleton } from '@progress/kendo-react-indicators';
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
  
  console.log('📦 Extracted SSR data:', {
    mode,
    hasInitialData: !!initialData,
    monthsCount: extractedMonthsData?.length || 0,
    hasSummary: !!extractedSummaryData,
    hasCredits: !!extractedCreditsData,
    hasTrends: !!extractedTrendsData
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

  // Calculate summary values using useMemo to ensure they update when state changes
  const invoiceTotal = useMemo(() => {
    console.log('🔍 Full currentSummaryData structure:', currentSummaryData);
    
    const value = currentSummaryData?.spendPeriod?.totalSpend || 0;
    console.log('💰 Invoice Total calculated:', value, 'from spendPeriod:', currentSummaryData?.spendPeriod);
    return value;
  }, [currentSummaryData]);

  const monthlyDifference = useMemo(() => {
    const value = currentSummaryData?.spendPeriod?.differenceTotalSpend || 0;
    console.log('📊 Monthly Difference calculated:', value);
    return value;
  }, [currentSummaryData]);

  const monthlyDifferencePercent = useMemo(() => {
    const value = currentSummaryData?.spendPeriod?.differencePercentSpend || 0;
    console.log('📈 Monthly Difference % calculated:', value);
    return value;
  }, [currentSummaryData]);

  const invoiceCredits = useMemo(() => {
    console.log('🔍 Full currentCreditsData structure:', currentCreditsData);
    
    const value = currentCreditsData?.totalSpend || 0;
    console.log('💳 Invoice Credits calculated:', value);
    return value;
  }, [currentCreditsData]);

  // Debug: Log calculated values when they change
  console.log('🔍 COMPONENT RENDER - Calculated values:', {
    invoiceTotal,
    monthlyDifference,
    monthlyDifferencePercent,
    invoiceCredits,
    selectedMonth: selectedMonth?.value,
    renderKey,
    forceUpdate,
    hasData: !!currentSummaryData,
    timestamp: Date.now()
  });

  // Extract spend breakdown using useMemo
  const spendBreakdown = useMemo(() => {
    const data = currentSummaryData?.spendPeriod?.spend || [];
    console.log('📊 Spend Breakdown calculated:', data);
    return data;
  }, [currentSummaryData]);
  
  // Prepare data for Kendo charts using useMemo
  const chartData = useMemo(() => {
    const data = spendBreakdown.map(item => ({
      category: item.label,
      value: item.value
    }));
    console.log('📈 Chart Data calculated:', data);
    return data;
  }, [spendBreakdown]);

  const trendsChartData = useMemo(() => {
    console.log('🔍 Full currentTrendsData structure:', currentTrendsData);
    
    let periodsData = [];
    if (currentTrendsData?.spendPeriod) {
      periodsData = currentTrendsData.spendPeriod;
    } else if (currentTrendsData?.data?.spendPeriod) {
      periodsData = currentTrendsData.data.spendPeriod;
    } else if (Array.isArray(currentTrendsData)) {
      periodsData = currentTrendsData;
    }
    
    const data = periodsData?.slice(-6).map(period => ({
      category: new Date(period.period).toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      value: period.totalSpend,
      azure: period.totalSpend * 0.6, // Approximate breakdown
      marketplace: period.totalSpend * 0.35,
      private: period.totalSpend * 0.05
    })) || [];
    console.log('📊 Trends Chart Data calculated:', data);
    return data;
  }, [currentTrendsData]);
  
  // Extract select list options
  const selectLists = currentSummaryData?.selectLists || [];
  const getSelectListItems = (name) => {
    const list = selectLists.find(list => list.name === name);
    return list?.items || [];
  };

  // Extract real invoice data from API response
  const invoiceDetails = currentSummaryData?.invoiceDetails || [];

  return (
    <ErrorBoundary>
      <div className="main_content_container azure-invoice-component" key={`azure-invoice-${selectedMonth?.value}-${renderKey}-${forceUpdate}-${invoiceTotal}-${invoiceCredits}`}>
        <div className="c-container">
          
          {/* Summary Cards Row */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '40px', 
            marginBottom: '30px',
            paddingTop: '20px'
          }}>
            {isLoading ? (
              // Skeleton loaders for summary cards
              <>
                <div style={{ textAlign: 'center' }}>
                  <Skeleton shape="text" style={{ width: '80px', height: '12px', marginBottom: '5px' }} />
                  <Skeleton shape="text" style={{ width: '100px', height: '24px' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Skeleton shape="text" style={{ width: '100px', height: '12px', marginBottom: '5px' }} />
                  <Skeleton shape="text" style={{ width: '120px', height: '24px' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Skeleton shape="text" style={{ width: '90px', height: '12px', marginBottom: '5px' }} />
                  <Skeleton shape="text" style={{ width: '100px', height: '24px' }} />
                </div>
              </>
            ) : (
              // Actual data display
              <>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Invoice Total</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: invoiceTotal > 0 ? '#0066cc' : '#999' }}>
                    {invoiceTotal > 0 ? `$${invoiceTotal.toFixed(2)}` : 'No Data'}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Monthly Difference</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                    ${Math.abs(monthlyDifference).toFixed(2)} ({monthlyDifferencePercent}%)
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Invoice Credits</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
                    ${invoiceCredits.toFixed(2)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Month Selector */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '30px',
            paddingLeft: '0'
          }}>
            <div onClick={(e) => e.stopPropagation()}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', marginRight: '10px' }}>Invoice Month:</span>
              <div style={{ display: 'inline-block' }}>
                {!monthsLoaded ? (
                  <Skeleton shape="rectangle" style={{ width: '200px', height: '32px' }} />
                ) : (
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
                    style={{
                      minWidth: '200px',
                      opacity: isLoading ? 0.6 : 1
                    }}
                  />
                )}
              </div>
              {isLoading && (
                <span style={{ marginLeft: '10px', fontSize: '12px', color: '#0066cc' }}>
                  Loading...
                </span>
              )}
            </div>
            <div>
              <a href="#" style={{ fontSize: '14px', color: '#0066cc', textDecoration: 'none' }}>
                View Actual Usage
              </a>
            </div>
          </div>

          {/* Charts Section */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            
            {/* Left Chart - Invoice Breakdown */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>
                Invoice Breakdown by Product Category
              </h3>
              <div style={{ height: '300px' }}>
                {isLoading ? (
                  <Skeleton shape="rectangle" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Chart style={{ height: '100%' }}>
                    <ChartSeries>
                      <ChartSeriesItem 
                        type="column" 
                        data={chartData} 
                        field="value" 
                        categoryField="category"
                        color="#17a2b8"
                      />
                    </ChartSeries>
                    <ChartCategoryAxis>
                      <ChartCategoryAxisItem 
                        categories={chartData.map(item => item.category)}
                        labels={{
                          rotation: -45,
                          font: '10px Arial'
                        }}
                      />
                    </ChartCategoryAxis>
                    <ChartValueAxis>
                      <ChartValueAxisItem 
                        labels={{
                          format: 'C2'
                        }}
                      />
                    </ChartValueAxis>
                  </Chart>
                )}
              </div>
            </div>

            {/* Right Chart - Trending Monthly Spend */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
                  Trending Monthly Spend
                </h3>
                <div style={{ fontSize: '12px', color: '#666' }}>Last 6 Months</div>
              </div>
              
              <div style={{ height: '300px' }}>
                {isLoading ? (
                  <Skeleton shape="rectangle" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Chart style={{ height: '100%' }}>
                    <ChartSeries>
                      <ChartSeriesItem 
                        type="column" 
                        data={trendsChartData} 
                        field="azure" 
                        categoryField="category"
                        color="#17a2b8"
                        name="Azure Usage"
                        stack="default"
                      />
                      <ChartSeriesItem 
                        type="column" 
                        data={trendsChartData} 
                        field="marketplace" 
                        categoryField="category"
                        color="#dc3545"
                        name="Marketplace"
                        stack="default"
                      />
                      <ChartSeriesItem 
                        type="column" 
                        data={trendsChartData} 
                        field="private" 
                        categoryField="category"
                        color="#6c757d"
                        name="Private Marketplace"
                        stack="default"
                      />
                    </ChartSeries>
                    <ChartCategoryAxis>
                      <ChartCategoryAxisItem 
                        categories={trendsChartData.map(item => item.category)}
                        labels={{
                          rotation: -45,
                          font: '10px Arial'
                        }}
                      />
                    </ChartCategoryAxis>
                    <ChartValueAxis>
                      <ChartValueAxisItem 
                        labels={{
                          format: 'C2'
                        }}
                      />
                    </ChartValueAxis>
                    <ChartLegend position="bottom" visible={true} />
                  </Chart>
                )}
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            alignItems: 'flex-end', 
            marginBottom: '30px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '6px'
          }}>
            {isLoading ? (
              // Skeleton loaders for filters
              <>
                <div style={{ minWidth: '180px' }}>
                  <Skeleton shape="text" style={{ width: '100px', height: '13px', marginBottom: '5px' }} />
                  <Skeleton shape="rectangle" style={{ width: '100%', height: '32px' }} />
                </div>
                <div style={{ minWidth: '180px' }}>
                  <Skeleton shape="text" style={{ width: '90px', height: '13px', marginBottom: '5px' }} />
                  <Skeleton shape="rectangle" style={{ width: '100%', height: '32px' }} />
                </div>
                <div style={{ minWidth: '180px' }}>
                  <Skeleton shape="text" style={{ width: '70px', height: '13px', marginBottom: '5px' }} />
                  <Skeleton shape="rectangle" style={{ width: '100%', height: '32px' }} />
                </div>
                <div>
                  <Skeleton shape="rectangle" style={{ width: '120px', height: '42px' }} />
                </div>
              </>
            ) : (
              // Actual filter controls
              <>
                <div style={{ minWidth: '180px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                    Product Category
                  </label>
                  <DropDownList
                    data={[{ label: 'All', value: 'All' }, ...getSelectListItems('productcategory')]}
                    textField="label"
                    dataItemKey="value"
                    value={filters.productCategory}
                    onChange={(e) => handleFilterChange('productCategory', e.target.value)}
                    style={{
                      width: '100%'
                    }}
                  />
                </div>
                
                <div style={{ minWidth: '180px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                    Product Name
                  </label>
                  <DropDownList
                    data={[{ label: 'All', value: 'All' }, ...getSelectListItems('productname')]}
                    textField="label"
                    dataItemKey="value"
                    value={filters.productName}
                    onChange={(e) => handleFilterChange('productName', e.target.value)}
                    style={{
                      width: '100%'
                    }}
                  />
                </div>
                
                <div style={{ minWidth: '180px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                    Sku Name
                  </label>
                  <DropDownList
                    data={[{ label: 'All', value: 'All' }, ...getSelectListItems('skuname')]}
                    textField="label"
                    dataItemKey="value"
                    value={filters.skuName}
                    onChange={(e) => handleFilterChange('skuName', e.target.value)}
                    style={{
                      width: '100%'
                    }}
                  />
                </div>
                
                <div>
                  <button 
                    onClick={applyFilters}
                    style={{
                      padding: '10px 24px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Apply Filters
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Invoice Details Table */}
          <div className="o-grid o-grid--gutters-tiny" style={{ marginBottom: '20px' }}>
            <div className="o-grid__item u-1/1">
              <div className="panel">
                <div className="panel-body" style={{ padding: '0' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', padding: '12px', flex: 1, borderRight: '1px solid #e9ecef' }}>Invoice Details</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', padding: '12px', flex: 1 }}>Monthly Differences</div>
                  </div>
                  
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8f9fa' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #e9ecef' }}>Invoice Date</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #e9ecef' }}>Customer Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #e9ecef' }}>Tenant ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #e9ecef' }}>Subscription ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #e9ecef' }}>Subscription Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #e9ecef' }}>Product Category</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #e9ecef' }}>Product ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #e9ecef' }}>Product Name</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetails.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #e9ecef' }}>
                          <td style={{ padding: '8px', borderRight: '1px solid #e9ecef' }}>{item.date}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #e9ecef' }}>{item.customer}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #e9ecef', fontSize: '10px' }}>{item.tenantId}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #e9ecef', fontSize: '10px' }}>{item.subscriptionId}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #e9ecef' }}>{item.subscriptionName}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #e9ecef' }}>{item.category}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #e9ecef' }}>{item.productId}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #e9ecef' }}>{item.productName}</td>
                          <td style={{ padding: '8px' }}>{item.sku}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ padding: '10px', fontSize: '12px', color: '#666', borderTop: '1px solid #e9ecef' }}>
                    Showing 1-{invoiceDetails.length} of {invoiceDetails.length} items
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Info */}
          {ssrPerformance && (
            <div style={{ 
              fontSize: '12px', 
              color: '#666',
              textAlign: 'center',
              marginTop: '20px'
            }}>
              Performance: Data fetched in {ssrPerformance.dataFetchTime}ms | Status: {ssrPerformance.cacheStatus} | Rendered at: {ssrPerformance.timestamp}
            </div>
          )}

        </div>
      </div>
    </ErrorBoundary>
  );
}
