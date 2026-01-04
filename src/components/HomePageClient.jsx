"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { 
  initializeAuth
} from '../store/authSlice';
import { setProperties } from '../store/uiSlice';

export default function HomePageClient({ authCode, soldTo, salesOrg }) {
  const [uiProperties, setUiProperties] = useState(null);
  const [uiPropertiesError, setUiPropertiesError] = useState(null);
  const [uiPropertiesLoading, setUiPropertiesLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const uiPropertiesFetchingRef = useRef(false);
  const authProcessingRef = useRef(false);

  const router = useRouter();
  const dispatch = useDispatch();
  const authState = useSelector(state => state.auth);
  const { isAuthenticated, user, accessToken, _persist } = authState;
  const storedUiProperties = useSelector(state => state.ui.properties);
  const uiCacheValid = useSelector(state => state.ui.loading === false);
  
  // Use fetched UI properties or fall back to stored ones
  const activeUiProperties = uiProperties || storedUiProperties;
  const AUTH_URL = activeUiProperties?.CCR_AUTHENTICATION_URL;
  
  // Check if Redux store has been rehydrated
  const isRehydrated = _persist?.rehydrated !== false;
  
  // Initialize state variables before using them in logging
  const reduxSoldTo = authState?.soldTo;
  
  // Only log detailed debug info when there's an issue
  const shouldDebugLog = !isAuthenticated && (authCode || isProcessing);
  
  // IMPORTANT: Define processAuthCode BEFORE any useEffect hooks that reference it
  const processAuthCode = useCallback(async (code, soldToParam, salesOrgParam) => {
    const hasProcessedKey = `processed_${code}`;
    
    console.log('🔐 processAuthCode called:', {
      code: code?.substring(0, 10) + '...',
      refValue: authProcessingRef.current,
      sessionStorageValue: !!sessionStorage.getItem(hasProcessedKey)
    });
    
    // CRITICAL: Check both sessionStorage and ref to prevent any duplicate processing
    if (sessionStorage.getItem(hasProcessedKey) || authProcessingRef.current) {
      console.log('⚠️ BLOCKED: Auth code already processed or currently processing');
      return;
    }
    
    // Set BOTH markers immediately before any async operations
    authProcessingRef.current = true;
    sessionStorage.setItem(hasProcessedKey, Date.now().toString());
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('processed_') && key !== hasProcessedKey) {
        sessionStorage.removeItem(key);
      }
    });
    
    setIsProcessing(true);
    setProcessingMessage('Processing authentication...');
    
    const finalSoldTo = soldToParam || authState?.soldTo || '';
    const finalSalesOrg = salesOrgParam || authState?.salesOrg || '';

    try {
      const { default: request } = await import('../lib/api/request');
      const response = await request.post('loginAuthCode', {
        data: code,
        params: { soldto: finalSoldTo, salesorg: finalSalesOrg }
      });
      
      if (response?.userProfile?.defaultContext?.[0] && response?.tokens?.bearerToken) {
        sessionStorage.removeItem(hasProcessedKey);
        
        const bearerToken = response.tokens.bearerToken;
        const soldToId = response.userProfile.defaultContext[0].soldToId;
        
        try {
          document.cookie = `access_token=${bearerToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
          document.cookie = `user_context=${encodeURIComponent(JSON.stringify(response))}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
        } catch (cookieError) {
          console.error('❌ Failed to set cookies:', cookieError);
        }

        const authPayload = {
          isAuthenticated: true,
          user: {
            soldToId: soldToId || null,
            persona: response.persona || null,
            firstName: response.firstName || null,
            lastName: response.lastName || null,
            username: response.username || response.userProfile?.username || null
          },
          loginResponse: response,
          accessToken: bearerToken || null,
          contextData: null,
          soldTo: finalSoldTo || soldToId || null,
          salesOrg: finalSalesOrg || null
        };
        
        // Dispatch auth immediately and redirect - don't wait
        dispatch(initializeAuth(authPayload));
        console.log('✅ Auth successful - redirecting to dashboard immediately');
        
        // Redirect immediately - dashboard will show header + skeleton loaders
        router.replace('/dashboard');
      } else {
        console.error('❌ Auth response validation failed');
        setProcessingMessage('Authentication failed: Invalid response. Please login again.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      const errorStatus = error?.response?.status;
      setProcessingMessage(`Authentication failed: ${error.message || 'Unknown error'}. Please try logging in again.`);
      setIsProcessing(false);
    }
  }, [authState, dispatch, router]);

  // Fetch UI properties on mount (client-side only)
  useEffect(() => {
    // If we have properties from Redux, we're done loading
    if (activeUiProperties) {
      console.log('⏭️ Using cached UI properties from Redux');
      setUiPropertiesLoading(false);
      return;
    }
    
    // Skip if already fetching or had an error
    if (uiPropertiesError || uiPropertiesFetchingRef.current) {
      console.log('⏭️ Skipping UI properties fetch - already in progress or error occurred');
      return;
    }
    
    // Mark as fetching - this persists across StrictMode remounts
    uiPropertiesFetchingRef.current = true;
    setUiPropertiesLoading(true);
    console.log('🚀 Starting UI properties fetch');
    
    async function fetchUiProperties() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_UI_PROPERTIES_BASE_URL || 'https://ccrdev.insight.com';
        const endpoint = `${baseUrl}/ccr-authentication-service/uiproperties`;
        
        console.log('🔍 Fetching UI properties from:', { baseUrl, endpoint });
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const props = data?.CCRUIProps || {};
        
        console.log('✅ UI properties loaded successfully');
        setUiProperties(props);
        dispatch(setProperties(props));
        setUiPropertiesLoading(false);
      } catch (error) {
        console.error('❌ Failed to fetch UI properties:', error);
        setUiPropertiesError(error.message);
        setUiPropertiesLoading(false);
      }
    }
    
    fetchUiProperties();
    // No cleanup - ref should persist to prevent duplicate fetches across remounts
  }, [dispatch, activeUiProperties, uiPropertiesError]);

  // Handle redirect when already authenticated (STRICT validation)
  useEffect(() => {
    // Only redirect if we have complete, valid authentication AND an auth code is not being processed
    // Also don't interfere if we're currently processing an auth code
    if (isRehydrated && !authCode && !isProcessing) {
      // Strict validation: ALL criteria must be met for valid authentication
      const hasSoldToId = user?.soldToId || authState?.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId;
      const hasValidToken = accessToken && 
                           typeof accessToken === 'string' &&
                           accessToken !== 'dev-bearer-token-12345' && 
                           accessToken !== 'null' && 
                           accessToken !== 'undefined' &&
                           accessToken.length > 10; // Ensure it's a real token
      const hasValidUser = user && user.soldToId && user.soldToId !== 'test-soldto';
      const hasRealAuth = isAuthenticated && hasSoldToId && hasValidToken && hasValidUser;
      
      console.log('🔍 DEBUG - Strict auth validation:', {
        isRehydrated,
        isAuthenticated, 
        hasUser: !!user, 
        hasAccessToken: !!accessToken,
        hasSoldToId,
        hasValidToken,
        hasValidUser,
        hasRealAuth,
        authCode: !!authCode,
        isProcessing,
        userSoldToId: user?.soldToId,
        accessTokenLength: typeof accessToken === 'string' ? accessToken.length : 0,
        accessTokenPreview: accessToken && typeof accessToken === 'string' ? accessToken.substring(0, 10) + '...' : null,
        strictValidationCanRun: isRehydrated && !authCode && !isProcessing
      });
      
      if (hasRealAuth) {
        console.log('✅ Valid authentication confirmed, redirecting to dashboard');
        router.replace('/dashboard');
      } else if (isAuthenticated || user || accessToken) {
        // Only clear if we're sure it's invalid data (be more conservative)
        const shouldClear = (
          // Clear if token is clearly invalid
          (accessToken && (accessToken === 'dev-bearer-token-12345' || accessToken === 'null' || accessToken === 'undefined')) ||
          // Clear if user has test data
          (user && user.soldToId === 'test-soldto') ||
          // Clear if authenticated but no token at all
          (isAuthenticated && !accessToken)
        );
        
        if (shouldClear) {
          console.log('⚠️ Invalid authentication state detected - clearing auth data');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('persist:ccr-auth');
            document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'user_context=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
          dispatch(initializeAuth({
            isAuthenticated: false,
            user: null,
            loginResponse: null,
            accessToken: null,
            contextData: null,
            soldTo: null,
            salesOrg: null
          }));
        } else {
          console.log('🔄 Partial auth data found but keeping it (might be mid-authentication)');
        }
      }
    }
  }, [isRehydrated, isAuthenticated, user, accessToken, authCode, router, authState, dispatch, isProcessing]);

  // Handle auth code processing (separate to prevent double calls)
  useEffect(() => {
    console.log('🔍 DEBUG - Auth processing useEffect triggered:', { 
      authCode: !!authCode, 
      authCodeValue: authCode,
      soldTo, 
      salesOrg,
      isAuthenticated,
      isRehydrated,
      authProcessingRefValue: authProcessingRef.current,
      windowDefined: typeof window !== 'undefined'
    });

    // Check ref first - if already processing, skip immediately
    if (authProcessingRef.current) {
      console.log('⚠️ Auth processing already in progress (ref check), skipping');
      return;
    }

    // Try processing with more lenient conditions for debugging
    // Allow processing if we have auth code but aren't properly authenticated (could be invalid/incomplete auth state)
    const hasValidAuth = isAuthenticated && user?.soldToId && accessToken && typeof accessToken === 'string' && accessToken.length > 10;
    const shouldProcess = authCode && !hasValidAuth && typeof window !== 'undefined';
    
    if (authCode) {
      console.log('🔍 Auth processing check:', {
        shouldProcess,
        isRehydrated,
        hasValidAuth,
        authProcessingRef: authProcessingRef.current,
        conditions: {
          hasAuthCode: !!authCode,
          isAuthenticated,
          hasUser: !!user,
          userSoldToId: user?.soldToId,
          hasAccessToken: !!accessToken,
          accessTokenType: typeof accessToken,
          accessTokenLength: typeof accessToken === 'string' ? accessToken.length : 0,
          hasWindow: typeof window !== 'undefined'
        }
      });
    }
    
    if (shouldProcess && (isRehydrated || !_persist)) { // Allow processing if no persist or rehydrated
      const hasProcessedKey = `processed_${authCode}`;
      
      console.log('🔍 Checking processed key:', hasProcessedKey, 'exists:', !!sessionStorage.getItem(hasProcessedKey));
      
      if (sessionStorage.getItem(hasProcessedKey)) {
        return;
      }
      
      console.log('✅ All conditions met - starting auth code processing');
      processAuthCode(authCode, soldTo, salesOrg);
      return;
    } else {
      console.log('⏸️ Auth processing conditions not met');
    }
  }, [authCode, soldTo, salesOrg, isRehydrated, isAuthenticated, user, accessToken, _persist, processAuthCode]); // Removed isProcessing

  // Fetch UI properties when authenticated (once per session)
  useEffect(() => {
    if (isAuthenticated && !uiProperties) {
      console.log('🎨 Fetching UI properties for authenticated user...');
      dispatch(setProperties({ theme: 'light', navigation: 'standard' }));
    }
  }, [isAuthenticated, dispatch, uiProperties]);
  
  if (shouldDebugLog) {
    console.log('🔍 DEBUG - Current component state:', {
      authCode: !!authCode,
      isAuthenticated,
      isRehydrated,
      isProcessing,
      user: !!user,
      accessToken: !!accessToken
    });
  }

  // Show loading state until we have both properties AND AUTH_URL
  if (uiPropertiesLoading || !activeUiProperties || !AUTH_URL) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        gap: '20px'
      }}>
        <div style={{ 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ color: '#666', fontSize: '16px' }}>Loading configuration...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  // Show error if UI properties failed to load (only after loading completes)
  if (uiPropertiesError) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>
        Error: Failed to load configuration. Please ensure you are connected to the corporate network/VPN.
        <br />
        <small>{uiPropertiesError}</small>
      </div>
    );
  }
  
  const CLIENT_ID = 'process.env.NEXT_PUBLIC_CLIENT_ID';

  // Only log Redux state when debugging
  if (shouldDebugLog) {
    console.log('🔍 DEBUG - Redux auth state:', { 
      isAuthenticated, 
      user: !!user, 
      accessToken: !!accessToken, 
      reduxSoldTo: authState?.soldTo, 
      reduxSalesOrg: authState?.salesOrg 
    });
  }

  // Get soldTo/salesOrg for login URL (from Redux store if not in URL - token expiry scenario)
  const effectiveSoldTo = soldTo || authState?.soldTo || '';
  const effectiveSalesOrg = salesOrg || authState?.salesOrg || '';
  
  // Build auth URL - use AUTH_URL from uiProperties response (CCRUIProps.CCR_AUTHENTICATION_URL)
  // Override redirect_uri for local development and Vercel deployments
  const buildAuthURL = () => {
    if (!AUTH_URL) {
      console.error('❌ AUTH_URL is missing from UI properties!');
      return '#';
    }
    
    try {
      // Parse the AUTH_URL from uiProperties (CCRUIProps.CCR_AUTHENTICATION_URL)
      const url = new URL(AUTH_URL);
      
      // Override redirect_uri to current origin for non-production environments
      if (typeof window !== 'undefined') {
        const currentOrigin = window.location.origin;
        const existingRedirectUri = url.searchParams.get('redirect_uri');
        
        // Override redirect_uri if:
        // 1. Running on localhost (local development)
        // 2. Running on Vercel (*.vercel.app domain)
        // 3. NOT running on ccrdev.insight.com or ccrqa.insight.com (production domains)
        const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
        const isVercel = currentOrigin.includes('vercel.app');
        const isProduction = currentOrigin.includes('ccrdev.insight.com') || currentOrigin.includes('ccrqa.insight.com');
        
        if (isLocalhost || isVercel) {
          console.log('🔄 Dev/Staging environment detected - overriding redirect_uri to:', currentOrigin);
          url.searchParams.set('redirect_uri', currentOrigin);
        } else if (isProduction) {
          console.log('☁️ Production environment - using original redirect_uri');
        } else {
          console.log('⚠️ Unknown environment - using current origin as redirect_uri');
          url.searchParams.set('redirect_uri', currentOrigin);
        }
        
        console.log('🔗 Redirect URIs:', { 
          original: existingRedirectUri,
          current: currentOrigin,
          final: url.searchParams.get('redirect_uri'),
          environment: isLocalhost ? 'localhost' : isVercel ? 'vercel' : isProduction ? 'production' : 'unknown'
        });
      }
      
      // Add soldTo/salesOrg parameters if available
      if (effectiveSoldTo && effectiveSalesOrg) {
        url.searchParams.set('soldto', effectiveSoldTo);
        url.searchParams.set('salesorg', effectiveSalesOrg);
      }
      
      const finalUrl = url.toString();
      console.log('🔗 Built auth URL from uiProperties:', { 
        sourceAuthUrl: AUTH_URL,
        finalUrl 
      });
      return finalUrl;
    } catch (error) {
      console.error('❌ Error building auth URL:', error);
      return AUTH_URL;
    }
  };

  // Don't render anything until Redux is rehydrated to prevent flash
  if (!isRehydrated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f5f5f5'
      }}>
        <h1 style={{ marginBottom: '30px', color: '#333' }}>Welcome to CCR</h1>
        {/* Show login button but make it non-functional until rehydrated */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          borderRadius: '4px',
          fontSize: '16px',
          opacity: 0.7
        }}>
          Login
        </div>
      </div>
    );
  }

  // Get display states
  const showLoader = isProcessing || (authCode && !isAuthenticated);
  const loaderMessage = isProcessing ? processingMessage : 'Initializing Authentication...';

  // Manual clear function for debugging
  const clearAuthState = () => {
    console.log('🔧 Manually clearing all auth state...');
    if (typeof window !== 'undefined') {
      // Clear sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('processed_')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Clear localStorage
      localStorage.removeItem('persist:ccr-auth');
      
      // Clear cookies
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user_context=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    
    // Clear Redux state
    dispatch(initializeAuth({
      isAuthenticated: false,
      user: null,
      loginResponse: null,
      accessToken: null,
      contextData: null,
      soldTo: null,
      salesOrg: null
    }));
    
    setIsProcessing(false);
    setProcessingMessage('');
    
    // Reload the page to start fresh
    window.location.reload();
  };

  // Always show the login screen with conditional overlay
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Main Login Screen */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        filter: showLoader ? 'brightness(0.7)' : 'none',
        pointerEvents: showLoader ? 'none' : 'auto',
        transition: 'filter 0.3s ease'
      }}>
        <h1 style={{ marginBottom: '30px', color: '#333' }}>Welcome to CCR</h1>
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'center' }}>
          <a 
            href={buildAuthURL()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              opacity: showLoader ? 0.5 : 1
            }}
          >
            Login
          </a>
          
          {/* Debug controls - show if there's an actual problem that needs debugging */}
          {(processingMessage.includes('failed') || 
            (authCode && !isProcessing && 
             typeof window !== 'undefined' && 
             sessionStorage.getItem(`processed_${authCode}`) && 
             (Date.now() - parseInt(sessionStorage.getItem(`processed_${authCode}`))) > 10000) ||
            (isAuthenticated && user && accessToken && authCode && !isProcessing)) && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                Debug: Authentication issue detected
                <br />
                Auth Code: {authCode ? authCode.substring(0, 8) + '...' : 'None'}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={clearAuthState}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Auth State & Retry
                </button>
                {authCode && !isProcessing && (
                  <button
                    onClick={() => {
                      console.log('🚀 Force processing auth code manually...');
                      // Clear the processed flag first
                      sessionStorage.removeItem(`processed_${authCode}`);
                      processAuthCode(authCode, soldTo, salesOrg);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Force Process Auth Code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {showLoader && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%'
          }}>
            {/* Spinner */}
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px auto'
            }}></div>
            
            
            <p style={{ 
              color: '#666', 
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              {loaderMessage}
            </p>
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}