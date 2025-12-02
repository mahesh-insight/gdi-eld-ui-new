"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { initializeAuth } from '../store/authSlice';

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
    sessionStorage.setItem(hasProcessedKey, 'true');
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

    // For initial login without params, allow login to proceed
    // Parameters will be handled by backend or can be set later
    console.log('ℹ️ Proceeding with authentication (params will be handled by backend)');

    try {
      const { default: request } = await import('../lib/api/request');
      
      const response = await request.post('loginAuthCode', {
        data: code,
        params: { 
          soldto: finalSoldTo, 
          salesorg: finalSalesOrg 
        }
      });
      
      console.log('✅ loginAuthCode response received:', !!response);
      
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
        try {
          // Call mpsaStatus API - token will be added automatically by interceptor
          contextResponse = await request.get(`mpsaStatus/${soldToId}`);
          console.log('✅ contextResponse:', contextResponse);
        } catch (contextError) {
          console.warn('⚠️ Context API failed, continuing without context data:', contextError);
          // Continue with authentication even if context fails
        }
        
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
        console.error('❌ Invalid response structure:', response);
        setProcessingMessage('Authentication failed. Invalid response from server.');
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

  useEffect(() => {
    console.log('🔍 DEBUG - useEffect triggered:', { 
      isAuthenticated, 
      user: !!user, 
      accessToken: !!accessToken, 
      authCode, 
      soldTo, 
      salesOrg 
    });

    if (isAuthenticated && user && accessToken) {
      console.log('✅ Already authenticated, redirecting to dashboard');
      router.replace('/dashboard');
      return;
    }

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
    }

    console.log('⏸️ No conditions met for processing');
  }, [isAuthenticated, user, accessToken, authCode, soldTo, salesOrg, router, dispatch]);

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
      <p style={{ marginBottom: '30px', textAlign: 'center', color: '#666' }}>
        Please login to access your dashboard
      </p>
      {(!effectiveSoldTo || !effectiveSalesOrg) && (
        <p style={{ marginBottom: '20px', color: '#ff6600', textAlign: 'center' }}>
          Note: Login will proceed without soldTo/salesOrg (can be set later)
        </p>
      )}
      <a 
        href={buildAuthURL()}
        style={{
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '16px'
        }}
      >
        Login with Ping Identity
      </a>
    </div>
  );
}