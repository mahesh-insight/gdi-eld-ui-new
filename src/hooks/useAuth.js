"use client";

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { setAuthenticated, setLoading, setUser, setLoginResponse, setAccessToken, clearAuth, initializeAuth } from '../store/authSlice';

/**
 * Custom hook for authentication management
 * Uses Redux for state management, only uses cookies (no localStorage)
 */
export function useAuth() {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, user, loginResponse, accessToken } = useSelector(state => {
    console.log('🔍 useAuth selector - current Redux auth state:', state.auth);
    return state.auth;
  });
  const router = useRouter();

  // Force loading to false after a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('⚠️ Forcing loading to false after timeout');
        dispatch(setLoading(false));
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading, dispatch]);

  // Also set loading to false immediately if we have complete auth data
  useEffect(() => {
    if (isLoading && accessToken && isAuthenticated && user) {
      console.log('✅ Auth data detected, setting loading to false');
      dispatch(setLoading(false));
    }
  }, [isLoading, accessToken, isAuthenticated, user, dispatch]);

  const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const clearAuthData = () => {
    // Clear session cookie
    document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Clear Redux state (this clears all sensitive data from memory)
    dispatch(clearAuth());
  };

  const checkAuth = useCallback(() => {
    // Skip auth check if we're on the auth processing page (it handles its own auth)
    if (typeof window !== 'undefined' && (window.location.pathname === '/auth/callback' || window.location.pathname === '/auth/processing')) {
      return true; // Let the processing page handle authentication
    }

    // Simply return the current authentication state from Redux
    // Don't modify state here to avoid race conditions
    const isValid = accessToken && isAuthenticated && user;
    console.log('🔍 Auth check result:', { isValid, accessToken: !!accessToken, isAuthenticated, user: !!user });
    return isValid;
  }, [accessToken, isAuthenticated, user]);

  const redirectToLogin = () => {
    clearAuthData();
    router.push('/');
  };

  const logout = () => {
    clearAuthData();
    router.push('/');
  };

  // Remove useEffect that was causing multiple auth checks
  // Let components call checkAuth when needed

  return {
    isAuthenticated,
    isLoading,
    user,
    loginResponse,
    accessToken,
    checkAuth,
    redirectToLogin,
    logout,
    clearAuth: clearAuthData
  };
}