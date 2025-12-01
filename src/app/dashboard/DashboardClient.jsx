"use client";

import { useAuth } from '../../hooks/useAuth';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function DashboardClient() {
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  if (!isAuthenticated) {
    return null; // ProtectedRoute will handle the redirect
  }

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
          <h1 className="text-3xl font-bold underline">Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {user && (
              <span style={{ fontSize: '14px', color: '#666' }}>
                Welcome, {user.firstName || 'User'} ({user.persona || 'N/A'})
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

        <div>
          <p>This is the protected dashboard page.</p>
          <p>You are successfully authenticated!</p>
          
          {user && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '5px' 
            }}>
              <h3>User Information:</h3>
              <ul>
                <li><strong>Name:</strong> {user.firstName || 'N/A'}</li>
                <li><strong>Persona:</strong> {user.persona || 'N/A'}</li>
                <li><strong>Sold To ID:</strong> {user.soldToId || 'N/A'}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}