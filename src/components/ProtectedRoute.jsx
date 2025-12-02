"use client";

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';

/**
 * Protected route wrapper component
 * Automatically redirects to login if user is not authenticated or token is expired
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user, accessToken, redirectToLogin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Check if we're in a rehydration state
  const authState = useSelector(state => state.auth);

  useEffect(() => {
    setMounted(true);
    // Give time for Redux Persist to rehydrate
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 500); // Small delay to ensure rehydration is complete
    
    return () => clearTimeout(timer);
  }, []);



  // Show loading while mounting, loading, or waiting for initial load to complete
  if (!mounted || isLoading || !initialLoadComplete) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2em'
      }}>
        Checking authentication...
      </div>
    );
  }

  // Check if user has complete auth data
  const hasCompleteAuth = isAuthenticated && user && accessToken;
  
  if (!hasCompleteAuth && !hasRedirected) {
    setHasRedirected(true);
    redirectToLogin();
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2em'
      }}>
        Redirecting to login...
      </div>
    );
  }

  if (!hasCompleteAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2em'
      }}>
        Redirecting to login...
      </div>
    );
  }

  return <>{children}</>;
}