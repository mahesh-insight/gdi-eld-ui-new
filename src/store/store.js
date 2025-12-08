// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { combineReducers } from '@reduxjs/toolkit';

// Create conditional storage that works on both client and server
let storage;
if (typeof window !== 'undefined') {
  // Client-side
  storage = require('redux-persist/lib/storage').default;
} else {
  // Server-side - use a no-op storage
  storage = {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
  };
}

console.log('🔧 Redux Persist Storage:', typeof window !== 'undefined' ? 'Client (localStorage)' : 'Server (no-op)');

// Import slices
import authSlice from './authSlice';
import uiSlice from './uiSlice';
import azureInvoiceSlice from './azureInvoiceSlice';
import pageSlice from './pageSlice';
import userSlice from './userSlice';
import gridSlice from './gridSlice';

// Persist configuration for auth slice
const authPersistConfig = {
  key: 'ccr-auth',
  storage,
  whitelist: ['isAuthenticated', 'user', 'loginResponse', 'accessToken', 'contextData', 'soldTo', 'salesOrg'], // Only persist these fields
  // Add transform to handle malformed data
  transforms: [
    {
      in: (inboundState, key) => {
        // Ensure state is valid before persisting
        if (!inboundState || typeof inboundState !== 'object') {
          return {};
        }
        return inboundState;
      },
      out: (outboundState, key) => {
        // Ensure rehydrated state is valid
        if (!outboundState || typeof outboundState !== 'object') {
          return {};
        }
        return outboundState;
      }
    }
  ]
};

// Persist configuration for Azure Invoice slice - cache data for fast loading
const azureInvoicePersistConfig = {
  key: 'ccr-azure-invoice',
  storage,
  whitelist: [
    'monthsData', 
    'summaryData', 
    'creditsData', 
    'trendsData',
    'monthDataCache',
    'invoiceMonths',
    'selectedMonth',
    'processedChartData',
    'selectListOptions',
    'cacheMetadata'
  ], // Cache all important data for fast loading
  transforms: [
    {
      in: (inboundState, key) => {
        // Validate and clean cache data before persisting
        if (!inboundState || typeof inboundState !== 'object') {
          return {};
        }
        
        // Clean old cache entries (older than 1 hour)
        if (inboundState.monthDataCache) {
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          const cleanedCache = {};
          
          Object.entries(inboundState.monthDataCache).forEach(([month, data]) => {
            if (data.timestamp && data.timestamp > oneHourAgo) {
              cleanedCache[month] = data;
            }
          });
          
          inboundState.monthDataCache = cleanedCache;
        }
        
        return inboundState;
      },
      out: (outboundState, key) => {
        // Ensure rehydrated state is valid
        if (!outboundState || typeof outboundState !== 'object') {
          return {};
        }
        return outboundState;
      }
    }
  ]
};

// Root reducer combining all slices with persistence
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  ui: uiSlice,
  azureInvoice: persistReducer(azureInvoicePersistConfig, azureInvoiceSlice),
  page: pageSlice,
  user: userSlice,
  grid: gridSlice,
});

// Configure the Redux store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE', 
          'persist/REGISTER',
          'persist/PURGE',
          'persist/FLUSH',
          'persist/PAUSE',
          'persist/RESUME'
        ],
        // Ignore these field paths for serializable check (Date objects)
        ignoredActionPaths: ['payload.loginResponse.userProfile.properties', 'payload'],
        ignoredPaths: ['auth.loginResponse.userProfile.properties'],
      },
    }).concat((store) => (next) => (action) => {
      // Intercept actions to ensure payload is defined
      if (action && typeof action === 'object' && action.type) {
        // If action has payload property but it's undefined, set it to null
        if (action.hasOwnProperty('payload') && action.payload === undefined) {
          console.warn('🔧 Fixed undefined payload for action:', action.type);
          action.payload = null;
        }
      }
      return next(action);
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor for the store with error handling
export const persistor = persistStore(store, null, () => {
  console.log('✅ Redux Persist: Store rehydration complete');
});

// Add error handling for corrupted persist data
if (typeof window !== 'undefined') {
  // Clean up auth persist data
  try {
    const authPersistData = localStorage.getItem('persist:ccr-auth');
    if (authPersistData) {
      JSON.parse(authPersistData);
    }
  } catch (error) {
    console.warn('🔧 Corrupted auth persist data detected, clearing...', error);
    localStorage.removeItem('persist:ccr-auth');
  }
  
  // Clean up Azure Invoice persist data
  try {
    const azurePersistData = localStorage.getItem('persist:ccr-azure-invoice');
    if (azurePersistData) {
      const parsed = JSON.parse(azurePersistData);
      // Check cache age and clear if too old (1 day)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (parsed.cacheMetadata && parsed.cacheMetadata.lastUpdated < oneDayAgo) {
        console.log('🧹 Azure Invoice cache expired (>24h), clearing...');
        localStorage.removeItem('persist:ccr-azure-invoice');
      }
    }
  } catch (error) {
    console.warn('🔧 Corrupted Azure Invoice persist data detected, clearing...', error);
    localStorage.removeItem('persist:ccr-azure-invoice');
  }
}

// Export store for use in components
export default store;