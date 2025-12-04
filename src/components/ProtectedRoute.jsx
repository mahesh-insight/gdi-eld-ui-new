"use client";

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';

/**
 * Protected route wrapper component
 * Shows content immediately while handling authentication in background
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
  }, []);

  useEffect(() => {
    // Handle authentication checks in background after mount
    if (mounted && !isLoading) {
      const hasCompleteAuth = isAuthenticated && user && accessToken;
      
      if (!hasCompleteAuth && !hasRedirected) {
        setHasRedirected(true);
        // Small delay to prevent flash during navigation
        setTimeout(() => {
          redirectToLogin();
        }, 100);
      }
    }
  }, [mounted, isLoading, isAuthenticated, user, accessToken, hasRedirected, redirectToLogin]);

  // Always render content immediately for seamless navigation
  // Authentication redirects happen silently in background
  return <>{children}</>;
}