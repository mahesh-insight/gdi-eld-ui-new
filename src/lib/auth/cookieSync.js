// src/lib/auth/cookieSync.js

/**
 * Utility to sync Redux auth state with browser cookies
 * Ensures server-side actions can always access authentication data
 */

/**
 * Sync Redux auth state to cookies for server-side access
 * Called whenever auth state changes or before critical operations
 */
export function syncAuthToCookies(authState) {
  if (typeof window === 'undefined') {
    return; // Server-side, cannot set cookies
  }

  console.log('🍪 CookieSync: syncAuthToCookies called with state:', {
    timestamp: new Date().toISOString(),
    isAuthenticated: authState?.isAuthenticated,
    hasUser: !!authState?.user,
    hasAccessToken: !!authState?.accessToken,
    userId: authState?.user?.soldToId
  });

  const { isAuthenticated, user, accessToken } = authState;

  if (isAuthenticated && user && accessToken) {
    console.log('🍪 Syncing auth state to cookies...');
    
    // Set access token cookie (no expiration - session cookie)
    document.cookie = `access_token=${accessToken}; path=/; SameSite=Strict`;
    
    // Set user context cookie for server-side soldToId extraction (no expiration - session cookie)
    const userContextData = {
      soldToId: user.soldToId,
      persona: user.persona,
      firstName: user.firstName,
      isAuthenticated: true,
      lastSync: Date.now()
    };
    document.cookie = `user_context=${encodeURIComponent(JSON.stringify(userContextData))}; path=/; SameSite=Strict`;
    
    console.log('✅ Auth cookies synced successfully - no expiration set', {
      userContextSize: JSON.stringify(userContextData).length,
      accessTokenSize: accessToken.length,
      cookiesAfterSync: document.cookie
    });
  } else {
    console.log('⚠️ Cannot sync auth to cookies - incomplete auth state');
  }
}

/**
 * Clear authentication cookies (for logout)
 */
export function clearAuthCookies() {
  if (typeof window === 'undefined') {
    return; // Server-side, cannot clear cookies
  }

  console.log('🧹 CookieSync: clearAuthCookies called - clearing auth cookies...', {
    timestamp: new Date().toISOString(),
    cookiesBeforeClear: document.cookie,
    stackTrace: new Error().stack
  });
  
  // Clear access token cookie (no expiration set)
  document.cookie = 'access_token=; path=/; max-age=0; SameSite=Strict';
  
  // Clear user context cookie (no expiration set)
  document.cookie = 'user_context=; path=/; max-age=0; SameSite=Strict';
  
  console.log('✅ Auth cookies cleared', {
    cookiesAfterClear: document.cookie
  });
}

/**
 * Check if cookies are in sync with Redux state
 */
export function checkCookieSync(authState) {
  if (typeof window === 'undefined') {
    return true; // Server-side, assume sync is okay
  }

  const { isAuthenticated, user, accessToken } = authState;

  if (!isAuthenticated || !user || !accessToken) {
    return true; // No auth state to sync
  }

  // Check if access_token cookie exists
  const cookies = document.cookie.split(';');
  const accessTokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith('access_token=')
  );
  
  if (!accessTokenCookie) {
    console.log('⚠️ Access token cookie missing - needs sync');
    return false;
  }

  return true;
}