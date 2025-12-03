// src/app/azure-invoice/loading.jsx
export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #0070f3',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '30px'
      }}></div>
      
      <h1 style={{ 
        margin: '0 0 15px 0', 
        color: '#333',
        fontSize: '24px',
        fontWeight: '600'
      }}>
        Loading Azure Invoice
      </h1>
      
      <p style={{ 
        margin: '0', 
        color: '#666', 
        textAlign: 'center',
        fontSize: '16px',
        lineHeight: '1.5'
      }}>
        Fetching your latest invoice data and analytics...
      </p>
      
      <div style={{
        marginTop: '30px',
        padding: '15px 25px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        ⚡ Optimized with server-side caching
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}