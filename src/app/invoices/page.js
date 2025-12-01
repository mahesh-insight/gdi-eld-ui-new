"use client";

import { useAuth } from '../../hooks/useAuth';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function InvoicesPage() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <ProtectedRoute>
      <div style={{ padding: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #eee',
          paddingBottom: '10px'
        }}>
          <h1>Invoices Page</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {user && (
              <span style={{ fontSize: '14px', color: '#666' }}>
                {user.firstName || 'User'}
              </span>
            )}
            <button 
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
        
        <p>Successfully authenticated and viewing invoices.</p>
        <p>This page is protected and requires a valid access token.</p>
      </div>
    </ProtectedRoute>
  );
}