"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { initializeAuth } from '../store/authSlice';
// AuthHandler no longer needed - processing auth directly here

export default function HomePageClient({ AUTH_URL, CLIENT_ID, authCode, soldTo, salesOrg }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user, accessToken } = useSelector(state => state.auth);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const processAuthCode = async (code, soldTo, salesOrg) => {
    const hasProcessedKey = `processed_${code}`;
    sessionStorage.setItem(hasProcessedKey, 'true');
    setIsProcessing(true);
    setProcessingMessage('Processing authentication...');

    try {
      console.log('🚀 Calling loginAuthCode API directly');
      console.log('📤 API request payload:', { code, soldTo, salesOrg });
      
      // Import the request utility
      const { default: request } = await import('../lib/api/request');
      
      const response = await request.post('loginAuthCode', {
        data: code,
        params: { 
          soldto: soldTo, 
          salesorg: salesOrg 
        }
      });
      
      console.log('✅ loginAuthCode response:', response);
      
      if (response?.userProfile?.defaultContext?.[0] && response?.tokens?.bearerToken) {
        // Clear the processed flag since auth was successful
        sessionStorage.removeItem(hasProcessedKey);
        
        const bearerToken = response.tokens.bearerToken;
        const userProfile = response.userProfile;
        const defaultContext = userProfile.defaultContext?.[0];
        const soldToId = defaultContext?.soldToId;
        
        // Dispatch to Redux store
        dispatch(initializeAuth({
          isAuthenticated: true,
          user: {
            soldToId: soldToId,
            persona: response.persona,
            firstName: response.firstName
          },
          loginResponse: response,
          accessToken: bearerToken
        }));
        
        setProcessingMessage('Authentication successful! Redirecting to dashboard...');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
      } else {
        console.error('❌ Auth failed - Invalid response from loginAuthCode:', response);
        setProcessingMessage('Authentication failed. Please try again.');
        sessionStorage.removeItem(hasProcessedKey);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ Auth processing error:', error);
      setProcessingMessage('Authentication failed. Please try again.');
      sessionStorage.removeItem(hasProcessedKey);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated && user && accessToken) {
      console.log('✅ Already authenticated, redirecting to dashboard from homepage');
      router.replace('/dashboard');
      return;
    }

    // If we have an auth code but user is not authenticated, process it directly here
    if (authCode && !isAuthenticated && typeof window !== 'undefined') {
      const hasProcessedKey = `processed_${authCode}`;
      
      // Check if we've already processed this auth code
      if (sessionStorage.getItem(hasProcessedKey)) {
        console.log('⚠️ Auth code already processed, avoiding duplicate processing');
        return;
      }
      
      console.log('📝 Auth code present, processing authentication on homepage');
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
      <a 
        href={AUTH_URL}
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