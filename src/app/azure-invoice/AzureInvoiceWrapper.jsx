"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy wrapper - no longer needed with server-side rendering
 * This component exists for backward compatibility and redirects
 */
export default function AzureInvoiceWrapper() {
  const router = useRouter();
  
  useEffect(() => {
    console.log('🔄 Legacy wrapper - server-side rendering is now handling everything');
  }, []);
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Loading Azure Invoice...</h2>
      <p>Using server-side rendering for optimal performance...</p>
    </div>
  );
}