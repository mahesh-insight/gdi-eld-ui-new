"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { initializeAuth } from '../store/authSlice';
// AuthHandler no longer needed - processing auth directly here

export default function HomePageClient({ AUTH_URL, CLIENT_ID, authCode, soldTo, salesOrg }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const authState = useSelector(state => state.auth);
  const { isAuthenticated, user, accessToken } = authState;
  const reduxSoldTo = authState?.soldTo;
  const reduxSalesOrg = authState?.salesOrg;
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const processAuthCode = async (code, soldToParam, salesOrgParam) => {
    const hasProcessedKey = `processed_${code}`;
    sessionStorage.setItem(hasProcessedKey, 'true');
    setIsProcessing(true);
    setProcessingMessage('Processing authentication...');

    // Get soldTo and salesOrg from URL params or Redux store (for token expiry scenarios)  
    const finalSoldTo = soldToParam || reduxSoldTo || '';
    const finalSalesOrg = salesOrgParam || reduxSalesOrg || '';

    // Validate required parameters
    if (!finalSoldTo || !finalSalesOrg) {
      setProcessingMessage(`Missing required parameters: ${!finalSoldTo ? 'soldTo' : ''} ${!finalSalesOrg ? 'salesOrg' : ''}`.trim());
      // Keep the processed flag to prevent infinite retries
      // User needs to refresh with proper URL params
      setIsProcessing(false);
      return;
    }

    try {
      const { default: request } = await import('../lib/api/request');
      
      const response = await request.post('loginAuthCode', {
        data: code,
        params: { 
          soldto: finalSoldTo, 
          salesorg: finalSalesOrg 
        }
      });
      
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

  useEffect(() => {
    if (isAuthenticated && user && accessToken) {
      router.replace('/dashboard');
      return;
    }

    if (authCode && !isAuthenticated && typeof window !== 'undefined') {
      const hasProcessedKey = `processed_${authCode}`;
      
      if (sessionStorage.getItem(hasProcessedKey)) {
        return;
      }
      
      processAuthCode(authCode, soldTo, salesOrg);
      return;
    }
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
          Note: Login requires soldTo and salesOrg parameters
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