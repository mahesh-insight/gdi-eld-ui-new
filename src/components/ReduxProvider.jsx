// src/components/ReduxProvider.jsx
"use client";

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store/store';
import { useState, useEffect } from 'react';

export default function ReduxProvider({ children }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Make store globally accessible for interceptors
    if (typeof window !== 'undefined') {
      window.__REDUX_STORE__ = store;
    }
  }, []);

  if (!isClient) {
    // Server-side rendering - no persistence
    return <Provider store={store}>{children}</Provider>;
  }

  // Client-side rendering - with persistence
  return (
    <Provider store={store}>
      <PersistGate 
        loading={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh' 
          }}>
            Loading...
          </div>
        } 
        persistor={persistor}
      >
        {children}
      </PersistGate>
    </Provider>
  );
}