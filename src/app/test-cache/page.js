// src/app/test-cache/page.js
'use client';

import { useState, useEffect } from 'react';

export default function TestCachePage() {
  const [cacheInfo, setCacheInfo] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkCache = () => {
    addLog('Checking cache...');
    try {
      // Check localStorage
      const azureCache = localStorage.getItem('persist:ccr-azure-invoice');
      const authCache = localStorage.getItem('persist:ccr-auth');
      
      setCacheInfo({
        hasAzureCache: !!azureCache,
        hasAuthCache: !!authCache,
        azureCacheSize: azureCache ? azureCache.length : 0,
        authCacheSize: authCache ? azureCache.length : 0,
        azureCacheKeys: azureCache ? Object.keys(JSON.parse(azureCache)) : [],
        timestamp: new Date().toISOString()
      });
      
      addLog(`Azure cache found: ${!!azureCache} (${azureCache ? azureCache.length : 0} bytes)`);
      addLog(`Auth cache found: ${!!authCache} (${authCache ? authCache.length : 0} bytes)`);
      
      if (azureCache) {
        const parsed = JSON.parse(azureCache);
        addLog(`Cache keys: ${Object.keys(parsed).join(', ')}`);
      }
    } catch (error) {
      addLog(`Error checking cache: ${error.message}`);
    }
  };

  const clearAllCache = () => {
    addLog('Clearing all cache...');
    try {
      localStorage.clear();
      setCacheInfo(null);
      addLog('All cache cleared');
    } catch (error) {
      addLog(`Error clearing cache: ${error.message}`);
    }
  };

  const testNavigation = () => {
    addLog('Testing navigation...');
    const start = Date.now();
    window.location.href = '/azure-invoice';
  };

  useEffect(() => {
    checkCache();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Cache Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={checkCache} style={{ marginRight: '10px', padding: '10px' }}>
          Check Cache Status
        </button>
        <button onClick={clearAllCache} style={{ marginRight: '10px', padding: '10px' }}>
          Clear All Cache
        </button>
        <button onClick={testNavigation} style={{ marginRight: '10px', padding: '10px' }}>
          Navigate to Azure Invoice
        </button>
      </div>

      {cacheInfo && (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>Cache Status</h3>
          <pre>{JSON.stringify(cacheInfo, null, 2)}</pre>
        </div>
      )}

      <div style={{ 
        backgroundColor: '#000', 
        color: '#0f0', 
        padding: '15px', 
        borderRadius: '5px',
        height: '300px',
        overflow: 'auto'
      }}>
        <h3 style={{ color: '#0f0', margin: '0 0 10px 0' }}>Console Logs</h3>
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>First visit: Click &quot;Navigate to Azure Invoice&quot; - should take ~10+ seconds (fresh load)</li>
          <li>Second visit: Refresh page or navigate again - should be instant (~500ms) if cache works</li>
          <li>Use browser dev tools to see console logs for detailed cache behavior</li>
          <li>Check localStorage in Application tab for persist:ccr-azure-invoice</li>
        </ol>
      </div>
    </div>
  );
}