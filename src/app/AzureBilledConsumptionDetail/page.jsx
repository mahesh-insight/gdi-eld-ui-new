"use client";
import React from 'react';

export default function AzureBilledConsumptionDetail() {
  // Read navigation context from sessionStorage
  const [context, setContext] = React.useState(null);

  React.useEffect(() => {
    // Read from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const storedContext = sessionStorage.getItem('navigationContext');
      if (storedContext) {
        try {
          const parsedContext = JSON.parse(storedContext);
          console.log('📥 Navigation context retrieved:', parsedContext);
          setContext(parsedContext);
          // Clear from sessionStorage after reading
          sessionStorage.removeItem('navigationContext');
        } catch (error) {
          console.error('Failed to parse navigation context:', error);
        }
      } else {
        console.log('❌ No navigation context found in sessionStorage');
      }
    }
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1>Azure Billed Consumption Detail</h1>
      {context ? (
        <div style={{ marginTop: 24 }}>
          <h3>Context passed from previous page:</h3>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>{JSON.stringify(context, null, 2)}</pre>
        </div>
      ) : (
        <div style={{ marginTop: 24, color: '#888' }}>
          <em>No context was passed from the previous page.</em>
        </div>
      )}
    </div>
  );
}
