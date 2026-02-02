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
import dashboardSlice from './dashboardSlice';
import navigationContextReducer from './navigationContextSlice';
// Persist config for navigation context (ephemeral, but survives navigation)
const navigationContextPersistConfig = {
  key: 'ccr-navigation-context',
  storage,
  whitelist: ['context'],
};

// Import recovery utilities (dev tools)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('./persistRecovery').catch(err => 
    console.warn('⚠️ Failed to load persist recovery tools:', err)
  );
}

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
            console.warn('⚠️ Auth persist IN: Invalid state type, returning empty object');
            return {};
          }
          
          // Remove undefined values and non-serializable data
          const cleanState = {};
          Object.keys(inboundState).forEach(k => {
            const value = inboundState[k];
            
            // Skip undefined, functions, symbols
            if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
              console.warn(`⚠️ Auth persist IN: Skipping non-serializable field "${k}"`, typeof value);
              return;
            }
            
            // Convert Date objects to ISO strings
            if (value instanceof Date) {
              cleanState[k] = value.toISOString();
              console.log(`📅 Auth persist IN: Converted Date field "${k}" to ISO string`);
              return;
            }
            
            cleanState[k] = value;
          });
          
          // Create backup in a separate key (safety net)
          if (typeof window !== 'undefined' && cleanState.accessToken) {
            try {
              localStorage.setItem('ccr-auth-backup', JSON.stringify({
                accessToken: cleanState.accessToken,
                soldTo: cleanState.soldTo,
                timestamp: new Date().toISOString()
              }));
            } catch (backupError) {
              console.warn('⚠️ Failed to create auth backup:', backupError);
            }
          }
          
          return cleanState;
        } catch (error) {
          console.error('🚨 Auth transform IN error:', error);
          // Don't return empty - try to preserve critical fields
          const safeFallback = {};
          if (inboundState?.accessToken) safeFallback.accessToken = inboundState.accessToken;
          if (inboundState?.soldTo) safeFallback.soldTo = inboundState.soldTo;
          if (inboundState?.isAuthenticated) safeFallback.isAuthenticated = inboundState.isAuthenticated;
          return safeFallback;
        }
      },
      out: (outboundState, key) => {
        try {
          // Ensure rehydrated state is valid
          if (!outboundState || typeof outboundState !== 'object') {
            console.warn('⚠️ Auth persist OUT: Invalid state type, attempting recovery');
            
            // Try to recover from backup
            if (typeof window !== 'undefined') {
              try {
                const backup = localStorage.getItem('ccr-auth-backup');
                if (backup) {
                  const parsed = JSON.parse(backup);
                  console.log('✅ Auth persist OUT: Recovered from backup', {
                    hasToken: !!parsed.accessToken,
                    timestamp: parsed.timestamp
                  });
                  return parsed;
                }
              } catch (recoveryError) {
                console.error('❌ Auth persist OUT: Backup recovery failed:', recoveryError);
              }
            }
            
            return {};
          }
          
          console.log('✅ Auth persist OUT: Successfully rehydrated auth state', {
            hasToken: !!outboundState.accessToken,
            hasUser: !!outboundState.user,
            isAuthenticated: outboundState.isAuthenticated
          });
          
          return outboundState;
        } catch (error) {
          console.error('🚨 Auth transform OUT error:', error);
          
          // Last resort: try backup recovery
          if (typeof window !== 'undefined') {
            try {
              const backup = localStorage.getItem('ccr-auth-backup');
              if (backup) {
                const parsed = JSON.parse(backup);
                console.log('✅ Auth persist OUT: Emergency backup recovery successful');
                return parsed;
              }
            } catch {}
          }
          
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

// Persist configuration for dashboard slice - widget flags
const dashboardPersistConfig = {
  key: 'ccr-dashboard',
  storage,
  whitelist: ['mpsaStatusData', 'widgetFlags', 'salesOrganizationCountryCode'],
  transforms: [
    {
      in: (inboundState, key) => {
        try {
          if (!inboundState || typeof inboundState !== 'object') {
            return {};
          }
          
          // Clean undefined values
          const cleanState = {};
          Object.keys(inboundState).forEach(k => {
            if (inboundState[k] !== undefined) {
              cleanState[k] = inboundState[k];
            }
          });
          
          return cleanState;
        } catch (error) {
          console.error('🚨 Dashboard transform in error:', error);
          return {};
        }
      },
      out: (outboundState, key) => {
        try {
          if (!outboundState || typeof outboundState !== 'object') {
            return {};
          }
          
          // Sanitize mpsaStatusData to remove non-serializable Axios properties
          if (outboundState.mpsaStatusData) {
            const sanitized = {
              data: outboundState.mpsaStatusData.data || null,
              status: outboundState.mpsaStatusData.status || null,
              statusText: outboundState.mpsaStatusData.statusText || ''
            };
            
            // Remove any Axios-specific properties (headers, config, request, etc.)
            return {
              ...outboundState,
              mpsaStatusData: sanitized
            };
          }
          
          return outboundState;
        } catch (error) {
          console.error('🚨 Dashboard transform out error:', error);
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
  dashboard: persistReducer(dashboardPersistConfig, dashboardSlice),
  page: pageSlice,
  user: userSlice,
  grid: gridSlice,
  navigationContext: persistReducer(navigationContextPersistConfig, navigationContextReducer),
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
          console.warn('⚠️ Fixing undefined payload for action:', action.type);
          return next({ ...action, payload: null });
        }
        
        // ============================================
        // DEVELOPMENT SAFETY: Log critical auth actions
        // ============================================
        if (process.env.NODE_ENV === 'development') {
          if (action.type?.includes('auth/') && action.type !== 'auth/setLoading') {
            console.log('🔐 Auth Action:', {
              type: action.type,
              hasPayload: !!action.payload,
              payloadType: typeof action.payload,
              payloadKeys: action.payload && typeof action.payload === 'object' 
                ? Object.keys(action.payload) 
                : 'N/A'
            });
            
            // Validate critical auth actions
            if (action.type === 'auth/setLoginResponse' && action.payload) {
              const hasToken = action.payload?.tokens?.bearerToken || action.payload?.accessToken;
              if (!hasToken) {
                console.warn('⚠️ WARNING: setLoginResponse without accessToken!');
              }
            }
          }
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
    console.error('🚨 Redux Persist: Rehydration error detected:', err);
    console.error('📊 Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    
    // DON'T immediately clear - try recovery first!
    if (typeof window !== 'undefined') {
      let recoveredAuth = false;
      let recoveredAzure = false;
      
      // ============================================
      // STEP 1: Try to recover auth data
      // ============================================
      try {
        console.log('🔧 Attempting to recover auth data...');
        
        // Try backup first
        const backup = localStorage.getItem('ccr-auth-backup');
        if (backup) {
          const parsed = JSON.parse(backup);
          if (parsed.accessToken) {
            console.log('✅ Recovered auth from backup:', {
              hasToken: true,
              tokenPreview: parsed.accessToken.substring(0, 20) + '...',
              backupTimestamp: parsed.timestamp
            });
            
            // Manually restore to Redux store
            const { setAccessToken, setSoldTo, setAuthenticated } = require('./authSlice');
            store.dispatch(setAccessToken(parsed.accessToken));
            if (parsed.soldTo) store.dispatch(setSoldTo(parsed.soldTo));
            store.dispatch(setAuthenticated(true));
            
            recoveredAuth = true;
          }
        }
        
        // If backup failed, try parsing the corrupted main storage
        if (!recoveredAuth) {
          const rawAuth = localStorage.getItem('persist:ccr-auth');
          if (rawAuth) {
            console.log('🔧 Attempting manual parse of corrupted auth data...');
            
            // Try to extract token even from malformed JSON
            const tokenMatch = rawAuth.match(/"accessToken":"([^"]+)"/);
            const soldToMatch = rawAuth.match(/"soldTo":"([^"]+)"/);
            
            if (tokenMatch && tokenMatch[1]) {
              console.log('✅ Extracted accessToken from corrupted data');
              const { setAccessToken, setSoldTo, setAuthenticated } = require('./authSlice');
              store.dispatch(setAccessToken(tokenMatch[1]));
              if (soldToMatch && soldToMatch[1]) {
                store.dispatch(setSoldTo(soldToMatch[1]));
              }
              store.dispatch(setAuthenticated(true));
              recoveredAuth = true;
            }
          }
        }
      } catch (authRecoveryError) {
        console.error('❌ Auth recovery failed:', authRecoveryError);
      }
      
      // ============================================
      // STEP 2: Try to recover Azure Invoice data
      // ============================================
      try {
        const rawAzure = localStorage.getItem('persist:ccr-azure-invoice');
        if (rawAzure) {
          console.log('🔧 Attempting to recover Azure Invoice data...');
          const parsed = JSON.parse(rawAzure);
          // Validate it's not corrupted
          if (parsed && typeof parsed === 'object') {
            console.log('✅ Azure Invoice data appears valid');
            recoveredAzure = true;
          }
        }
      } catch (azureRecoveryError) {
        console.error('❌ Azure Invoice recovery failed:', azureRecoveryError);
      }
      
      // ============================================
      // STEP 3: Clear only if recovery failed
      // ============================================
      if (!recoveredAuth) {
        console.warn('⚠️ Could not recover auth data - clearing persist:ccr-auth');
        console.warn('⚠️ User will need to log in again');
        localStorage.removeItem('persist:ccr-auth');
        localStorage.removeItem('ccr-auth-backup');
      } else {
        console.log('🎉 Auth data recovered successfully! User stays logged in.');
        // Write the recovered data back to storage in clean format
        try {
          const currentState = store.getState();
          if (currentState.auth?.accessToken) {
            const cleanAuth = {
              isAuthenticated: currentState.auth.isAuthenticated,
              accessToken: currentState.auth.accessToken,
              soldTo: currentState.auth.soldTo,
              user: currentState.auth.user,
              loginResponse: currentState.auth.loginResponse
            };
            localStorage.setItem('persist:ccr-auth', JSON.stringify(cleanAuth));
            console.log('✅ Rewrote clean auth data to storage');
          }
        } catch (rewriteError) {
          console.error('❌ Failed to rewrite clean auth data:', rewriteError);
        }
      }
      
      if (!recoveredAzure) {
        console.warn('⚠️ Clearing persist:ccr-azure-invoice due to corruption');
        localStorage.removeItem('persist:ccr-azure-invoice');
      }
      
      // Log final recovery status
      console.log('📊 Recovery Summary:', {
        authRecovered: recoveredAuth,
        azureRecovered: recoveredAzure,
        action: recoveredAuth ? 'User stays logged in' : 'User must re-login'
      });
    }
  } else {
    console.log('✅ Redux Persist: Store rehydration complete successfully');
    
    // Verify auth data after successful rehydration
    if (typeof window !== 'undefined') {
      const state = store.getState();
      console.log('📊 Auth State After Rehydration:', {
        isAuthenticated: state.auth?.isAuthenticated,
        hasAccessToken: !!state.auth?.accessToken,
        hasUser: !!state.auth?.user,
        hasSoldTo: !!state.auth?.soldTo
      });
    }
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

// Make store accessible for request interceptors (client-side only)
if (typeof window !== 'undefined') {
  window.__REDUX_STORE__ = store;
}