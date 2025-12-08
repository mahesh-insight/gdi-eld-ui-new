// src/hooks/useHasRehydrated.js
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

/**
 * Custom hook to determine if the Redux store has been rehydrated.
 * This is a more reliable way to check for rehydration than using PersistGate's loading prop,
 * as it directly checks for the cache metadata that should be present after rehydration.
 */
export function useHasRehydrated() {
  const [rehydrated, setRehydrated] = useState(false);
  
  // Select a piece of data that is only available after rehydration
  const cacheMetadata = useSelector(state => state.azureInvoice.cacheMetadata);

  useEffect(() => {
    if (cacheMetadata && cacheMetadata.lastUpdated) {
      // If we have cache metadata, we can be sure rehydration is complete
      setRehydrated(true);
    } else {
      // Fallback: if after a short delay there's still no metadata,
      // assume it's the first load or the cache is empty.
      const timer = setTimeout(() => {
        if (!rehydrated) {
          setRehydrated(true);
        }
      }, 500); // 500ms should be enough for rehydration to complete

      return () => clearTimeout(timer);
    }
  }, [cacheMetadata, rehydrated]);

  return rehydrated;
}
