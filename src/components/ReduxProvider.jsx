// src/components/ReduxProvider.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store/store';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Redux Provider Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          margin: '20px'
        }}>
          <h2>⚠️ Redux Store Error</h2>
          <p>There was an issue initializing the application store.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ReduxProvider({ children }) {
  const [isClient, setIsClient] = useState(false);
  const [storeReady, setStoreReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    try {
      // Verify store is available
      if (!store) {
        throw new Error('Redux store not available');
      }

      // Test store dispatch
      store.dispatch({ type: '@@INIT' });

      setIsClient(true);
      
      // Make store globally accessible for interceptors
      if (typeof window !== 'undefined') {
        window.__REDUX_STORE__ = store;
      }
      
      setStoreReady(true);
    } catch (error) {
      console.error('Redux Provider initialization error:', error);
      setInitError(error.message);
    }
  }, []);

  // Error state
  if (initError) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        margin: '20px'
      }}>
        <h2>⚠️ Redux Store Initialization Error</h2>
        <p>Error: {initError}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Application
        </button>
      </div>
    );
  }

  if (!isClient || !storeReady) {
    // Server-side rendering or store not ready - basic provider
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading Redux store...
      </div>
    );
  }

  // Client-side rendering - with persistence and error boundary
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate 
          loading={null} 
          persistor={persistor}
          onBeforeLift={() => {
            console.log('✅ Redux PersistGate: Store rehydrated');
          }}
        >
          {children}
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}