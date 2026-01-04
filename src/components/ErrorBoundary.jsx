// src/components/ErrorBoundary.jsx
"use client";

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('🛡️ ErrorBoundary caught an error:', error);
    console.error('🔍 Error details:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          border: '1px solid #ff6b6b', 
          borderRadius: '8px',
          backgroundColor: '#ffe0e0'
        }}>
          <h2 style={{ color: '#ae0a46', margin: '0 0 10px 0' }}>
            ⚠️ Something went wrong
          </h2>
          <p style={{ color: '#666', margin: '0 0 10px 0' }}>
            An error occurred while rendering this component. Please refresh the page or try again.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', color: '#1976d2' }}>
                🔍 Error Details (Development Only)
              </summary>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                marginTop: '8px'
              }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }

    // Render children normally when there's no error
    return this.props.children;
  }
}

export default ErrorBoundary;