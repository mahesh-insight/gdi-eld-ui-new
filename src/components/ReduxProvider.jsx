// src/components/ReduxProvider.jsx
"use client";

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store/store';
import { useEffect, useState } from 'react';

export default function ReduxProvider({ children }) {
  const [persistError, setPersistError] = useState(null);
  
  useEffect(() => {
    // Expose store to window for request interceptor access
    if (typeof window !== 'undefined') {
      window.__REDUX_STORE__ = store;
      console.log('🔧 Redux store exposed to window for API access');
      
      // Add global error handler for redux-persist errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const errorMessage = args.join(' ');
        if (errorMessage.includes('payload') || errorMessage.includes('redux-persist')) {
          console.warn('🚨 Caught redux-persist error, attempting to clear corrupted data...');
          try {
            localStorage.removeItem('persist:ccr-auth');
            localStorage.removeItem('persist:ccr-azure-invoice');
            setPersistError('Storage cleared due to errors. Please refresh the page.');
          } catch (e) {
            console.warn('Failed to clear storage:', e);
          }
        }
        originalConsoleError.apply(console, args);
      };
      
      return () => {
        console.error = originalConsoleError;
      };
    }
  }, []);

  if (persistError) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        margin: '20px',
        borderRadius: '8px'
      }}>
        <h2 style={{ color: '#856404' }}>⚠️ Storage Error Detected</h2>
        <p>{persistError}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Refresh Page
        </button>
        <br />
        <a 
          href="/clear-storage.html" 
          style={{
            display: 'inline-block',
            marginTop: '15px',
            color: '#007bff',
            textDecoration: 'underline'
          }}
        >
          Or click here to manually clear storage
        </a>
      </div>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate 
        loading={null}
        persistor={persistor}
        onBeforeLift={() => {
          try {
            // Ensure store is ready before rendering
            console.log('🔄 Redux Store rehydrated successfully');
            // Also ensure window access is available after rehydration
            if (typeof window !== 'undefined') {
              window.__REDUX_STORE__ = store;
            }
          } catch (error) {
            console.error('🚨 Error during rehydration:', error);
            setPersistError('Failed to rehydrate store. Storage will be cleared.');
            if (typeof window !== 'undefined') {
              localStorage.removeItem('persist:ccr-auth');
              localStorage.removeItem('persist:ccr-azure-invoice');
            }
          }
        }}
      >
        {children}
      </PersistGate>
    </Provider>
  );
}