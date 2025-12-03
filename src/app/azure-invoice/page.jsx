// src/app/azure-invoice/page.jsx
import { fetchAzureInvoiceDataServer, fetchUiPropertiesServer } from './actions';
import AzureInvoiceServerComponent from "./AzureInvoiceServerComponent";

// SEO metadata
export const metadata = {
  title: "Azure Invoice - CCR Dashboard",
  description: "Azure invoice management and analytics dashboard",
};

/**
 * Server component that fetches all data server-side
 * 
 * TRUE SSR ARCHITECTURE:
 * 1. Server-side: All API data fetched during server rendering
 * 2. Client-side: Components receive pre-loaded data, NO API calls
 * 3. Navigation: Instant rendering from server-fetched data
 * 4. Performance: Zero client-side API delays, true SSR
 */
export default async function AzureInvoicePage() {
  console.log('🏗️ Server Page: Starting Azure Invoice SSR');
  
  // Fetch data on the server with optimization and caching
  const startTime = Date.now();
  
  const [azureInvoiceResult, uiPropertiesResult] = await Promise.all([
    fetchAzureInvoiceDataServer(),
    fetchUiPropertiesServer()
  ]);
  
  const fetchTime = Date.now() - startTime;
  console.log(`⚡ Server Page: Total fetch time: ${fetchTime}ms`);
  
  // If fetch took too long, we could implement progressive enhancement here
  if (fetchTime > 3000) {
    console.log(`⚠️ Server Page: Slow fetch detected (${fetchTime}ms) - consider caching optimization`);
  }
  
  console.log('📊 Server Page: Azure Invoice Result:', {
    hasError: !!azureInvoiceResult.error,
    hasData: !!azureInvoiceResult.data,
    debugInfo: azureInvoiceResult.debug
  });
  
  console.log('🎨 Server Page: UI Properties Result:', {
    hasError: !!uiPropertiesResult.error,
    hasData: !!uiPropertiesResult.data,
    debugInfo: uiPropertiesResult.debug
  });
  
  // If authentication is required, show a helpful message
  if (azureInvoiceResult.error && azureInvoiceResult.error.includes('Authentication required')) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h1>🔐 Authentication Required</h1>
        <p>You need to be logged in to view Azure Invoice data.</p>
        <div style={{ margin: '20px 0' }}>
          <a href="/" style={{ 
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}>
            Go to Login Page
          </a>
        </div>
        <details style={{ marginTop: '30px', textAlign: 'left', maxWidth: '600px', margin: '30px auto' }}>
          <summary>Debug Information</summary>
          <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
            {JSON.stringify(azureInvoiceResult.debug, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <AzureInvoiceServerComponent 
      azureInvoiceData={azureInvoiceResult.data}
      azureInvoiceError={azureInvoiceResult.error}
      azureInvoiceDebug={azureInvoiceResult.debug}
      uiProperties={uiPropertiesResult.data}
      uiPropertiesError={uiPropertiesResult.error}
      uiPropertiesDebug={uiPropertiesResult.debug}
    />
  );
}
