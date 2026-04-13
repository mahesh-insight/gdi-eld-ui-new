// Session Manager - Handles last visited page tracking and session validation

import { isJwtExpired } from '@/lib/auth-utils';

const LAST_VISITED_PAGE_KEY = 'ccr_last_visited_page';
const SESSION_TIMESTAMP_KEY = 'ccr_session_timestamp';

/**
 * Save the current page path to localStorage
 * @param {string} path - The page path to save
 */
export function saveLastVisitedPage(path) {
  if (typeof window === 'undefined') return;
  
  // Don't save auth-related pages
  const excludedPaths = ['/auth/callback', '/auth/processing', '/Unauthorised', '/'];
  
  if (!excludedPaths.includes(path) && !path.includes('code=') && !path.includes('error=')) {
    try {
      localStorage.setItem(LAST_VISITED_PAGE_KEY, path);
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
      console.log('📍 Last visited page saved:', path);
    } catch (error) {
      console.error('Failed to save last visited page:', error);
    }
  }
}

/**
 * Get the last visited page from localStorage
 * @returns {string|null} The last visited page path or null
 */
export function getLastVisitedPage() {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(LAST_VISITED_PAGE_KEY);
  } catch (error) {
    console.error('Failed to get last visited page:', error);
    return null;
  }
}

/**
 * Clear the last visited page from localStorage
 */
export function clearLastVisitedPage() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(LAST_VISITED_PAGE_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Failed to clear last visited page:', error);
  }
}

/**
 * Clear all stale auth data from cookies and localStorage (without Redux dispatch)
 */
function clearExpiredSession() {
  try {
    // Clear auth cookies
    ['access_token', 'user_context', 'soldToId'].forEach(name => {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
    // Clear persisted Redux auth state so it doesn't resurrect after page reload
    localStorage.removeItem('persist:ccr-auth');
    localStorage.removeItem('persist:ccr-dashboard');
    localStorage.removeItem('persist:ccr-azure-invoice');
    // Clear last visited page so next login sends user to dashboard, not expired page
    localStorage.removeItem(LAST_VISITED_PAGE_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    console.log('🧹 SessionManager: Cleared expired session data');
  } catch (err) {
    console.error('SessionManager: Failed to clear expired session:', err);
  }
}

/**
 * Check if user has an active session
 * @returns {boolean} True if session is active AND token is not expired
 */
export function hasActiveSession() {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for access token in cookies
    const cookies = document.cookie.split(';');
    const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('access_token='));
    
    if (accessTokenCookie) {
      const token = accessTokenCookie.split('=')[1];
      if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
        if (isJwtExpired(token)) {
          console.log('⚠️ SessionManager: Cookie token is expired — clearing session');
          clearExpiredSession();
          return false;
        }
        console.log('✅ Active session detected from cookie');
        return true;
      }
    }
    
    // Check Redux persist storage as fallback
    const persistedAuth = localStorage.getItem('persist:ccr-auth');
    if (persistedAuth) {
      try {
        const authData = JSON.parse(persistedAuth);
        const isAuthenticated = authData.isAuthenticated === 'true' || authData.isAuthenticated === true;
        const accessToken = authData.accessToken ? JSON.parse(authData.accessToken) : null;
        
        if (isAuthenticated && accessToken && 
            typeof accessToken === 'string' && 
            accessToken !== 'null' && 
            accessToken !== 'undefined' &&
            accessToken.length > 10) {
          if (isJwtExpired(accessToken)) {
            console.log('⚠️ SessionManager: Persisted token is expired — clearing session');
            clearExpiredSession();
            return false;
          }
          console.log('✅ Active session detected from Redux persist');
          return true;
        }
      } catch (parseError) {
        console.error('Failed to parse persisted auth:', parseError);
      }
    }
    
    console.log('❌ No active session found');
    return false;
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
}

/**
 * Get the redirect path for authenticated users
 * Prioritizes last visited page, otherwise defaults to dashboard
 * @returns {string} The path to redirect to
 */
export function getAuthenticatedRedirectPath() {
  const lastVisitedPage = getLastVisitedPage();
  
  if (lastVisitedPage && lastVisitedPage !== '/') {
    console.log('🎯 Redirecting to last visited page:', lastVisitedPage);
    return lastVisitedPage;
  }
  
  console.log('🎯 Redirecting to default page: /dashboard');
  return '/dashboard';
}

/**
 * Update session timestamp
 * Call this on user activity to track session freshness
 */
export function updateSessionTimestamp() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Failed to update session timestamp:', error);
  }
}
