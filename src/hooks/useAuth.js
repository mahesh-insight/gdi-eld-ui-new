// src/hooks/useAuth.js
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  setAuthenticated, 
  setLoading, 
  setUser, 
  setLoginResponse, 
  setAccessToken,
  setContextData,
  setSoldTo,
  setSalesOrg,
  clearAuth 
} from '@/store/authSlice';

/**
 * Custom hook for authentication state management
 * Uses Redux for state management, only uses cookies (no localStorage)
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);

  // Auto-authenticate for development immediately when hook is called
  // Remove auto-authentication - let the real auth flow handle authentication

  const login = (loginData) => {
    dispatch(setAuthenticated(true));
    dispatch(setUser(loginData.user));
    dispatch(setLoginResponse(loginData));
    dispatch(setAccessToken(loginData.accessToken));
    dispatch(setLoading(false));
  };

  const logout = () => {
    // Clear Redux state (this clears all sensitive data from memory)
    dispatch(clearAuth());
  };

  const updateUser = (userData) => {
    dispatch(setUser(userData));
  };

  const setAuthLoading = (loading) => {
    dispatch(setLoading(loading));
  };

  const updateContextData = (contextData) => {
    dispatch(setContextData(contextData));
  };

  const updateSoldTo = (soldTo) => {
    dispatch(setSoldTo(soldTo));
  };

  const updateSalesOrg = (salesOrg) => {
    dispatch(setSalesOrg(salesOrg));
  };

  const redirectToLogin = () => {
    try {
      if (typeof dispatch !== 'function') {
        console.error('🔧 Auth: Dispatch is not a function', typeof dispatch);
        return;
      }

      // Clear any existing auth state and redirect to home for authentication
      console.log('🔧 Auth: Clearing auth state and redirecting to login');
      dispatch(setAuthenticated(false));
      dispatch(setUser(null));
      dispatch(setAccessToken(null));
      dispatch(setLoading(false));
      
      // Redirect to home page for authentication
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('🔧 Auth: Error in redirectToLogin:', error);
    }
  };

  return {
    // State
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
    loginResponse: auth.loginResponse,
    accessToken: auth.accessToken,
    contextData: auth.contextData,
    soldTo: auth.soldTo,
    salesOrg: auth.salesOrg,
    
    // Actions
    login,
    logout,
    updateUser,
    setAuthLoading,
    updateContextData,
    updateSoldTo,
    updateSalesOrg,
    redirectToLogin
  };
};

export default useAuth;