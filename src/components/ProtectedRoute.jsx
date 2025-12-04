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
    // Give minimal time for Redux Persist to rehydrate
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 100); // Reduced delay for faster authentication check
    
    return () => clearTimeout(timer);
  }, []);



  // Handle authentication check silently in the background
  // Only show a blank screen without flashing messages during the check
  if (!mounted || isLoading || !initialLoadComplete) {
    return null;
  }

  // Check if user has complete auth data
  const hasCompleteAuth = isAuthenticated && user && accessToken;
  
  if (!hasCompleteAuth && !hasRedirected) {
    setHasRedirected(true);
    redirectToLogin();
    return null;
  }

  if (!hasCompleteAuth) {
    return null;
  }

  return <>{children}</>;
}