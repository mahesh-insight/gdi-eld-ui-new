// src/app/azure-invoice/AzureInvoiceContent.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Chart, ChartSeries, ChartSeriesItem, ChartCategoryAxis, ChartCategoryAxisItem, ChartValueAxis, ChartValueAxisItem, ChartTooltip, ChartLegend } from '@progress/kendo-react-charts';
import { Button } from '@progress/kendo-react-buttons';
import { useAuth } from '../../hooks/useAuth';
import { fetchAzureInvoiceDataServer, fetchUiPropertiesServer, fetchAzureInvoiceDataForMonth } from './actions';

// Global flag to prevent multiple simultaneous calls across component re-renders
let globalFetchInProgress = false;

// Client component that fetches data once and displays it
export default function AzureInvoiceContent() {
  const [azureInvoiceData, setAzureInvoiceData] = useState(null);
  const [uiPropertiesData, setUiPropertiesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchInitiated, setFetchInitiated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthDataLoading, setMonthDataLoading] = useState(false);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productNameFilter, setProductNameFilter] = useState('All');
  const [skuNameFilter, setSkuNameFilter] = useState('All');
  const { isAuthenticated, user } = useAuth();
  
  // Ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    console.log('🔍 Client: useEffect triggered', { 
      isAuthenticated, 
      hasUser: !!user, 
      fetchInitiated, 
      hasData: !!azureInvoiceData, 
      hasError: !!error 
    });
    
    // Only fetch data ONCE: if authenticated, have user data, and haven't initiated fetch yet
    if (isAuthenticated && user && !fetchInitiated && !azureInvoiceData && !error && !globalFetchInProgress) {
      console.log('🚀 Client: Starting authenticated data fetch (SINGLE CALL)');
      setFetchInitiated(true); // Prevent any further calls
      globalFetchInProgress = true; // Global protection
      
      const fetchData = async () => {
        try {
          const startTime = Date.now();
          
          // Extract soldToId and accessToken from authenticated Redux store
          let soldToId = null;
          let accessToken = null;
          
          console.log('🔍 Client: Full user object from Redux:', user);
          
          // Try multiple paths to get soldToId from Redux store
          if (user?.soldToId) {
            soldToId = user.soldToId;
            console.log('🔍 Client: Found soldToId in user.soldToId');
          } else if (user?.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId) {
            soldToId = user.loginResponse.userProfile.defaultContext[0].soldToId;
            console.log('🔍 Client: Found soldToId in user.loginResponse.userProfile.defaultContext');
          } else if (user?.loginResponseState?.[0]?.soldToID) {
            soldToId = user.loginResponseState[0].soldToID;
            console.log('🔍 Client: Found soldToId in user.loginResponseState');
          }
          
          // Try to get access token from Redux store
          if (user?.accessToken) {
            accessToken = user.accessToken;
            console.log('🔍 Client: Found accessToken in user.accessToken');
          } else if (user?.loginResponse?.accessToken) {
            accessToken = user.loginResponse.accessToken;
            console.log('🔍 Client: Found accessToken in user.loginResponse.accessToken');
          } else {
            // Try localStorage as fallback for access token only
            try {
              accessToken = localStorage.getItem('access_token');
              if (accessToken) {
                console.log('🔍 Client: Found accessToken in localStorage');
              }
            } catch (e) {
              console.log('🔍 Client: Could not access localStorage for token');
            }
          }
          
          console.log('🔍 Client: Final extracted soldToId:', soldToId);
          console.log('🔍 Client: Has accessToken:', !!accessToken);
          
          if (!soldToId) {
            console.error('❌ Client: No soldToId found in Redux store. User auth data:', user);
            setError('Unable to extract soldToId from authenticated user data. Please try logging out and logging in again.');
            setLoading(false);
            globalFetchInProgress = false;
            return;
          }
          
          const [azureInvoiceResult, uiPropertiesResult] = await Promise.all([
            fetchAzureInvoiceDataServer(soldToId), // Pass soldToId explicitly
            fetchUiPropertiesServer()
          ]);
          
          const fetchTime = Date.now() - startTime;
          console.log(`⚡ Client: Data fetch completed in ${fetchTime}ms`);
          console.log('🔍 Client: Azure invoice result:', azureInvoiceResult);
          console.log('🔍 Client: UI properties result:', uiPropertiesResult);
          
          // Update state (React will handle cleanup automatically)
          console.log('🔍 Client: Updating state with fetched data');
          if (azureInvoiceResult.error) {
            console.log('❌ Client: Setting error:', azureInvoiceResult.error);
            setError(azureInvoiceResult.error);
          } else {
            console.log('✅ Client: Setting azure invoice data');
            setAzureInvoiceData(azureInvoiceResult);
            // Set initial selected month to the first month in the list
            if (azureInvoiceResult?.data?.invoiceMonths?.length > 0) {
              setSelectedMonth(azureInvoiceResult.data.invoiceMonths[0]);
              console.log('✅ Client: Set initial selected month:', azureInvoiceResult.data.invoiceMonths[0]);
            }
          }
          
          console.log('✅ Client: Setting UI properties data');
          setUiPropertiesData(uiPropertiesResult);
          console.log('✅ Client: Setting loading to false');
          setLoading(false);
          
          globalFetchInProgress = false; // Reset global flag
          
        } catch (err) {
          console.error('❌ Client: Data fetch failed:', err);
          setError(err.message);
          setLoading(false);
          globalFetchInProgress = false; // Reset global flag on error
        }
      };

      fetchData();
    }
  }, [isAuthenticated, user]); // Removed dependencies that could cause re-runs

  // Handle month selection change
  const handleMonthChange = async (event) => {
    const newSelectedMonth = event.target.value;
    console.log('🔄 Client: Month selection changed:', newSelectedMonth);
    
    if (!newSelectedMonth || !user) {
      console.log('❌ Client: Cannot change month - no month selected or no user auth');
      return;
    }
    
    setSelectedMonth(newSelectedMonth);
    setMonthDataLoading(true);
    
    try {
      // Extract soldToId from user data (same logic as initial fetch)
      let soldToId = null;
      if (user?.soldToId) {
        soldToId = user.soldToId;
      } else if (user?.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId) {
        soldToId = user.loginResponse.userProfile.defaultContext[0].soldToId;
      } else if (user?.loginResponseState?.[0]?.soldToID) {
        soldToId = user.loginResponseState[0].soldToID;
      }
      
      console.log('🔍 Client: Fetching data for selected month with soldToId:', soldToId);
      
      // Fetch data for the selected month
      const monthDataResult = await fetchAzureInvoiceDataForMonth(soldToId, newSelectedMonth);
      
      if (monthDataResult.error) {
        console.error('❌ Client: Month data fetch error:', monthDataResult.error);
        setError(monthDataResult.error);
      } else {
        console.log('✅ Client: Month data fetched successfully:', monthDataResult);
        // Update the existing data with new month-specific data
        setAzureInvoiceData(prevData => ({
          ...prevData,
          data: {
            ...prevData.data,
            currentMonthObject: monthDataResult.data.currentMonthObject,
            usageMonth: monthDataResult.data.usageMonth,
            summary: monthDataResult.data.summary,
            credits: monthDataResult.data.credits,
            trend: monthDataResult.data.trend,
          }
        }));
      }
    } catch (err) {
      console.error('❌ Client: Month change error:', err);
      setError(err.message);
    } finally {
      setMonthDataLoading(false);
    }
  };

  // Carousel navigation
  const nextChart = () => {
    setCurrentChartIndex(prev => (prev + 1) % 2); // 2 charts in carousel
  };

  const prevChart = () => {
    setCurrentChartIndex(prev => (prev - 1 + 2) % 2);
  };

  // Helper functions for data processing
  const processInvoiceBreakdownData = (summaryData) => {
    if (!summaryData || !summaryData.invoiceBreakdown) return [];
    
    return summaryData.invoiceBreakdown.map(item => ({
      category: item.productCategory || item.name || 'Unknown',
      value: parseFloat(item.total || item.amount || 0),
      color: item.color || '#0078d4'
    }));
  };

  const processTrendingData = (trendData) => {
    if (!trendData || !Array.isArray(trendData)) return [];
    
    return trendData.map(item => ({
      month: item.month || item.date || item.period,
      azureUsage: parseFloat(item.azureUsage || item.azure || 0),
      marketplace: parseFloat(item.marketplace || item.market || 0),
      privateMarketplace: parseFloat(item.privateMarketplace || item.private || 0)
    }));
  };

  const processTopExpensiveProducts = (summaryData) => {
    if (!summaryData || !summaryData.topExpensiveProducts) return [];
    
    return summaryData.topExpensiveProducts.slice(0, 8).map((item, index) => ({
      product: item.productName || item.name || `Product ${index + 1}`,
      value: parseFloat(item.cost || item.amount || 0),
      color: `hsl(${200 + index * 30}, 70%, ${50 + index * 5}%)`
    }));
  };

  // Get processed data
  const invoiceBreakdownData = processInvoiceBreakdownData(azureInvoiceData?.data?.summary);
  const trendingData = processTrendingData(azureInvoiceData?.data?.trend);
  const topExpensiveData = processTopExpensiveProducts(azureInvoiceData?.data?.summary);
  const monthlyDifference = azureInvoiceData?.data?.credits?.monthlyDifference || { current: 0, previous: 0, difference: 0, percentage: 0 };

  if (loading) {
    return (
      <div style={{
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        fontFamily: 'system-ui'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0070f3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        
        <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
          Loading Invoice Data
        </h2>
        
        <p style={{ margin: '0', color: '#666', textAlign: 'center' }}>
          Fetching your latest Azure invoice information...
        </p>
        
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb',
        borderRadius: '5px',
        margin: '20px'
      }}>
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button 
          onClick={() => {
            globalFetchInProgress = false; // Reset global flag
            setFetchInitiated(false);
            setLoading(true);
            setError(null);
            setAzureInvoiceData(null);
            setUiPropertiesData(null);
            setSelectedMonth(null);
            setMonthDataLoading(false);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* Header Section with Invoice Month Dropdown */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>Azure Plan Invoice</h2>
          
          {/* Invoice Totals - Right Side */}
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>Invoice Total</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#b8368a' }}>$46.76</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>Monthly Difference</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0078d4' }}>$0.59 (1.28%)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>Invoice Credits</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>$0.00</div>
            </div>
          </div>
        </div>
        
        {/* Invoice Month Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
          <label style={{ fontWeight: '500', color: '#333', minWidth: '120px' }}>Invoice Month:</label>
          
          {azureInvoiceData?.data?.invoiceMonths?.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ minWidth: '200px' }}>
                <DropDownList
                  data={azureInvoiceData.data.invoiceMonths}
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  textField="text"
                  dataItemKey="value"
                  style={{ width: '100%' }}
                  disabled={monthDataLoading}
                />
              </div>
              
              <Button 
                onClick={() => console.log('View Billed Usage')}
                fillMode="outline"
                themeColor="primary"
                size="small"
              >
                View Billed Usage
              </Button>
              
              {monthDataLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0070f3' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #f3f3f3',
                    borderTop: '2px solid #0070f3',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>Loading...</span>
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: '#666' }}>No invoice months available</span>
          )}
        </div>
        
        {/* Info Message */}
        <div style={{
          backgroundColor: '#e7f3ff',
          padding: '12px',
          borderRadius: '4px',
          color: '#0078d4',
          fontSize: '14px',
          border: '1px solid #b3d7ff'
        }}>
          ℹ️ Please note that Private Marketplace charges are currently incorrectly displayed. Your invoice is correct. We are working on this bug. Thank you.
        </div>
        
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* Left Column - Charts */}
        <div style={{ flex: 2 }}>

      {/* Summary Data */}
      <div style={{
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #dee2e6',
        marginBottom: '15px',
        opacity: monthDataLoading ? 0.6 : 1,
        transition: 'opacity 0.3s ease'
      }}>
        <h4>📆 Summary Data {selectedMonth ? `(${selectedMonth.text})` : ''}</h4>
        {monthDataLoading && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#666',
            fontStyle: 'italic'
          }}>
            Loading summary data for selected month...
          </div>
        )}
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {!monthDataLoading && azureInvoiceData?.data?.summary ? (
            <pre style={{ fontSize: '12px', margin: 0 }}>
              {JSON.stringify(azureInvoiceData.data.summary, null, 2)}
            </pre>
          ) : !monthDataLoading ? (
            <p>No summary data available</p>
          ) : null}
        </div>
      </div>

      {/* Credits Data */}
      <div style={{
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #dee2e6',
        marginBottom: '15px',
        opacity: monthDataLoading ? 0.6 : 1,
        transition: 'opacity 0.3s ease'
      }}>
        <h4>💳 Credits Data {selectedMonth ? `(${selectedMonth.text})` : ''}</h4>
        {monthDataLoading && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#666',
            fontStyle: 'italic'
          }}>
            Loading credits data for selected month...
          </div>
        )}
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {!monthDataLoading && azureInvoiceData?.data?.credits ? (
            <pre style={{ fontSize: '12px', margin: 0 }}>
              {JSON.stringify(azureInvoiceData.data.credits, null, 2)}
            </pre>
          ) : !monthDataLoading ? (
            <p>No credits data available</p>
          ) : null}
        </div>
      </div>

      {/* Trend Data */}
      <div style={{
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #dee2e6',
        marginBottom: '15px',
        opacity: monthDataLoading ? 0.6 : 1,
        transition: 'opacity 0.3s ease'
      }}>
        <h4>📈 Trend Data (Last 6 months)</h4>
        {monthDataLoading && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#666',
            fontStyle: 'italic'
          }}>
            Refreshing trend data...
          </div>
        )}
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {!monthDataLoading && azureInvoiceData?.data?.trend ? (
            <pre style={{ fontSize: '12px', margin: 0 }}>
              {JSON.stringify(azureInvoiceData.data.trend, null, 2)}
            </pre>
          ) : !monthDataLoading ? (
            <p>No trend data available</p>
          ) : null}
        </div>
      </div>

      {/* UI Properties */}
      <div style={{
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #dee2e6'
      }}>
        <h4>🎨 UI Properties</h4>
        <p>{uiPropertiesData ? 'Available' : 'No data'}</p>
      </div>

      {/* Debug Information */}
      {azureInvoiceData?.debug && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '5px',
          border: '1px solid #dee2e6',
          marginTop: '15px'
        }}>
          <h4>🔍 Debug Info</h4>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(azureInvoiceData.debug, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}