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
  const authState = useSelector(state => {
    try {
      return state?.auth || {};
    } catch (error) {
      console.error('🛡️ ProtectedRoute: Error accessing auth state:', error);
      return {};
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Handle authentication checks in background after mount and rehydration
    if (mounted && !isLoading) {
      // Check if Redux persist is still rehydrating
      const isRehydrating = authState?._persist?.rehydrated === false;
      const hasCompleteAuth = isAuthenticated && user && accessToken;
      
      console.log('🛡️ ProtectedRoute: Auth check:', {
        mounted,
        isLoading,
        isAuthenticated,
        hasUser: !!user,
        hasAccessToken: !!accessToken,
        hasCompleteAuth,
        hasRedirected,
        isRehydrating,
        persistRehydrated: authState?._persist?.rehydrated
      });
      
      // Don't redirect while still rehydrating
      if (isRehydrating) {
        console.log('🛡️ ProtectedRoute: Still rehydrating, waiting...');
        return;
      }
      
      if (!hasCompleteAuth && !hasRedirected) {
        console.log('🛡️ ProtectedRoute: Triggering authentication...');
        setHasRedirected(true);
        // Small delay to prevent flash during navigation
        setTimeout(() => {
          console.log('🛡️ ProtectedRoute: Calling redirectToLogin...');
          redirectToLogin();
        }, 100);
      }
    }
  }, [mounted, isLoading, isAuthenticated, user, accessToken, hasRedirected, redirectToLogin, authState]);

  // Only render content if properly authenticated OR still loading
  // Prevents showing "authenticated" content when user is not actually authenticated
  if (!mounted || isLoading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  // Only show content if user is properly authenticated
  const hasCompleteAuth = isAuthenticated && user && accessToken;
  if (!hasCompleteAuth) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Redirecting to authentication...</div>
      </div>
    );
  }
  
  return <>{children}</>;
}