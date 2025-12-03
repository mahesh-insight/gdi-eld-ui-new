"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { initializeAuth } from '../store/authSlice';
import { 
  fetchUiProperties, 
  selectUiProperties, 
  selectUiCacheValid 
} from '../lib/store/slices/uiSlice';

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
  const { isAuthenticated, user, accessToken } = authState;
  const uiProperties = useSelector(selectUiProperties);
  const uiCacheValid = useSelector(selectUiCacheValid);

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
      
      // Development mode: simulate successful authentication
      let response;
      if (process.env.NODE_ENV === 'development' && code.startsWith('test-')) {
        console.log('🔧 DEV MODE: Simulating successful authentication');
        response = {
          userProfile: {
            defaultContext: [{
              soldToId: 'Insight|SAP|0011082409|2400'
            }]
          },
          tokens: {
            bearerToken: 'dev-bearer-token-12345'
          },
          persona: 'Customer',
          firstName: 'Test User'
        };
      } else {
        response = await request.post('loginAuthCode', {
          data: code,
          params: { 
            soldto: finalSoldTo, 
            salesorg: finalSalesOrg 
          }
        });
      }
      
      if (response?.userProfile?.defaultContext?.[0] && response?.tokens?.bearerToken) {
        // Clear the processed flag since auth was successful
        sessionStorage.removeItem(hasProcessedKey);
        
        const bearerToken = response.tokens.bearerToken;
        const userProfile = response.userProfile;
        const defaultContext = userProfile.defaultContext?.[0];
        const soldToId = defaultContext?.soldToId;
        
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
        dispatch(initializeAuth({
          isAuthenticated: true,
          user: {
            soldToId: soldToId,
            persona: response.persona,
            firstName: response.firstName
          },
          loginResponse: response,
          accessToken: bearerToken,
          contextData: contextResponse,
          soldTo: finalSoldTo,
          salesOrg: finalSalesOrg
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

  // Handle redirect when already authenticated
  useEffect(() => {
    if (isAuthenticated && user && accessToken) {
      console.log('✅ Already authenticated, redirecting to dashboard');
      console.log('🔍 DEBUG - Auth state:', { isAuthenticated, user: !!user, accessToken: !!accessToken });
      console.log('🔍 DEBUG - localStorage auth data:', localStorage.getItem('persist:ccr-auth'));
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, accessToken, router]);

  // Handle auth code processing (separate to prevent double calls)
  useEffect(() => {
    console.log('🔍 DEBUG - Auth processing useEffect triggered:', { 
      authCode: !!authCode, 
      authCodeValue: authCode,
      soldTo, 
      salesOrg,
      isAuthenticated,
      windowDefined: typeof window !== 'undefined'
    });

    if (authCode && !isAuthenticated && typeof window !== 'undefined') {
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
        noWindow: typeof window === 'undefined'
      });
    }
  }, [authCode, soldTo, salesOrg, router]); // Removed auth state to prevent double calls when Redux updates

  // Fetch UI properties when authenticated (once per session)
  useEffect(() => {
    if (isAuthenticated && !uiProperties) {
      console.log('🎨 Fetching UI properties for authenticated user...');
      dispatch(fetchUiProperties());
    }
  }, [isAuthenticated, dispatch]); // Simplified dependencies to prevent excessive calls

  // Show processing state if we're handling auth
  if (isProcessing) {
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
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Processing Authentication</h2>
        <p style={{ color: '#666', textAlign: 'center' }}>{processingMessage}</p>
      </div>
    );
  }

  // If we have an auth code but no processing yet, this will be handled by useEffect
  if (authCode && !isAuthenticated) {
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
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Initializing Authentication</h2>
        <p style={{ color: '#666' }}>Please wait...</p>
      </div>
    );
  }

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

  // Otherwise show the login screen
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
      <a 
        href={buildAuthURL()}
        style={{
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          marginRight: '10px'
        }}
      >
        Login
      </a>
      
    </div>
  );
}