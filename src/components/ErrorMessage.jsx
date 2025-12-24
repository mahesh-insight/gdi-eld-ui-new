// Simple error message component for dashboard widgets
export default function ErrorMessage({ errorMessage, message }) {
  const displayMessage = errorMessage || message;
  
  if (!displayMessage) return null;
  
  return (
    <div className="error-message" style={{ 
      padding: '20px', 
      textAlign: 'center', 
      color: '#d32f2f', 
      backgroundColor: '#ffebee',
      borderRadius: '4px',
      border: '1px solid #ffcdd2'
    }}>
      {displayMessage}
    </div>
  );
}