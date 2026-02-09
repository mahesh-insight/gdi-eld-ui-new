// src/components/NetworkErrorBoundary.jsx
"use client";

import { Component } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setLastError, setRedirectReason } from '@/store/navigationContextSlice';

// Error Boundary Class Component
class NetworkErrorBoundaryClass extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 NetworkErrorBoundary caught error:', error, errorInfo);
    
    // Check if it's a network error
    const isNetworkError = 
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.name === 'NetworkError';

    // Check if it's an auth error
    const isAuthError = 
      error.message?.includes('401') ||
      error.message?.includes('403') ||
      error.message?.includes('Unauthorized') ||
      error.message?.includes('Authentication');

    if (isNetworkError || isAuthError) {
      // Store error context and redirect to login
      const { dispatch, router } = this.props;
      
      dispatch(setLastError({
        message: isNetworkError 
          ? 'Network connection lost. Please check your VPN connection and try again.'
          : 'Authentication failed. Please login again.',
        timestamp: new Date().toISOString(),
        originalError: error.message,
      }));
      
      dispatch(setRedirectReason(isNetworkError ? 'network_error' : 'auth_failed'));
      
      // Redirect to login
      setTimeout(() => {
        router.push('/?error=connection');
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render a fallback UI here if needed
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>Redirecting to login...</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper to inject router and dispatch
export default function NetworkErrorBoundary({ children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  
  return (
    <NetworkErrorBoundaryClass router={router} dispatch={dispatch}>
      {children}
    </NetworkErrorBoundaryClass>
  );
}
