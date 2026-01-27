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
    
    // Clear session tracking data
    if (typeof window !== 'undefined') {
      try {
        import('@/lib/auth/sessionManager').then((module) => {
          if (module.clearLastVisitedPage) {
            module.clearLastVisitedPage();
            console.log('✅ Auth: Cleared last visited page tracking');
          }
        }).catch(err => {
          console.warn('⚠️ Auth: Could not clear session tracking:', err);
        });
      } catch (err) {
        console.warn('⚠️ Auth: Session cleanup error:', err);
      }
    }
    
    // Clear Redux state (this clears all sensitive data from memory)
    dispatch(clearAuth());
    
    // Clear dashboard data
    import('@/store/dashboardSlice').then((module) => {
      if (module.clearDashboardData) {
        dispatch(module.clearDashboardData());
        console.log('✅ Auth: Cleared dashboard state');
      }
    }).catch(err => {
      console.warn('⚠️ Auth: Could not clear dashboard state:', err);
    });
    
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
        
        // Clear ALL localStorage including Redux persist
        const localStorageKeys = [
          'persist:ccr-auth',
          'persist:ccr-azure-invoice',
          'persist:ccr-dashboard',
          'persist:ccr-user',
          'persist:root',
          'access_token',
          'token_expiry',
          'user_context',
          'soldToId',
          'uiProps',
          'authenticationURL',
          'logged_in',
          'user_data',
          'account_selection',
          'login_response',
          'flags',
          'uiproperties'
        ];
        
        localStorageKeys.forEach(key => {
          localStorage.removeItem(key);
        });
        console.log('✅ Auth: Cleared ALL localStorage persist data');
        
        // Clear sessionStorage
        sessionStorage.clear();
        console.log('✅ Auth: Cleared sessionStorage');
      } catch (err) {
        console.warn('⚠️ Auth: localStorage clear error:', err);
      }
    }
    
    // Also clear ALL cookies if they exist (client-side)
    if (typeof window !== 'undefined') {
      try {
        const cookiesToClear = [
          'access_token',
          'token_expiry',
          'user_context',
          'soldToId',
          'persist:ccr-auth',
          'persist:root'
        ];
        
        cookiesToClear.forEach(cookieName => {
          // Clear for current path
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          // Clear with domain
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          // Clear for parent domain
          const domain = window.location.hostname.split('.').slice(-2).join('.');
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
        });
        console.log('✅ Auth: ALL Cookies cleared');
      } catch (err) {
        console.warn('⚠️ Auth: Could not clear cookies:', err);
      }
    }
    
    console.log('✅ Auth: Logout completed - ALL cache, cookies, and Redux store cleared');
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