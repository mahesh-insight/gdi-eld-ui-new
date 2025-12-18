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



// Import slices
import authSlice from './authSlice';
import uiSlice from './uiSlice';
import azureInvoiceSlice from './azureInvoiceSlice';
import pageSlice from './pageSlice';
import userSlice from '../lib/store/slices/userSlice';
import gridSlice from './gridSlice';

// Persist configuration for auth slice - loginResponse included for header data
const authPersistConfig = {
  key: 'ccr-auth', 
  storage,
  whitelist: ['isAuthenticated', 'user', 'loginResponse', 'accessToken', 'contextData', 'soldTo', 'salesOrg'], // loginResponse persists until logout
  // Add transform to handle malformed data
  transforms: [
    {
      in: (inboundState, key) => {
        try {
          // Ensure state is valid before persisting
          if (!inboundState || typeof inboundState !== 'object') {
            return {};
          }
          // Remove undefined values
          const cleanState = {};
          Object.keys(inboundState).forEach(k => {
            if (inboundState[k] !== undefined) {
              cleanState[k] = inboundState[k];
            }
          });
          return cleanState;
        } catch (error) {
          console.error('🚨 Auth transform in error:', error);
          return {};
        }
      },
      out: (outboundState, key) => {
        try {
          // Ensure rehydrated state is valid
          if (!outboundState || typeof outboundState !== 'object') {
            return {};
          }
          return outboundState;
        } catch (error) {
          console.error('🚨 Auth transform out error:', error);
          return {};
        }
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
        try {
          // Validate and clean cache data before persisting
          if (!inboundState || typeof inboundState !== 'object') {
            return {};
          }
          
          // Remove undefined values
          const cleanState = {};
          Object.keys(inboundState).forEach(k => {
            if (inboundState[k] !== undefined) {
              cleanState[k] = inboundState[k];
            }
          });
          
          // Clean old cache entries (older than 1 hour)
          if (cleanState.monthDataCache && typeof cleanState.monthDataCache === 'object') {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            const cleanedCache = {};
            
            Object.entries(cleanState.monthDataCache).forEach(([month, data]) => {
              if (data && data.timestamp && data.timestamp > oneHourAgo) {
                cleanedCache[month] = data;
              }
            });
            
            cleanState.monthDataCache = cleanedCache;
          }
          
          return cleanState;
        } catch (error) {
          console.error('🚨 Azure Invoice transform in error:', error);
          return {};
        }
      },
      out: (outboundState, key) => {
        try {
          // Ensure rehydrated state is valid
          if (!outboundState || typeof outboundState !== 'object') {
            return {};
          }
          return outboundState;
        } catch (error) {
          console.error('🚨 Azure Invoice transform out error:', error);
          return {};
        }
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
      // CRITICAL: Wrap everything in try-catch to prevent errors from bubbling
      try {
        // Validate action structure
        if (!action || typeof action !== 'object') {
          console.error('🚨 Invalid action received:', action);
          return next({ type: 'INVALID_ACTION', payload: null });
        }
        
        // Ensure type exists
        if (!action.type) {
          console.error('🚨 Action without type:', action);
          return next({ type: 'NO_TYPE_ACTION', payload: null });
        }
        
        // Fix undefined payload for persist actions
        if (action.type && action.type.startsWith('persist/')) {
          if ('payload' in action && action.payload === undefined) {
            return next({ ...action, payload: null });
          }
        }
        
        // Fix undefined payload for any action
        if ('payload' in action && action.payload === undefined) {
          return next({ ...action, payload: null });
        }
        
        return next(action);
      } catch (error) {
        console.error('🚨 Middleware error:', error, 'Action:', action);
        // Return a safe action instead of crashing
        return next({ type: 'MIDDLEWARE_ERROR', payload: { error: error.message } });
      }
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor for the store with error handling
export const persistor = persistStore(store, null, (err) => {
  if (err) {
    console.error('🚨 Redux Persist: Rehydration error:', err);
    // Clear corrupted data and reload
    if (typeof window !== 'undefined') {
      localStorage.removeItem('persist:ccr-auth');
      localStorage.removeItem('persist:ccr-azure-invoice');
      console.log('🧹 Cleared corrupted persist data, please refresh');
    }
  } else {
    console.log('✅ Redux Persist: Store rehydration complete');
  }
});

// Add error handling for corrupted persist data
if (typeof window !== 'undefined') {
  // Clean up auth persist data
  try {
    const authPersistData = localStorage.getItem('persist:ccr-auth');
    if (authPersistData) {
      const parsed = JSON.parse(authPersistData);
      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid auth persist structure');
      }
    }
  } catch (error) {
    localStorage.removeItem('persist:ccr-auth');
  }
  
  // Clean up Azure Invoice persist data
  try {
    const azurePersistData = localStorage.getItem('persist:ccr-azure-invoice');
    if (azurePersistData) {
      const parsed = JSON.parse(azurePersistData);
      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid Azure Invoice persist structure');
      }
      // Check cache age and clear if too old (1 day)
      if (parsed.cacheMetadata) {
        try {
          const metadata = typeof parsed.cacheMetadata === 'string' 
            ? JSON.parse(parsed.cacheMetadata) 
            : parsed.cacheMetadata;
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          if (metadata && metadata.lastUpdated && metadata.lastUpdated < oneDayAgo) {
            localStorage.removeItem('persist:ccr-azure-invoice');
          }
        } catch (metaError) {
          localStorage.removeItem('persist:ccr-azure-invoice');
        }
      }
    }
  } catch (error) {
    localStorage.removeItem('persist:ccr-azure-invoice');
  }
}

// Export store for use in components
export default store;