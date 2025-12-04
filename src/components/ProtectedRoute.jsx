"use client";

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';

// Delay for Redux Persist rehydration to complete
const REHYDRATION_DELAY_MS = 100;

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
    // Give minimal time for Redux Persist to rehydrate
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, REHYDRATION_DELAY_MS);
    
    return () => clearTimeout(timer);
  }, []);



  // Handle authentication check silently in the background
  // Screen readers get notified via aria-live without visual flash
  if (!mounted || isLoading || !initialLoadComplete) {
    return (
      <div 
        role="status" 
        aria-live="polite" 
        aria-label="Checking authentication"
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
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
      <div 
        role="status" 
        aria-live="polite" 
        aria-label="Redirecting to login"
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
        Redirecting to login...
      </div>
    );
  }

  if (!hasCompleteAuth) {
    return (
      <div 
        role="status" 
        aria-live="polite" 
        aria-label="Redirecting to login"
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
        Redirecting to login...
      </div>
    );
  }

  return <>{children}</>;
}