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
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths for serializable check (Date objects)
        ignoredActionPaths: ['payload.loginResponse.userProfile.properties'],
        ignoredPaths: ['auth.loginResponse.userProfile.properties'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor for the store
export const persistor = persistStore(store);

// Export store for use in components
export default store;