// src/app/azure-invoice/AzureInvoiceContent.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchAzureInvoiceDataServer, fetchUiPropertiesServer } from './actions';

// Global flag to prevent multiple simultaneous calls across component re-renders
let globalFetchInProgress = false;

// Client component that fetches data once and displays it
export default function AzureInvoiceContent() {
  const [azureInvoiceData, setAzureInvoiceData] = useState(null);
  const [uiPropertiesData, setUiPropertiesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchInitiated, setFetchInitiated] = useState(false);
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
    <div style={{ padding: '20px' }}>
      <div style={{
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #b8daff',
        marginBottom: '20px'
      }}>
        <h3>📊 API Response Data</h3>
      </div>

      {/* Invoice Months */}
      <div style={{
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #dee2e6',
        marginBottom: '15px'
      }}>
        <h4>📅 Invoice Months ({azureInvoiceData?.data?.invoiceMonths?.length || 0})</h4>
        <div style={{ maxHeight: '200px', overflow: 'auto' }}>
          {azureInvoiceData?.data?.invoiceMonths?.length > 0 ? (
            <pre style={{ fontSize: '12px', margin: 0 }}>
              {JSON.stringify(azureInvoiceData.data.invoiceMonths, null, 2)}
            </pre>
          ) : (
            <p>No invoice months available</p>
          )}
        </div>
      </div>

      {/* Summary Data */}
      <div style={{
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #dee2e6',
        marginBottom: '15px'
      }}>
        <h4>📊 Summary Data</h4>
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {azureInvoiceData?.data?.summary ? (
            <pre style={{ fontSize: '12px', margin: 0 }}>
              {JSON.stringify(azureInvoiceData.data.summary, null, 2)}
            </pre>
          ) : (
            <p>No summary data available</p>
          )}
        </div>
      </div>

      {/* Credits Data */}
      <div style={{
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #dee2e6',
        marginBottom: '15px'
      }}>
        <h4>💳 Credits Data</h4>
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {azureInvoiceData?.data?.credits ? (
            <pre style={{ fontSize: '12px', margin: 0 }}>
              {JSON.stringify(azureInvoiceData.data.credits, null, 2)}
            </pre>
          ) : (
            <p>No credits data available</p>
          )}
        </div>
      </div>

      {/* Trend Data */}
      <div style={{
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #dee2e6',
        marginBottom: '15px'
      }}>
        <h4>📈 Trend Data</h4>
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {azureInvoiceData?.data?.trend ? (
            <pre style={{ fontSize: '12px', margin: 0 }}>
              {JSON.stringify(azureInvoiceData.data.trend, null, 2)}
            </pre>
          ) : (
            <p>No trend data available</p>
          )}
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