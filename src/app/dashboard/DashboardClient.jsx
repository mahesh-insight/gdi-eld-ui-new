"use client";

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { initializeAuth } from '@/store/authSlice';

export default function DashboardClient() {
  const dispatch = useDispatch();
  const { user, logout, isAuthenticated, loginResponse, contextData, soldTo, salesOrg } = useAuth();
  const {username, firstName, persona} = loginResponse || {};
  const [mpsaResponse, setMpsaResponse] = useState(null);
  const [mpsaError, setMpsaError] = useState(null);
  const [mpsaLoading, setMpsaLoading] = useState(false);
  const hasFetchedMpsa = useRef(false); // Prevent duplicate calls

  // Call mpsaStatus API when dashboard mounts
  useEffect(() => {
    const fetchMpsaStatus = async () => {
      // Only fetch if we don't have contextData and we have user soldToId
      const soldToId = user?.soldToId || loginResponse?.userProfile?.defaultContext?.[0]?.soldToId;
      
      console.log('🏠 Dashboard mounted - checking if mpsaStatus needs to be called');
      console.log('🔍 Current contextData:', contextData ? 'Available' : 'Not available');
      console.log('🔍 SoldToId:', soldToId);
      console.log('🔍 hasFetchedMpsa.current:', hasFetchedMpsa.current);
      
      if (!contextData && soldToId && isAuthenticated && !hasFetchedMpsa.current) {
        hasFetchedMpsa.current = true; // Mark as fetched to prevent duplicates
        console.log('🚀 Calling mpsaStatus API from dashboard with soldToId:', soldToId);
        setMpsaLoading(true);
        
        try {
          const { default: request } = await import('../../lib/api/request');
          
          const response = await request.get('mpsaStatus', {
            pathParam: soldToId
          });
          
          console.log('✅ mpsaStatus response received in dashboard:', response);
          setMpsaResponse(response);
          
          // Update Redux store with the context data
          const updatedAuth = {
            isAuthenticated,
            user,
            loginResponse,
            accessToken: loginResponse?.tokens?.bearerToken,
            contextData: {
              data: response.data,
              status: response.status,
              statusText: response.statusText
            },
            soldTo,
            salesOrg
          };
          
          dispatch(initializeAuth(updatedAuth));
          console.log('✅ Redux store updated with mpsaStatus context data');
          
        } catch (error) {
          console.error('❌ mpsaStatus API failed in dashboard:', {
            error: error.message,
            status: error?.response?.status,
            statusText: error?.response?.statusText
          });
          setMpsaError(error);
        } finally {
          setMpsaLoading(false);
        }
      } else if (contextData) {
        console.log('ℹ️ contextData already available, skipping mpsaStatus call');
        setMpsaLoading(false); // Ensure loading is false if data exists
      } else if (!soldToId) {
        console.warn('⚠️ No soldToId available for mpsaStatus call');
        setMpsaLoading(false);
      } else if (hasFetchedMpsa.current) {
        console.log('⚠️ mpsaStatus already fetched, skipping duplicate call');
      }
    };
    
    fetchMpsaStatus();
  }, []); // Run only once on mount

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  // Remove redundant auth check - ProtectedRoute handles this

  return (
    <ProtectedRoute>
      <div style={{ padding: '20px' }}>
        <div>
          {/* Show skeleton while loading mpsaStatus */}
          {(mpsaLoading || (!contextData && !mpsaResponse && !mpsaError)) && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '5px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ 
                height: '24px', 
                width: '60%', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '4px',
                marginBottom: '15px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
              <div style={{ 
                height: '120px', 
                width: '100%', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '4px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                🔄 Loading mpsaStatus API response...
              </p>
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

          {mpsaResponse && !contextData && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '5px' 
            }}>
              <h3>✅ mpsaStatus API Response (Called from Dashboard):</h3>
              <div style={{ 
                maxHeight: '300px', 
                overflow: 'auto',
                fontSize: '12px',
                backgroundColor: '#fff',
                padding: '10px',
                borderRadius: '3px',
                border: '1px solid #ddd'
              }}>
                <pre>{JSON.stringify(mpsaResponse, null, 2)}</pre>
              </div>
            </div>
          )}

          {mpsaError && !contextData && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#ffebee', 
              borderRadius: '5px',
              border: '1px solid #ef5350'
            }}>
              <h3>❌ mpsaStatus API Error</h3>
              <p>Failed to fetch context data from dashboard</p>
              <pre style={{ fontSize: '12px' }}>{JSON.stringify(mpsaError.message, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* CSS for skeleton pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </ProtectedRoute>
  );
}