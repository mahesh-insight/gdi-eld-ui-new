// src/components/ReduxProvider.jsx
"use client";

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store/store';
import { useEffect } from 'react';

export default function ReduxProvider({ children }) {
  useEffect(() => {
    // Expose store to window for request interceptor access
    if (typeof window !== 'undefined') {
      window.__REDUX_STORE__ = store;
      console.log('🔧 Redux store exposed to window for API access');
    }
  }, []);

  return (
    <Provider store={store}>
      <PersistGate 
        loading={null}
        persistor={persistor}
        onBeforeLift={() => {
          // Ensure store is ready before rendering
          console.log('🔄 Redux Store rehydrated successfully');
          // Also ensure window access is available after rehydration
          if (typeof window !== 'undefined') {
            window.__REDUX_STORE__ = store;
          }
        }}
      >
        {children}
      </PersistGate>
    </Provider>
  );
}