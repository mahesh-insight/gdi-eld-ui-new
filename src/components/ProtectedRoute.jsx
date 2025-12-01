"use client";

import { useAuth } from '../hooks/useAuth';

/**
 * Protected route wrapper component
 * Automatically redirects to login if user is not authenticated or token is expired
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, redirectToLogin } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2em'
      }}>
        Checking authentication...
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    redirectToLogin();
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2em'
      }}>
        Redirecting to login...
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}