"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { 
  initializeAuth
} from '../store/authSlice';
import { setProperties } from '../store/uiSlice';

export default function HomePageClient({ AUTH_URL, CLIENT_ID, authCode, soldTo, salesOrg }) {
  console.log('🔍 DEBUG - HomePageClient props:', { 
    AUTH_URL: !!AUTH_URL, 
    CLIENT_ID, 
    authCode, 
    soldTo, 
    salesOrg 
  });

  const router = useRouter();
  const dispatch = useDispatch();
  const authState = useSelector(state => state.auth);
  const { isAuthenticated, user, accessToken, _persist } = authState;
  const uiProperties = useSelector(state => state.ui.properties);
  const uiCacheValid = useSelector(state => state.ui.loading === false);
  
  // Check if Redux store has been rehydrated
  const isRehydrated = _persist?.rehydrated !== false;
  
  // Initialize state variables before using them in logging
  const reduxSoldTo = authState?.soldTo;
  const reduxSalesOrg = authState?.salesOrg;
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  // Only log detailed debug info when there's an issue
  const shouldDebugLog = !isAuthenticated && (authCode || isProcessing);
  
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

  // Only log Redux state when debugging
  if (shouldDebugLog) {
    console.log('🔍 DEBUG - Redux auth state:', { 
      isAuthenticated, 
      user: !!user, 
      accessToken: !!accessToken, 
      reduxSoldTo, 
      reduxSalesOrg 
    });
  }

  const processAuthCode = async (code, soldToParam, salesOrgParam) => {
    const hasProcessedKey = `processed_${code}`;
    
    // Check if already processed - use both sessionStorage and state
    if (sessionStorage.getItem(hasProcessedKey) || isProcessing) {
      console.log('⚠️ Auth code already processed or currently processing, skipping');
      return;
    }
    
    // Clear any existing processing flags for different codes
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('processed_') && key !== hasProcessedKey) {
        sessionStorage.removeItem(key);
      }
    });
    
    sessionStorage.setItem(hasProcessedKey, Date.now().toString());
    setIsProcessing(true);
    setProcessingMessage('Processing authentication...');
    
    console.log('🚀 Starting auth code processing:', { code, soldToParam, salesOrgParam });

    console.log('🔍 DEBUG - processAuthCode called with:', { 
      code, 
      soldToParam, 
      salesOrgParam, 
      reduxSoldTo, 
      reduxSalesOrg 
    });

    // Get soldTo and salesOrg from URL params or Redux store (for token expiry scenarios)  
    const finalSoldTo = soldToParam || reduxSoldTo || '';
    const finalSalesOrg = salesOrgParam || reduxSalesOrg || '';

    console.log('🔍 DEBUG - Final parameters:', { finalSoldTo, finalSalesOrg });

    // Allow login to proceed even without soldTo/salesOrg for initial login
    console.log('ℹ️ Proceeding with authentication. Parameters:', { finalSoldTo, finalSalesOrg });

    try {
      const { default: request } = await import('../lib/api/request');
      
      // Real authentication only - no mock data
      let response;
      try {
        console.log('🔑 Making authentication API call with:', {
          service: 'loginAuthCode',
          data: code,
          params: { soldto: finalSoldTo, salesorg: finalSalesOrg }
        });
        
        response = await request.post('loginAuthCode', {
          data: code,
          params: { 
            soldto: finalSoldTo, 
            salesorg: finalSalesOrg 
          }
        });
        
        console.log('✅ Authentication API response received:', {
          hasResponse: !!response,
          hasUserProfile: !!response?.userProfile,
          hasTokens: !!response?.tokens,
          hasBearerToken: !!response?.tokens?.bearerToken,
          responseKeys: response ? Object.keys(response) : 'no response'
        });
        
      } catch (authError) {
        console.error('❌ Authentication API failed:', {
          error: authError.message,
          status: authError?.response?.status,
          statusText: authError?.response?.statusText,
          data: authError?.response?.data,
          config: {
            url: authError?.config?.baseURL,
            method: authError?.config?.method,
            headers: authError?.config?.headers
          }
        });
        setProcessingMessage(`Authentication failed: ${authError?.response?.status === 403 ? 'Invalid credentials or missing parameters' : authError.message || 'Unknown error'}`);
        sessionStorage.removeItem(hasProcessedKey);
        setIsProcessing(false);
        return;
      }
      
      console.log('🔍 Validating auth response structure:', {
        hasResponse: !!response,
        hasUserProfile: !!response?.userProfile,
        hasDefaultContext: !!response?.userProfile?.defaultContext?.[0],
        hasTokens: !!response?.tokens,
        hasBearerToken: !!response?.tokens?.bearerToken,
        fullResponseStructure: response ? {
          userProfile: !!response.userProfile,
          tokens: !!response.tokens,
          otherKeys: Object.keys(response).filter(k => k !== 'userProfile' && k !== 'tokens')
        } : 'no response'
      });

      if (response?.userProfile?.defaultContext?.[0] && response?.tokens?.bearerToken) {
        console.log('✅ Auth response validation passed, processing tokens...');
        // Clear the processed flag since auth was successful
        sessionStorage.removeItem(hasProcessedKey);
        
        const bearerToken = response.tokens.bearerToken;
        const userProfile = response.userProfile || {};
        const defaultContext = userProfile.defaultContext?.[0] || {};
        const soldToId = defaultContext?.soldToId;
        
        console.log('🔍 DEBUG - Auth response details:', {
          hasBearerToken: !!bearerToken,
          hasUserProfile: !!userProfile,
          hasDefaultContext: !!defaultContext,
          soldToId: soldToId,
          defaultContextData: defaultContext,
          userProfileKeys: userProfile ? Object.keys(userProfile) : 'no userProfile'
        });
        
        setProcessingMessage('Fetching user context...');
        
        // First store the token so the interceptor can use it
        dispatch(initializeAuth({
          isAuthenticated: false, // Temporary state
          user: null,
          loginResponse: response,
          accessToken: bearerToken,
          contextData: null,
          soldTo: finalSoldTo,
          salesOrg: finalSalesOrg
        }));
        
        let contextResponse = null;
        
        console.log('🔍 DEBUG - About to call mpsaStatus API with soldToId:', soldToId);
        console.log('🔍 DEBUG - Bearer token available:', !!bearerToken);
        
        if (soldToId) {
          try {
            // Call mpsaStatus API with soldToId as path parameter - token will be added automatically by interceptor
            console.log('🚀 Calling mpsaStatus API with path parameter:', soldToId);
            
            contextResponse = await request.get('mpsaStatus', {
              pathParam: soldToId
            });
            console.log('✅ contextResponse received:', contextResponse);
          } catch (contextError) {
            console.error('❌ Context API failed:', {
              error: contextError.message,
              status: contextError?.response?.status,
              statusText: contextError?.response?.statusText,
              finalUrl: `/ccr-dashboard-service/context/${soldToId}`
            });
            // Continue with authentication even if context fails
          }
        } else {
          console.warn('⚠️ No soldToId available, skipping mpsaStatus API call');
        }
        
        // Set HTTP cookies for server-side access (so SSR can detect authentication)
        // Note: Cookies are now secondary to Redux persist storage
        // They're kept for SSR compatibility but auth state primarily relies on Redux persist
        console.log('🍪 Setting authentication cookies for server-side SSR compatibility...');
        
        try {
          // Set access token cookie with longer expiration (7 days to match typical session length)
          // Using session cookie (no max-age) so it clears when browser closes, but Redux persist will maintain the session
          document.cookie = `access_token=${bearerToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
          console.log('✅ Access token cookie set (7 days)');
          
          // Set user context cookie - STORE COMPLETE LOGIN RESPONSE for SSR compatibility
          // This ensures soldToName "ET Test Customer US" is available everywhere
          document.cookie = `user_context=${encodeURIComponent(JSON.stringify(response))}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
          
          console.log('✅ Authentication cookies set successfully (7 days):', {
            accessTokenLength: bearerToken?.length,
            completeLoginResponse: 'Stored complete login response with soldToName',
            soldToName: response?.userProfile?.defaultContext?.[0]?.soldToName
          });
          console.log('ℹ️ Primary auth storage: Redux persist (localStorage) - persists until logout');
          console.log('ℹ️ Secondary auth storage: Cookies (7 days) - for SSR compatibility');
        } catch (cookieError) {
          console.error('❌ Failed to set cookies:', cookieError);
          console.log('ℹ️ Continuing with Redux persist storage only');
        }

        // Final dispatch to Redux store with complete auth data including context
        // Use safe property access to prevent undefined errors
        const safeResponse = response || {};
        
        // Extract only serializable data from contextResponse (avoid AxiosHeaders)
        const serializableContextData = contextResponse ? {
          data: contextResponse.data,
          status: contextResponse.status,
          statusText: contextResponse.statusText
        } : null;
        
        // Ensure soldToId is included in user object for Header component
        const authPayload = {
          isAuthenticated: true,
          user: {
            soldToId: soldToId || null,
            persona: safeResponse.persona || null,
            firstName: safeResponse.firstName || null,
            lastName: safeResponse.lastName || null,
            username: safeResponse.username || safeResponse.userProfile?.username || null
          },
          loginResponse: safeResponse,
          accessToken: bearerToken || null,
          contextData: serializableContextData,
          soldTo: finalSoldTo || soldToId || null,
          salesOrg: finalSalesOrg || null
        };
        
        console.log('🔄 Dispatching auth data to Redux store:', {
          isAuthenticated: authPayload.isAuthenticated,
          hasUser: !!authPayload.user,
          userSoldToId: authPayload.user?.soldToId,
          userName: authPayload.user?.username,
          hasAccessToken: !!authPayload.accessToken,
          accessTokenLength: authPayload.accessToken?.length,
          hasLoginResponse: !!authPayload.loginResponse,
          loginResponseKeys: authPayload.loginResponse ? Object.keys(authPayload.loginResponse).length : 0,
          hasContextData: !!authPayload.contextData
        });
        
        try {
          dispatch(initializeAuth(authPayload));
          console.log('✅ Redux auth state updated successfully - data will persist in localStorage via redux-persist');
        } catch (dispatchError) {
          console.error('❌ Failed to dispatch auth data:', dispatchError);
        }
        
        setProcessingMessage('Authentication successful! Redirecting to dashboard...');
        console.log('🚀 Scheduling redirect to dashboard in 1 second...');
        setTimeout(() => {
          console.log('🔄 Executing redirect to dashboard...');
          router.replace('/dashboard');
        }, 1000);
      } else {
        console.error('❌ Auth response validation failed:', {
          hasResponse: !!response,
          responseStructure: response ? {
            hasUserProfile: !!response.userProfile,
            hasDefaultContext: !!response?.userProfile?.defaultContext?.[0],
            hasTokens: !!response.tokens,
            hasBearerToken: !!response?.tokens?.bearerToken,
            userProfileKeys: response.userProfile ? Object.keys(response.userProfile) : 'no userProfile',
            tokensKeys: response.tokens ? Object.keys(response.tokens) : 'no tokens'
          } : 'no response'
        });
        setProcessingMessage('Authentication failed: Invalid response structure. Please try again.');
        sessionStorage.removeItem(hasProcessedKey);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      setProcessingMessage(`Authentication failed: ${error?.response?.status === 403 ? 'Invalid credentials or missing parameters' : error.message || 'Unknown error'}`);
      sessionStorage.removeItem(hasProcessedKey);
      setIsProcessing(false);
      
      // Add a retry button after 3 seconds for failed authentication
      setTimeout(() => {
        setProcessingMessage('Authentication failed. Click Login to retry.');
      }, 3000);
    }
  };

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
  }, [isRehydrated, isAuthenticated, user, accessToken, authCode, router, authState, dispatch]);

  // Handle auth code processing (separate to prevent double calls)
  useEffect(() => {
    console.log('🔍 DEBUG - Auth processing useEffect triggered:', { 
      authCode: !!authCode, 
      authCodeValue: authCode,
      soldTo, 
      salesOrg,
      isAuthenticated,
      isRehydrated,
      isProcessing,
      windowDefined: typeof window !== 'undefined'
    });

    // Try processing with more lenient conditions for debugging
    // Allow processing if we have auth code but aren't properly authenticated (could be invalid/incomplete auth state)
    const hasValidAuth = isAuthenticated && user?.soldToId && accessToken && typeof accessToken === 'string' && accessToken.length > 10;
    const shouldProcess = authCode && !hasValidAuth && typeof window !== 'undefined' && !isProcessing;
    
    if (authCode) {
      console.log('🔍 Auth processing check:', {
        shouldProcess,
        isRehydrated,
        hasValidAuth,
        conditions: {
          hasAuthCode: !!authCode,
          isAuthenticated,
          hasUser: !!user,
          userSoldToId: user?.soldToId,
          hasAccessToken: !!accessToken,
          accessTokenType: typeof accessToken,
          accessTokenLength: typeof accessToken === 'string' ? accessToken.length : 0,
          hasWindow: typeof window !== 'undefined',
          notProcessing: !isProcessing
        }
      });
    }
    
    if (shouldProcess && (isRehydrated || !_persist)) { // Allow processing if no persist or rehydrated
      const hasProcessedKey = `processed_${authCode}`;
      
      console.log('🔍 Checking processed key:', hasProcessedKey, 'exists:', !!sessionStorage.getItem(hasProcessedKey));
      
      if (sessionStorage.getItem(hasProcessedKey)) {
        console.log('⚠️ Auth code already processed, skipping');
        // Check if processing failed - if so, allow retry
        const processedTime = sessionStorage.getItem(hasProcessedKey);
        const timeDiff = Date.now() - parseInt(processedTime);
        if (timeDiff > 30000) { // 30 seconds timeout
          console.log('🔄 Processing timeout detected, clearing processed flag for retry');
          sessionStorage.removeItem(hasProcessedKey);
        }
        return;
      }
      
      console.log('✅ All conditions met - starting auth code processing');
      processAuthCode(authCode, soldTo, salesOrg);
      return;
    } else {
      console.log('⏸️ Auth processing conditions not met:', {
        hasAuthCode: !!authCode,
        notAuthenticated: !isAuthenticated,
        isRehydrated: isRehydrated,
        hasWindow: typeof window !== 'undefined',
        notProcessing: !isProcessing,
        allConditions: !!(authCode && !isAuthenticated && isRehydrated && typeof window !== 'undefined' && !isProcessing)
      });
    }
  }, [authCode, soldTo, salesOrg, isRehydrated, isProcessing]); // Added isProcessing to dependencies

  // Fetch UI properties when authenticated (once per session)
  useEffect(() => {
    if (isAuthenticated && !uiProperties) {
      console.log('🎨 Fetching UI properties for authenticated user...');
      dispatch(setProperties({ theme: 'light', navigation: 'standard' }));
    }
  }, [isAuthenticated, dispatch]); // Simplified dependencies to prevent excessive calls



  // Get soldTo/salesOrg for login URL (from Redux store if not in URL - token expiry scenario)
  const effectiveSoldTo = soldTo || reduxSoldTo || '';
  const effectiveSalesOrg = salesOrg || reduxSalesOrg || '';
  
  // Build auth URL with soldTo/salesOrg params if available
  const buildAuthURL = () => {
    if (!effectiveSoldTo || !effectiveSalesOrg) {
      return AUTH_URL; // Basic auth URL if no params available
    }
    const url = new URL(AUTH_URL);
    url.searchParams.set('soldto', effectiveSoldTo);
    url.searchParams.set('salesorg', effectiveSalesOrg);
    return url.toString();
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