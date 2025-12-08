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
 * CLIENT-SIDE CACHE-FIRST ARCHITECTURE:
 * 1. First load: Check Redux cache in localStorage
 * 2. If cache valid (< 5 min old): Use cached data INSTANTLY
 * 3. If no cache: Fetch from server and cache results
 * 4. Subsequent visits: INSTANT load from cache
 * 5. Zero server calls when cache is valid
 */

export default function AzureInvoicePage() {
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState(null);
  const [mode, setMode] = useState('loading');
  const [storeReady, setStoreReady] = useState(false);
  
  // Use try-catch to safely access Redux store
  let cacheMetadata = null;
  let cachedData = {};
  
  try {
    const store = useStore();
    if (store) {
      const state = store.getState();
      cacheMetadata = state?.azureInvoice?.cacheMetadata || null;
      cachedData = state?.azureInvoice || {};
    }
  } catch (error) {
    console.warn('Redux store not ready yet:', error);
  }
  
  useEffect(() => {
    // Wait for Redux store to be ready
    const timer = setTimeout(() => {
      setStoreReady(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (!storeReady) return;
    
    async function loadData() {
      const startTime = Date.now();
      console.log('🔍 CLIENT: Checking cache before fetching...');
      
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
                          cacheAge < 5 * 60 * 1000 && // 5 minutes
                          cacheMetadata.soldToId === soldToId &&
                          cachedData.monthsData && 
                          cachedData.summaryData;
      
      if (isCacheValid) {
        console.log(`⚡ CLIENT: Using CACHED data (age: ${Math.floor(cacheAge / 1000)}s)`);
        console.log('📦 CACHED DATA:', {
          monthsData: !!cachedData.monthsData,
          summaryData: !!cachedData.summaryData,
          creditsData: !!cachedData.creditsData,
          trendsData: !!cachedData.trendsData
        });
        
        const cachedInitialData = {
          monthsResponse: cachedData.monthsData,
          summaryResponse: cachedData.summaryData,
          creditsResponse: cachedData.creditsData,
          trendsResponse: cachedData.trendsData
        };
        
        console.log('📦 Setting initialData with cached values');
        setInitialData(cachedInitialData);
        setMode('true-ssr');
        setLoading(false);
        return;
      }
      
      // No valid cache - fetch fresh data
      console.log('🔄 CLIENT: Cache miss or expired, fetching fresh data...');
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
        console.log('📦 FETCHED DATA:', {
          monthsResponse: !!azureData.monthsResponse,
          summaryResponse: !!azureData.summaryResponse,
          creditsResponse: !!azureData.creditsResponse,
          trendsResponse: !!azureData.trendsResponse
        });
        console.log('📦 Summary data structure:', azureData.summaryResponse);
        
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
        <h2>Loading...</h2>
        <p>Checking cache and loading data...</p>
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
