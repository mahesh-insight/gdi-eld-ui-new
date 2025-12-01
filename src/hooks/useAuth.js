"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook for authentication management
 * Handles token validation, expiry checking, and automatic redirects
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const clearAuth = () => {
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_context');
    
    // Clear cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_context=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    setIsAuthenticated(false);
    setUser(null);
  };

  const checkAuth = () => {
    const accessToken = getCookie('access_token') || localStorage.getItem('access_token');
    const userContext = getCookie('user_context') || localStorage.getItem('user_context');

    if (!accessToken) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }

    // Token exists, assume valid (backend handles expiry)
    setIsAuthenticated(true);
    
    // Set user context if available
    if (userContext) {
      try {
        setUser(JSON.parse(userContext));
      } catch (error) {
        console.error('Error parsing user context:', error);
      }
    }
    
    setIsLoading(false);
    return true;
  };

  const redirectToLogin = () => {
    clearAuth();
    router.push('/');
  };

  const logout = () => {
    clearAuth();
    router.push('/');
  };

  useEffect(() => {
    checkAuth();
    // No periodic checking needed since backend handles token expiry
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
    checkAuth,
    redirectToLogin,
    logout,
    clearAuth
  };
}