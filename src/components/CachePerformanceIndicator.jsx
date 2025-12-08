// src/components/CachePerformanceIndicator.jsx
'use client';

import { useSelector } from 'react-redux';
import { selectCacheMetadata, selectMonthDataCache } from '../store/azureInvoiceSlice';

export default function CachePerformanceIndicator() {
  const cacheMetadata = useSelector(selectCacheMetadata);
  const monthDataCache = useSelector(selectMonthDataCache);
  
  const hasCachedData = !!cacheMetadata?.lastUpdated;
  const cacheAge = hasCachedData ? Date.now() - cacheMetadata.lastUpdated : null;
  const cacheAgeMinutes = cacheAge ? Math.floor(cacheAge / 60000) : null;
  const cachedMonthsCount = Object.keys(monthDataCache || {}).length;
  
  if (!hasCachedData) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: '#ffc107',
        color: '#000',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        zIndex: 1000,
        border: '2px solid #e0a800'
      }}>
        🚀 FRESH SSR LOAD
      </div>
    );
  }
  
  const isRecent = cacheAgeMinutes < 30;
  const bgColor = isRecent ? '#28a745' : '#17a2b8';

}