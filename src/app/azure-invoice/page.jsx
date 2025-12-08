// src/app/azure-invoice/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import AzureInvoiceClientContent from './AzureInvoiceClientContent';
import { 
  fetchInvoiceMonthsServer, 
  fetchSummaryDataServer, 
  fetchCreditsDataServer, 
  fetchTrendsDataServer 
} from './actions';

/**
 * OPTIMIZED CACHE-FIRST WITH INSTANT UI:
 * 1. Show UI immediately with loading state
 * 2. Check Redux cache first (instant if cached)
 * 3. Fetch from server only if cache invalid
 * 4. No blocking - user sees page right away
 */

export default function AzureInvoicePage() {
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState(null);
  const [mode, setMode] = useState('loading');
  const [storeReady, setStoreReady] = useState(false);
  
  // Access Redux store safely with error handling
  let cacheMetadata = null;
  let cachedData = {};
  
  try {
    const store = useStore();
    if (store && typeof store.getState === 'function') {
      const state = store.getState();
      if (state && typeof state === 'object') {
        cacheMetadata = state?.azureInvoice?.cacheMetadata || null;
        cachedData = state?.azureInvoice || {};
      }
    }
  } catch (error) {
    console.warn('⚠️ Redux store access error:', error);
    // Continue with empty cache data
  }
  
  // Set page title
  useEffect(() => {
    document.title = 'Azure Invoice';
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStoreReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (!storeReady) return;
    
    async function loadData() {
      const startTime = Date.now();
      console.log('🔍 CLIENT: Checking cache...');
      
      // Get user context from cookies
      const userContextCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('user_context='));
      
      if (!userContextCookie) {
        console.log('❌ CLIENT: No user context found');
        setMode('auth-required');
        setLoading(false);
        return;
      }
      
      let parsedUserContext;
      try {
        parsedUserContext = JSON.parse(decodeURIComponent(userContextCookie.split('=')[1]));
        setUserContext(parsedUserContext);
      } catch (error) {
        console.error('❌ CLIENT: Failed to parse user context:', error);
        setMode('auth-error');
        setLoading(false);
        return;
      }
      
      const { soldToId } = parsedUserContext;
      
      if (!soldToId) {
        console.log('❌ CLIENT: No soldToId found');
        setMode('missing-data');
        setLoading(false);
        return;
      }
      
      // Check if we have valid cached data
      const cacheAge = cacheMetadata?.lastUpdated ? Date.now() - cacheMetadata.lastUpdated : null;
      const isCacheValid = cacheMetadata && 
                          cachedData &&
                          cacheAge && 
                          cacheAge < 10 * 60 * 1000 && // 10 minutes
                          cacheMetadata.soldToId === soldToId &&
                          cachedData.monthsData && 
                          cachedData.summaryData;
      
      if (isCacheValid) {
        console.log(`⚡ CLIENT: Using CACHED data (age: ${Math.floor(cacheAge / 1000)}s)`);
        
        // Wrap cached data in same structure as server actions {error, data}
        const cachedInitialData = {
          monthsResponse: { error: null, data: cachedData.monthsData },
          summaryResponse: { error: null, data: cachedData.summaryData },
          creditsResponse: { error: null, data: cachedData.creditsData },
          trendsResponse: { error: null, data: cachedData.trendsData }
        };
        
        setInitialData(cachedInitialData);
        setMode('true-ssr');
        setLoading(false);
        return;
      }
      
      // No valid cache - fetch fresh data (server actions run on server)
      console.log('🔄 CLIENT: Cache miss, fetching via server actions...');
      const dataStartTime = Date.now();
      
      try {
        const [monthsResponse, summaryResponse, creditsResponse, trendsResponse] = await Promise.all([
          fetchInvoiceMonthsServer(soldToId),
          fetchSummaryDataServer(soldToId, null),
          fetchCreditsDataServer(soldToId, null),
          fetchTrendsDataServer(soldToId, null)
        ]);
        
        const azureData = {
          monthsResponse,
          summaryResponse,
          creditsResponse,
          trendsResponse
        };
        
        const dataTime = Date.now() - dataStartTime;
        console.log(`✅ CLIENT: Data fetched in ${dataTime}ms`);
        
        setInitialData(azureData);
        setMode('true-ssr');
        setLoading(false);
      } catch (error) {
        console.error('❌ CLIENT: Failed to fetch data:', error);
        setMode('error');
        setLoading(false);
      }
    }
    
    loadData();
  }, [storeReady]);
  
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          padding: '20px 40px',
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#f8f9fa',
          marginBottom: '40px'
        }}>
          <h1 style={{ 
            margin: '0', 
            color: '#2c3e50',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            Azure Invoice Dashboard
          </h1>
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '20px' 
        }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <h2 style={{ margin: '0', color: '#495057' }}>Loading Invoice Data...</h2>
          <p style={{ margin: '0', color: '#6c757d' }}>
            {cacheMetadata?.lastUpdated ? 'Checking cache...' : 'Fetching fresh data...'}
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  if (mode === 'auth-required' || mode === 'auth-error' || mode === 'missing-data') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Authentication Required</h2>
        <p>Please log in to access the Azure Invoice dashboard.</p>
        <a href="/" style={{ color: '#007bff' }}>Return to Login</a>
      </div>
    );
  }
  
  if (mode === 'error') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Data Fetch Error</h2>
        <p>Failed to load invoice data. Please try again later.</p>
        <button onClick={() => window.location.reload()} style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <div style={{
        padding: '20px 40px',
        borderBottom: '1px solid #e1e5e9',
        backgroundColor: '#f8f9fa'
      }}>
        <h1 style={{ 
          margin: '0', 
          color: '#2c3e50',
          fontSize: '28px',
          fontWeight: '600'
        }}>
          Azure Invoice Dashboard
        </h1>
      </div>
      <AzureInvoiceClientContent 
        mode={mode}
        initialData={initialData}
        userContext={userContext}
        ssrPerformance={{
          dataFetchTime: 0,
          totalSSRTime: 0,
          cacheStatus: cacheMetadata?.lastUpdated ? 'CACHED' : 'FRESH',
          cacheHitRatio: cacheMetadata?.lastUpdated ? 100 : 0,
          timestamp: new Date().toLocaleTimeString()
        }}
      />
    </div>
  );
}
