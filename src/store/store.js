// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

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

// Root reducer combining all slices
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  ui: uiSlice,
  azureInvoice: azureInvoiceSlice,
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
  try {
    const persistData = localStorage.getItem('persist:ccr-auth');
    if (persistData) {
      JSON.parse(persistData);
    }
  } catch (error) {
    console.warn('🔧 Corrupted persist data detected, clearing...', error);
    localStorage.removeItem('persist:ccr-auth');
  }
}

// Export store for use in components
export default store;