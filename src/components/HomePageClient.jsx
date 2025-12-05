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

  // Debug localStorage on every render
  console.log('🔍 DEBUG - Current Redux state:', { isAuthenticated, user: !!user, accessToken: !!accessToken });
  if (typeof window !== 'undefined') {
    console.log('🔍 DEBUG - localStorage persist data:', localStorage.getItem('persist:ccr-auth'));
  }
  const reduxSoldTo = authState?.soldTo;
  const reduxSalesOrg = authState?.salesOrg;
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  console.log('🔍 DEBUG - Redux auth state:', { 
    isAuthenticated, 
    user: !!user, 
    accessToken: !!accessToken, 
    reduxSoldTo, 
    reduxSalesOrg 
  });

  const processAuthCode = async (code, soldToParam, salesOrgParam) => {
    const hasProcessedKey = `processed_${code}`;
    
    // Check if already processed - use both sessionStorage and state
    if (sessionStorage.getItem(hasProcessedKey) || isProcessing) {
      console.log('⚠️ Auth code already processed or currently processing, skipping');
      return;
    }
    
    sessionStorage.setItem(hasProcessedKey, Date.now().toString());
    setIsProcessing(true);
    setProcessingMessage('Processing authentication...');

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
        response = await request.post('loginAuthCode', {
          data: code,
          params: { 
            soldto: finalSoldTo, 
            salesorg: finalSalesOrg 
          }
        });
      } catch (authError) {
        console.error('❌ Authentication API failed:', authError);
        setProcessingMessage(`Authentication failed: ${authError?.response?.status === 403 ? 'Invalid credentials or missing parameters' : authError.message || 'Unknown error'}`);
        sessionStorage.removeItem(hasProcessedKey);
        setIsProcessing(false);
        return;
      }
      
      if (response?.userProfile?.defaultContext?.[0] && response?.tokens?.bearerToken) {
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
        console.log('🍪 Setting authentication cookies for server-side access...');
        
        // Set access token cookie
        document.cookie = `access_token=${bearerToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Strict`;
        
        // Set user context cookie for server-side soldToId extraction
        const userContextData = {
          soldToId: soldToId,
          persona: response.persona,
          firstName: response.firstName,
          isAuthenticated: true
        };
        document.cookie = `user_context=${encodeURIComponent(JSON.stringify(userContextData))}; path=/; max-age=${24 * 60 * 60}; SameSite=Strict`;
        
        console.log('✅ Authentication cookies set for server-side access');

        // Final dispatch to Redux store with complete auth data including context
        // Use safe property access to prevent undefined errors
        const safeResponse = response || {};
        dispatch(initializeAuth({
          isAuthenticated: true,
          user: {
            soldToId: soldToId || null,
            persona: safeResponse.persona || null,
            firstName: safeResponse.firstName || null
          },
          loginResponse: safeResponse,
          accessToken: bearerToken || null,
          contextData: contextResponse || null,
          soldTo: finalSoldTo || null,
          salesOrg: finalSalesOrg || null
        }));
        
        setProcessingMessage('Authentication successful! Redirecting to dashboard...');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
      } else {
        setProcessingMessage('Authentication failed. Please try again.');
        sessionStorage.removeItem(hasProcessedKey);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      setProcessingMessage(`Authentication failed: ${error?.response?.status === 403 ? 'Invalid credentials or missing parameters' : error.message || 'Unknown error'}`);
      sessionStorage.removeItem(hasProcessedKey);
      setIsProcessing(false);
    }
  };

  // Handle redirect when already authenticated (STRICT validation)
  useEffect(() => {
    // Only redirect if we have complete, valid authentication AND an auth code is not being processed
    if (isRehydrated && !authCode) {
      // Strict validation: ALL criteria must be met for valid authentication
      const hasSoldToId = user?.soldToId || authState?.loginResponse?.userProfile?.defaultContext?.[0]?.soldToId;
      const hasValidToken = accessToken && 
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
        userSoldToId: user?.soldToId,
        accessTokenLength: accessToken?.length
      });
      
      if (hasRealAuth) {
        console.log('✅ Valid authentication confirmed, redirecting to dashboard');
        router.replace('/dashboard');
      } else if (isAuthenticated || user || accessToken) {
        // We have some auth data but it's incomplete/invalid - clear it
        console.log('⚠️ Incomplete/invalid authentication state detected - clearing all auth data');
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
      windowDefined: typeof window !== 'undefined'
    });

    if (authCode && !isAuthenticated && isRehydrated && typeof window !== 'undefined') {
      const hasProcessedKey = `processed_${authCode}`;
      
      console.log('🔍 Checking processed key:', hasProcessedKey, 'exists:', !!sessionStorage.getItem(hasProcessedKey));
      
      if (sessionStorage.getItem(hasProcessedKey)) {
        console.log('⚠️ Auth code already processed, skipping');
        return;
      }
      
      console.log('🚀 Starting auth code processing');
      processAuthCode(authCode, soldTo, salesOrg);
      return;
    } else {
      console.log('⏸️ No conditions met for processing. Reasons:', {
        noAuthCode: !authCode,
        alreadyAuthenticated: isAuthenticated,
        notRehydrated: !isRehydrated,
        noWindow: typeof window === 'undefined'
      });
    }
  }, [authCode, soldTo, salesOrg, isRehydrated, router]); // Added isRehydrated dependency

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
        <a 
          href={buildAuthURL()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            marginRight: '10px',
            opacity: showLoader ? 0.5 : 1
          }}
        >
          Login
        </a>
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
            
            <h3 style={{ 
              marginBottom: '15px', 
              color: '#333',
              fontSize: '18px',
              fontWeight: 'bold'
            }}>
              {isProcessing ? 'Processing Authentication' : 'Initializing Authentication'}
            </h3>
            
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