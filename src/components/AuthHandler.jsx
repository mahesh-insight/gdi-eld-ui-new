"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';

export default function AuthHandler({ authCode, soldTo, salesOrg }) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { isAuthenticated, user, accessToken } = useSelector(state => state.auth);

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated && user && accessToken) {
      console.log('✅ User already authenticated, redirecting to dashboard');
      router.replace('/dashboard');
      return;
    }

    const processAuth = async () => {
      try {
        console.log("Processing auth code:", { authCode, soldTo, salesOrg });
        
        // Store soldTo and salesOrg in localStorage like existing code
        if (soldTo) localStorage.setItem('soldto', soldTo);
        if (salesOrg) localStorage.setItem('salesorg', salesOrg);
        
        // Call the auth callback endpoint
        const response = await fetch(`/auth/callback?code=${authCode}&soldto=${soldTo || ''}&salesorg=${salesOrg || ''}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log("=== FRONTEND AUTH SUCCESS ===");
          console.log("Backend response:", result);
          
          if (result.isUsingMockData) {
            console.warn("⚠️ Using mock data - configure real API endpoint");
          }
          
          // Clear auth URL flag
          localStorage.removeItem("authenticationURL");
          
          // Give browser a moment to set cookies before navigating
          setTimeout(() => {
            // Check for initial redirect path (like existing code)
            const initialRedirectPath = localStorage.getItem('initial_url');
            
            // Navigate based on flags and initial path (similar to existing logic)
            if (initialRedirectPath && !initialRedirectPath.includes('Unauthorised')) {
              console.log("Redirecting to initial path:", initialRedirectPath);
              router.push(initialRedirectPath);
            } else {
              // Default to dashboard (can be configurable based on flags)
              console.log("Redirecting to dashboard");
              router.push('/dashboard');
            }
          }, 100); // Small delay to ensure cookies are set
          
        } else {
          // Handle auth failure
          console.error("Authentication failed:", response.status);
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.message || 'Authentication failed');
          
          // Redirect to unauthorized page
          router.push('/Unauthorised?reason=Failed');
        }
      } catch (error) {
        console.error("Auth processing error:", error);
        setError(error.message);
        router.push('/Unauthorised?reason=Failed');
      } finally {
        setIsProcessing(false);
      }
    };

    if (authCode) {
      processAuth();
    }
  }, [authCode, soldTo, salesOrg, router]);

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ color: 'red', fontSize: '1.2em' }}>
          Authentication Error: {error}
        </div>
        <div>Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      fontSize: '1.2em'
    }}>
      {isProcessing ? 'Processing authentication...' : 'Redirecting...'}
    </div>
  );
}