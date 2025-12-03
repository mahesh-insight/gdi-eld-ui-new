"use client";

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setInitialData } from '@/lib/store/slices/azureInvoiceSlice';
import { setUiProperties } from '@/lib/store/slices/uiSlice';
import AzureInvoiceClient from './AzureInvoiceClient';

/**
 * Client-only component that handles Redux and interactive features
 */
export default function ClientWrapper({
  azureInvoiceData,
  azureInvoiceError,
  azureInvoiceDebug,
  uiProperties,
  uiPropertiesError,
  uiPropertiesDebug
}) {
  const [authLoading, setAuthLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Safe Redux hooks with try-catch
  const dispatch = useDispatch();
  
  // Error handling for Redux operations
  const safeDispatch = (action) => {
    try {
      if (dispatch && typeof dispatch === 'function') {
        dispatch(action);
        return true;
      }
      console.warn('⚠️ Redux dispatch not available');
      return false;
    } catch (error) {
      console.error('❌ Redux dispatch error:', error);
      setHasError(true);
      return false;
    }
  };
  
  // Initialize Redux store with server-side data
  useEffect(() => {
    console.log('🔧 Client: Initializing Redux store with server data');
    
    // Initialize UI Properties
    if (uiProperties) {
      const success = safeDispatch(setUiProperties(uiProperties));
      if (success) {
        console.log('✅ Client: UI Properties set in Redux');
      }
    }
    
    // Initialize Azure Invoice Data
    if (azureInvoiceData) {
      const success = safeDispatch(setInitialData(azureInvoiceData));
      if (success) {
        console.log('✅ Client: Azure Invoice data set in Redux');
      }
    }
    
    setIsInitialized(true);
  }, [azureInvoiceData, uiProperties, dispatch]);

  // Development Authentication Handler
  const handleDevAuth = async () => {
    setAuthLoading(true);
    try {
      console.log('🔧 [CLIENT] Starting dev authentication...');
      
      const response = await fetch('/api/dev-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ [CLIENT] Dev authentication successful:', result);
        
        // Also set authentication in localStorage for Redux persistence
        if (typeof window !== 'undefined' && result.userContext && result.bearerToken) {
          localStorage.setItem('access_token', result.bearerToken);
          localStorage.setItem('user_context', JSON.stringify(result.userContext));
          console.log('✅ [CLIENT] Auth data saved to localStorage');
        }
        
        // Force page refresh to pick up new cookies and localStorage
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        console.error('❌ [CLIENT] Dev authentication failed');
        if (typeof window !== 'undefined') {
          alert('Authentication failed. Check console for details.');
        }
      }
    } catch (error) {
      console.error('❌ [CLIENT] Dev authentication error:', error);
      if (typeof window !== 'undefined') {
        alert('Authentication error. Check console for details.');
      }
    }
    setAuthLoading(false);
  };
  
  // Error state
  if (hasError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>⚠️ Application Error</h2>
        <p>Redux store is not properly initialized.</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Main Application */}
      {azureInvoiceData && uiProperties ? (
        <div>
          <h1>🎉 Azure Invoice Data Loaded Successfully!</h1>
          
          {/* JSON Display Section */}
          <div style={{
            margin: '20px 0',
            padding: '20px',
            border: '2px solid #28a745',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <h2 style={{ color: '#28a745', marginBottom: '20px' }}>📊 API Response Data</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#007bff' }}>📅 Invoice Months</h3>
              <pre style={{
                backgroundColor: '#f1f1f1',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                maxHeight: '200px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(azureInvoiceData?.invoiceMonths || 'No data', null, 2)}
              </pre>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#007bff' }}>📊 Summary Data</h3>
              <pre style={{
                backgroundColor: '#f1f1f1',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                maxHeight: '300px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(azureInvoiceData?.summary || 'No data', null, 2)}
              </pre>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#007bff' }}>💳 Credits Data</h3>
              <pre style={{
                backgroundColor: '#f1f1f1',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                maxHeight: '200px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(azureInvoiceData?.credits || 'No data', null, 2)}
              </pre>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#007bff' }}>📈 Trend Data</h3>
              <pre style={{
                backgroundColor: '#f1f1f1',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                maxHeight: '300px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(azureInvoiceData?.trend || 'No data', null, 2)}
              </pre>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#007bff' }}>🎨 UI Properties</h3>
              <pre style={{
                backgroundColor: '#f1f1f1',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                maxHeight: '200px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(uiProperties || 'No data', null, 2)}
              </pre>
            </div>
          </div>
          
          {/* Try to render the full component with error boundary */}
          {isInitialized && (
            <div style={{ marginTop: '30px' }}>
              <h2>🚀 Full Component (with Redux)</h2>
              <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <AzureInvoiceClient />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Azure Invoice Status</h2>
          {azureInvoiceError && (
            <div style={{ 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeeba', 
              borderRadius: '4px', 
              padding: '12px', 
              margin: '16px 0',
              color: '#856404'
            }}>
              <strong>Azure Invoice:</strong> {azureInvoiceError}
              {(azureInvoiceError.includes('Authentication') || azureInvoiceError.includes('authentication') || azureInvoiceError.includes('cookies')) && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={handleDevAuth}
                    disabled={authLoading}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: authLoading ? 'not-allowed' : 'pointer',
                      opacity: authLoading ? 0.6 : 1,
                      fontSize: '14px',
                      marginRight: '8px'
                    }}
                  >
                    {authLoading ? '⏳ Authenticating...' : '🔑 [DEV] Set Auth Cookies & Reload'}
                  </button>
                  <span style={{ fontSize: '12px', color: '#6c757d' }}>
                    (Development only - sets authentication cookies)
                  </span>
                </div>
              )}
            </div>
          )}
          {uiPropertiesError && (
            <div style={{ 
              backgroundColor: '#f8d7da', 
              border: '1px solid #f5c6cb', 
              borderRadius: '4px', 
              padding: '12px', 
              margin: '16px 0',
              color: '#721c24'
            }}>
              <strong>UI Properties Error:</strong> {uiPropertiesError}
            </div>
          )}
          {!azureInvoiceError && !uiPropertiesError && (
            <p>Loading Azure Invoice data...</p>
          )}
        </div>
      )}
    </div>
  );
}