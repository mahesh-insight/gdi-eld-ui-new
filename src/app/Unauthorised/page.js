"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'Unknown';
  const message = searchParams.get('message') || '';

  const handleTryAgain = () => {
    window.location.href = '/';
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      gap: '20px',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ color: '#d32f2f' }}>Access Denied</h1>
      <p>You are not authorized to access this application.</p>
      <p><strong>Reason:</strong> {reason}</p>
      {message && <p><strong>Details:</strong> {decodeURIComponent(message)}</p>}
      <p>Please contact your administrator for access.</p>
      <button 
        onClick={handleTryAgain}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Try Again
      </button>
    </div>
  );
}

export default function Unauthorised() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}