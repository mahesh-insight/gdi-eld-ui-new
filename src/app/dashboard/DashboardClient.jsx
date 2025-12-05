"use client";

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function DashboardClient() {
  const { user, logout, isAuthenticated, loginResponse, contextData, soldTo, salesOrg } = useAuth();
  const {username, firstName, persona} = loginResponse || {};

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  // Remove redundant auth check - ProtectedRoute handles this

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
            {username && (
              <span style={{ fontSize: '14px', color: '#666' }}>
                Welcome, {firstName || 'User'} ({persona || 'N/A'})
              </span>
            )}
          </div>
        </div>

        <div>
          <p>This is the protected dashboard page.</p>
          <p>You are successfully authenticated!</p>
          
          {username && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '5px' 
            }}>
              <h3>User Information:</h3>
              <ul>
                <li><strong>Name:</strong> {firstName || 'N/A'}</li>
                <li><strong>Persona:</strong> {persona || 'N/A'}</li>
              </ul>
            </div>
          )}

          {loginResponse && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '5px' 
            }}>
              <h3>Full Login Response Data (Redux Store):</h3>
              <div style={{ 
                maxHeight: '400px', 
                overflow: 'auto',
                fontSize: '12px',
                backgroundColor: '#fff',
                padding: '10px',
                borderRadius: '3px',
                border: '1px solid #ddd'
              }}>
                <pre>{JSON.stringify(loginResponse, null, 2)}</pre>
              </div>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <p><strong>Available data:</strong> tokens, userProfile, permissions, webSites, etc.</p>
                <p><strong>Storage:</strong> Redux store only (no localStorage/cookies for display)</p>
              </div>
            </div>
          )}

          {contextData && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '5px' 
            }}>
              <h3>Context Data (mpsaStatus API Response):</h3>
              <div style={{ 
                maxHeight: '300px', 
                overflow: 'auto',
                fontSize: '12px',
                backgroundColor: '#fff',
                padding: '10px',
                borderRadius: '3px',
                border: '1px solid #ddd'
              }}>
                <pre>{JSON.stringify(contextData, null, 2)}</pre>
              </div>
            </div>
          )}

          {!contextData && loginResponse && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#fff3cd', 
              borderRadius: '5px',
              border: '1px solid #ffeaa7'
            }}>
              <h3>⚠️ Context Data Missing</h3>
              <p>The mpsaStatus API call may have failed or returned null.</p>
              <p><strong>Parameters:</strong> soldTo={soldTo || 'null'}, salesOrg={salesOrg || 'null'}</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}