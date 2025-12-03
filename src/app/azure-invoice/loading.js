// src/app/azure-invoice/loading.js
export default function AzureInvoiceLoading() {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes azureInvoiceSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .azure-invoice-spinner {
            animation: azureInvoiceSpin 1s linear infinite;
          }
        `
      }} />
      
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'system-ui',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          {/* Loading Spinner */}
          <div 
            className="azure-invoice-spinner"
            style={{
              width: '50px',
              height: '50px',
              border: '4px solid #e3e3e3',
              borderTop: '4px solid #0070f3',
              borderRadius: '50%',
              marginBottom: '20px'
            }}
          />
          
          <h2 style={{
            color: '#0070f3',
            marginBottom: '10px',
            fontSize: '24px'
          }}>
            🔄 Loading Azure Invoice Data
          </h2>
          
          <p style={{
            color: '#666',
            fontSize: '16px',
            lineHeight: '1.5',
            marginBottom: '15px'
          }}>
            Fetching your Azure invoice information and analytics...
          </p>
          
          <div style={{ color: '#888', fontSize: '14px' }}>
            <div style={{ marginBottom: '5px' }}>• Retrieving invoice months</div>
            <div style={{ marginBottom: '5px' }}>• Loading summary data</div>
            <div style={{ marginBottom: '5px' }}>• Processing trends</div>
            <div style={{ marginBottom: '5px' }}>• Calculating credits</div>
          </div>
          
          <div style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeeba',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#856404'
          }}>
            <strong>Note:</strong> Data loading may take 5-10 seconds due to backend processing
          </div>
        </div>
      </div>
    </>
  );
}