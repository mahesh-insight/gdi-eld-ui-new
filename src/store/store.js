import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';
import authReducer from './authSlice';
import uiReducer from '../lib/store/slices/uiSlice';
import azureInvoiceReducer from '../lib/store/slices/azureInvoiceSlice';
import pageReducer from '../lib/store/slices/pageSlice';
import userReducer from '../lib/store/slices/userSlice';
import gridReducer from '../lib/store/slices/gridSlice';

// Create a noop storage for SSR compatibility
const createNoopStorage = () => {
  return {
    getItem(_key) {
      return Promise.resolve(null);
    },
    setItem(_key, value) {
      return Promise.resolve(value);
    },
    removeItem(_key) {
      return Promise.resolve();
    },
  };
};

// Use localStorage in browser, noop storage in SSR
const storage = typeof window !== 'undefined' 
  ? createWebStorage('local') 
  : createNoopStorage();

const persistConfig = {
  key: 'ccr-auth',
  storage,
  whitelist: ['isAuthenticated', 'user', 'loginResponse', 'accessToken'], // Only persist specific fields
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    ui: uiReducer,
    azureInvoice: azureInvoiceReducer,
    page: pageReducer,
    user: userReducer,
    grid: gridReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/REGISTER',
          'persist/PURGE',
          'persist/FLUSH',
          'persist/PAUSE',
          'auth/setLoginResponse',
          'auth/setContextData',
          'auth/initializeAuth',
        ],
        ignoredPaths: [
          'auth.loginResponse',
          'auth.contextData',
        ],
      },
    }),
});

export const persistor = persistStore(store);