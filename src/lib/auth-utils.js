/**
 * Authentication utilities for token management and validation
 */

/**
 * Check if the access token is valid and not expired
 * @param {string} token - The access token
 * @param {string} tokenExpiry - The token expiry timestamp
 * @returns {boolean} - Whether the token is valid
 */
export function isTokenValid(token, tokenExpiry) {
  if (!token || !tokenExpiry) {
    return false;
  }
  
  try {
    const expiryDate = new Date(tokenExpiry);
    const now = new Date();
    const isValid = expiryDate > now;
    
    if (!isValid) {
      console.log('Token expired at:', tokenExpiry, 'Current time:', now.toISOString());
    }
    
    return isValid;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return false;
  }
}

/**
 * Clear all authentication cookies/localStorage
 */
export function clearAuthData() {
  if (typeof window !== 'undefined') {
    // Client-side cleanup
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('user_context');
    
    // Clear cookies via document.cookie
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'token_expiry=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_context=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
}

/**
 * Get authentication URL for login redirect
 * @param {string} returnUrl - URL to return to after authentication
 * @returns {string} - The authentication URL
 */
export function getAuthUrl(returnUrl = '/') {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const encodedReturnUrl = encodeURIComponent(returnUrl);
  return `/?return_url=${encodedReturnUrl}`;
}

/**
 * Redirect to login page
 * @param {string} currentPath - Current page path to return to after login
 */
export function redirectToLogin(currentPath = '/') {
  clearAuthData();
  const loginUrl = getAuthUrl(currentPath);
  
  if (typeof window !== 'undefined') {
    console.log('Token expired, redirecting to login...');
    window.location.href = loginUrl;
  }
}

/**
 * Check authentication status and redirect if expired (client-side only)
 * @param {Function} getToken - Function to get current token
 * @param {Function} getExpiry - Function to get current token expiry
 * @param {string} currentPath - Current page path
 * @returns {boolean} - Whether user is authenticated
 */
export function checkAuthAndRedirect(getToken, getExpiry, currentPath = '/') {
  if (typeof window === 'undefined') return true; // Skip on server-side
  
  const token = getToken();
  const expiry = getExpiry();
  
  if (!isTokenValid(token, expiry)) {
    redirectToLogin(currentPath);
    return false;
  }
  
  return true;
}