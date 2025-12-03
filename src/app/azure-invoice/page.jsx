// src/app/azure-invoice/page.jsx
"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import AzureInvoiceContent from "./AzureInvoiceContent";

/**
 * STREAMING SSR ARCHITECTURE:
 * 1. Page shell loads immediately (no navigation delay)
 * 2. Data fetching happens in Suspense boundary
 * 3. Users see loading state while data streams in
 * 4. Maintains SSR benefits with better UX
 */
export default function AzureInvoicePage() {
  console.log('🏗️ Client Page: Protected Azure Invoice page load (Authentication Required)');
  
  return (
    <ProtectedRoute>
      <div>
      {/* Page Header - loads immediately */}
      <div style={{
        padding: '20px 40px',
        borderBottom: '1px solid #e1e5e9',
        backgroundColor: '#f8f9fa'
      }}>
        <h1 style={{ 
          margin: '0', 
          color: '#2c3e50',
          fontSize: '28px',
          fontWeight: '600'
        }}>
          Azure Invoice Dashboard
        </h1>
        <p style={{ 
          margin: '8px 0 0 0', 
          color: '#6c757d',
          fontSize: '16px'
        }}>
          Manage and analyze your Azure billing information
        </p>
      </div>
      
      {/* Content with Suspense - data streams in */}
      <AzureInvoiceContent />
      </div>
    </ProtectedRoute>
  );
}
