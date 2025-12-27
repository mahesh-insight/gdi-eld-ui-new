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

  // DEBUGGING: Log what we're actually getting from Redux
  console.log('🔍 useAuth: Current auth state:', {
    timestamp: new Date().toISOString(),
    isAuthenticated: auth?.isAuthenticated,
    hasUser: !!auth?.user,
    hasAccessToken: !!auth?.accessToken,
    hasLoginResponse: !!auth?.loginResponse,
    userKeys: auth?.user ? Object.keys(auth.user) : [],
    authKeys: Object.keys(auth || {}),
    authStateRaw: auth,
    reduxPersistState: auth?._persist
  });

  const login = (loginData) => {
    dispatch(setAuthenticated(true));
    dispatch(setUser(loginData.user));
    dispatch(setLoginResponse(loginData));
    dispatch(setAccessToken(loginData.accessToken));
    dispatch(setLoading(false));
  };

  const logout = () => {
    console.log('🔧 Auth: Logging out - clearing all data');
    
    // Clear Redux state (this clears all sensitive data from memory)
    dispatch(clearAuth());
    
    // FIXED: Also clear the userSlice state to prevent stale user data
    import('@/lib/store/slices/userSlice').then((module) => {
      if (module.clearUserState) {
        dispatch(module.clearUserState());
        console.log('✅ Auth: Cleared userSlice state');
      }
    }).catch(err => {
      console.warn('⚠️ Auth: Could not clear userSlice:', err);
    });
    
    // Clear Azure Invoice cache as well
    if (typeof window !== 'undefined') {
      try {
        // Dynamically import Azure Invoice actions
        import('@/store/azureInvoiceSlice').then((module) => {
          if (module.clearData) {
            dispatch(module.clearData());
            console.log('✅ Auth: Cleared Azure Invoice cache');
          }
        }).catch(err => {
          console.warn('⚠️ Auth: Could not clear Azure Invoice cache:', err);
        });
        
        // Clear all localStorage including Redux persist
        localStorage.removeItem('persist:ccr-auth');
        localStorage.removeItem('persist:ccr-azure-invoice');
        localStorage.removeItem('persist:ccr-user'); // Also clear user slice persist
        console.log('✅ Auth: Cleared localStorage persist data');
      } catch (err) {
        console.warn('⚠️ Auth: localStorage clear error:', err);
      }
    }
    
    // Also clear cookies if they exist (client-side)
    if (typeof window !== 'undefined') {
      // Use dynamic import to avoid SSR issues
      import('js-cookie').then((Cookies) => {
        Cookies.default.remove('user_context');
        Cookies.default.remove('access_token');
        console.log('✅ Auth: Cookies cleared');
      }).catch(err => {
        console.warn('⚠️ Auth: Could not clear cookies:', err);
      });
    }
    
    console.log('✅ Auth: Logout completed - all cache and Redux store cleared');
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