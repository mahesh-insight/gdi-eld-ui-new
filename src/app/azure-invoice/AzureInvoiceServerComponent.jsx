"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Simple component that displays server-side fetched data
 */
export default function AzureInvoiceServerComponent({
  azureInvoiceData,
  azureInvoiceError,
  azureInvoiceDebug,
  uiProperties,
  uiPropertiesError,
  uiPropertiesDebug
}) {
  const [isClient, setIsClient] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();
  
  // Show loading if we're still fetching server data
  const isDataLoading = !azureInvoiceData && !azureInvoiceError;
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // TEMPORARILY DISABLED: Debug authentication issue
  useEffect(() => {
    if (isClient && azureInvoiceError && azureInvoiceError.includes('Authentication required')) {
      console.log('🔐 Client-side authentication issue detected, but NOT redirecting for debugging:', azureInvoiceError);
      // router.push('/'); // DISABLED FOR DEBUGGING
    }
  }, [isClient, azureInvoiceError, router]);

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
        
        // Save to localStorage for Redux persistence
        if (typeof window !== 'undefined' && result.userContext && result.bearerToken) {
          localStorage.setItem('access_token', result.bearerToken);
          localStorage.setItem('user_context', JSON.stringify(result.userContext));
          console.log('✅ [CLIENT] Auth data saved to localStorage');
        }
        
        // Reload to pick up new cookies
        window.location.reload();
      } else {
        console.error('❌ [CLIENT] Dev authentication failed');
        alert('Authentication failed. Check console for details.');
      }
    } catch (error) {
      console.error('❌ [CLIENT] Dev authentication error:', error);
      alert('Authentication error. Check console for details.');
    }
    setAuthLoading(false);
  };
  
  if (!isClient) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }
  
  // Show loading state while server is fetching data
  if (isDataLoading) {
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
        <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>Loading Azure Invoice Data</h2>
        <p style={{ margin: '0', color: '#666', textAlign: 'center' }}>
          Fetching your latest invoice information...
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

  return (
    <div>
      {/* Main Application */}
      {azureInvoiceData && uiProperties ? (
        <div>          
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