"use client";

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import Cookies from 'js-cookie'; // Add cookie detection

/**
 * Protected route wrapper component  
 * Debug version to track auth state changes
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
    // DEBUG: Track authentication state changes in real-time
    const authCookies = {
      userContext: Cookies.get('user_context'),
      accessToken: Cookies.get('access_token')
    };
    
    console.log('🔍 ProtectedRoute: DEBUGGING AUTH STATE:', {
      timestamp: new Date().toISOString(),
      mounted,
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      hasAccessToken: !!accessToken,
      hasRedirected,
      authState: {
        isRehydrating: authState?._persist?.rehydrated === false,
        persistRehydrated: authState?._persist?.rehydrated,
        fullAuthState: authState
      },
      cookies: {
        hasUserContext: !!authCookies.userContext,
        hasAccessToken: !!authCookies.accessToken,
        userContextLength: authCookies.userContext?.length || 0,
        accessTokenLength: authCookies.accessToken?.length || 0,
        rawUserContext: authCookies.userContext,
        rawAccessToken: authCookies.accessToken
      },
      reduxAccessToken: (accessToken && typeof accessToken === 'string') ? `${accessToken.substring(0, 20)}...` : 'null',
      cookieAccessToken: (authCookies.accessToken && typeof authCookies.accessToken === 'string') ? `${authCookies.accessToken.substring(0, 20)}...` : 'null',
      allCookies: document.cookie
    });
    
    // Handle authentication checks in background after mount and rehydration
    if (mounted && !isLoading) {
      const isRehydrating = authState?._persist?.rehydrated === false;
      const hasCompleteAuth = isAuthenticated && user && accessToken;
      const hasCookieAuth = authCookies.userContext && authCookies.accessToken;
      
      console.log('🛡️ ProtectedRoute: Auth decision logic:', {
        isRehydrating,
        hasCompleteAuth,
        hasCookieAuth,
        willRedirect: !hasCompleteAuth && !hasCookieAuth && !hasRedirected
      });
      
      // Don't redirect while still rehydrating
      if (isRehydrating) {
        console.log('🛡️ ProtectedRoute: Still rehydrating, waiting...');
        return;
      }
      
      // If we have auth cookies but missing Redux state, give AuthContextInitializer time to work
      if (hasCookieAuth && !hasCompleteAuth) {
        console.log('🛡️ ProtectedRoute: Auth cookies found but Redux state incomplete - giving AuthContextInitializer time to sync');
        return;
      }
      
      // Only redirect if we have NO auth anywhere
      if (!hasCompleteAuth && !hasCookieAuth && !hasRedirected) {
        console.log('❌ ProtectedRoute: NO AUTH FOUND ANYWHERE - triggering redirect');
        console.log('🔍 ProtectedRoute: Final debug before redirect:', {
          completeAuthCheck: { isAuthenticated, hasUser: !!user, hasAccessToken: !!accessToken },
          cookieAuthCheck: { hasUserContext: !!authCookies.userContext, hasAccessToken: !!authCookies.accessToken },
          allCookies: document.cookie.split(';').map(c => c.trim()),
          reduxPersistState: authState?._persist
        });
        
        setHasRedirected(true);
        setTimeout(() => {
          redirectToLogin();
        }, 100);
      } else if (hasCompleteAuth) {
        console.log('✅ ProtectedRoute: Complete auth found - user is properly authenticated');
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