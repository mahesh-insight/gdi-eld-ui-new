"use client";

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initializeAuth } from '@/store/authSlice';
import { setMpsaStatusData } from '@/store/dashboardSlice';

export default function DashboardClient() {
  const dispatch = useDispatch();
  const { user, logout, isAuthenticated, loginResponse, contextData, soldTo, salesOrg } = useAuth();
  const {username, firstName, persona} = loginResponse || {};
  
  // Get widget flags from Redux store
  const widgetFlags = useSelector(state => state.dashboard.widgetFlags);
  const mpsaStatusData = useSelector(state => state.dashboard.mpsaStatusData);
  
  const [mpsaResponse, setMpsaResponse] = useState(null);
  const [mpsaError, setMpsaError] = useState(null);
  const [mpsaLoading, setMpsaLoading] = useState(false);
  const hasFetchedMpsa = useRef(false); // Prevent duplicate calls

  // Call mpsaStatus API when dashboard mounts
  useEffect(() => {
    const fetchMpsaStatus = async () => {
      // Only fetch if we don't have valid mpsaStatusData and we have user soldToId
      const soldToId = user?.soldToId || loginResponse?.userProfile?.defaultContext?.[0]?.soldToId;
      
      // Check if mpsaStatusData has actual SUCCESSFUL data (not error responses)
      const hasValidMpsaData = mpsaStatusData && 
        mpsaStatusData.status === 200 && 
        mpsaStatusData.data && 
        typeof mpsaStatusData.data === 'object' && 
        !mpsaStatusData.data.error &&
        Object.keys(mpsaStatusData.data).length > 0;
      
      console.log('='.repeat(80));
      console.log('🏠 Dashboard mounted - MPSA Status Check');
      console.log('='.repeat(80));
      console.log('📊 Redux State:');
      console.log('  - mpsaStatusData:', JSON.stringify(mpsaStatusData, null, 2));
      console.log('  - Has valid MPSA data:', hasValidMpsaData);
      console.log('  - Widget flags:', widgetFlags);
      console.log('');
      console.log('👤 User Info:');
      console.log('  - user object:', user);
      console.log('  - soldToId from user:', user?.soldToId);
      console.log('  - soldToId from loginResponse:', loginResponse?.userProfile?.defaultContext?.[0]?.soldToId);
      console.log('  - Final soldToId:', soldToId);
      console.log('');
      console.log('🔐 Auth State:');
      console.log('  - isAuthenticated:', isAuthenticated);
      console.log('  - loginResponse exists:', !!loginResponse);
      console.log('  - accessToken exists:', !!loginResponse?.tokens?.bearerToken);
      console.log('');
      console.log('🔄 Fetch Status:');
      console.log('  - hasFetchedMpsa.current:', hasFetchedMpsa.current);
      console.log('  - mpsaLoading:', mpsaLoading);
      console.log('');
      console.log('✅ Conditions Check:');
      console.log('  - !hasValidMpsaData:', !hasValidMpsaData);
      console.log('  - soldToId exists:', !!soldToId);
      console.log('  - isAuthenticated:', isAuthenticated);
      console.log('  - !hasFetchedMpsa.current:', !hasFetchedMpsa.current);
      console.log('  - ALL CONDITIONS MET:', !hasValidMpsaData && soldToId && isAuthenticated && !hasFetchedMpsa.current);
      console.log('='.repeat(80));
      
      if (!hasValidMpsaData && soldToId && isAuthenticated && !hasFetchedMpsa.current) {
        hasFetchedMpsa.current = true; // Mark as fetched to prevent duplicates
        console.log('🚀 CALLING mpsaStatus API');
        console.log('  - soldToId:', soldToId);
        console.log('  - Will use Bearer token from Redux store');
        setMpsaLoading(true);
        
        try {
          const { default: request } = await import('../../lib/api/request');
          
          console.log('📡 Making API request to mpsaStatus...');
          const response = await request.get('mpsaStatus', {
            pathParam: soldToId
          });
          
          console.log('✅ mpsaStatus response received:', response);
          setMpsaResponse(response);
          
          // Store ONLY serializable data in Redux (no AxiosHeaders, config, etc.)
          const serializableResponse = {
            data: response.data,
            status: response.status,
            statusText: response.statusText
          };
          
          // Store mpsaStatus data in Redux store (will extract widget flags automatically)
          dispatch(setMpsaStatusData(serializableResponse));
          
          // Also update contextData in auth slice for backward compatibility
          const updatedAuth = {
            isAuthenticated,
            user,
            loginResponse,
            accessToken: loginResponse?.tokens?.bearerToken,
            contextData: serializableResponse,
            soldTo,
            salesOrg
          };
          
          dispatch(initializeAuth(updatedAuth));
          console.log('✅ Redux store updated with mpsaStatus data and widget flags');
          
        } catch (error) {
          console.error('❌ mpsaStatus API failed:', {
            error: error.message,
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data
          });
          setMpsaError(error);
        } finally {
          setMpsaLoading(false);
        }
      } else if (hasValidMpsaData) {
        console.log('ℹ️ mpsaStatusData already available, skipping mpsaStatus call');
        console.log('📊 Widget flags:', widgetFlags);
        setMpsaLoading(false);
      } else if (!soldToId) {
        console.warn('⚠️ No soldToId available for mpsaStatus call');
        setMpsaLoading(false);
      } else if (hasFetchedMpsa.current) {
        console.log('⚠️ mpsaStatus already fetched, skipping duplicate call');
      } else {
        console.log('⚠️ Conditions not met for mpsaStatus call:', {
          hasValidMpsaData,
          soldToId: !!soldToId,
          isAuthenticated,
          hasFetched: hasFetchedMpsa.current
        });
        setMpsaLoading(false);
      }
    };
    
    fetchMpsaStatus();
  }, []); // Run only once on mount

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleForceMpsaRefresh = async () => {
    if (confirm('🔄 Force refresh mpsaStatus data? This will clear cached data.')) {
      // Clear dashboard data from Redux
      const { clearDashboardData } = await import('@/store/dashboardSlice');
      dispatch(clearDashboardData());
      
      // Clear persisted data
      localStorage.removeItem('persist:ccr-dashboard');
      
      // Reset the ref
      hasFetchedMpsa.current = false;
      
      // Reload the page to trigger fresh fetch
      window.location.reload();
    }
  };

  // Remove redundant auth check - ProtectedRoute handles this

  return (
    <ProtectedRoute>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleForceMpsaRefresh}
            style={{
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Force Refresh MPSA Data
          </button>
          <button
            onClick={() => window.open('/clear-storage.html', '_blank')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🧹 Clear Storage
          </button>
        </div>
        <div>
          {/* Show skeleton while loading mpsaStatus */}
          {(mpsaLoading || (!mpsaStatusData?.data && !mpsaResponse && !mpsaError)) && (
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

          {mpsaStatusData?.data && (
            <>
              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                backgroundColor: '#e8f5e8', 
                borderRadius: '5px' 
              }}>
                <h3>✅ Widget Flags (Available in Redux Store):</h3>
                <div style={{ 
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  padding: '15px',
                  borderRadius: '3px',
                  border: '1px solid #ddd',
                  marginTop: '10px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <strong>🔷 Azure Spend Widget:</strong> {widgetFlags.isAzureSpendWidgetDataState ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                    <div>
                      <strong>📊 M365 Widget:</strong> {widgetFlags.isM365WidgetDataState ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                    <div>
                      <strong>☁️ MS Cloud Spend Widget:</strong> {widgetFlags.isMSSpendWidgetDataState ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                    <div>
                      <strong>🟠 AWS Spend Widget:</strong> {widgetFlags.isAwsSpendWidgetDataState ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                    <div>
                      <strong>🔴 Adobe Widget:</strong> {widgetFlags.isAdobeWidgetDataState ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                    <div>
                      <strong>📋 MPSA Widget:</strong> {widgetFlags.isMPSAWidgetDataState ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                  </div>
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong>🌍 Country Code:</strong> {mpsaStatusData.data?.salesOrganizationCountryCode || 'N/A'}
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>💾 Persisted:</strong> Yes (until logout)
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                backgroundColor: '#e3f2fd', 
                borderRadius: '5px' 
              }}>
                <h3>Raw mpsaStatus API Response:</h3>
                <div style={{ 
                  maxHeight: '300px', 
                  overflow: 'auto',
                  fontSize: '12px',
                  backgroundColor: '#fff',
                  padding: '10px',
                  borderRadius: '3px',
                  border: '1px solid #ddd',
                  marginTop: '10px'
                }}>
                  <pre>{JSON.stringify(mpsaStatusData, null, 2)}</pre>
                </div>
              </div>
            </>
          )}

          {contextData && !mpsaStatusData?.data && (
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

          {mpsaResponse && !mpsaStatusData?.data && (
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

          {mpsaError && !mpsaStatusData?.data && (
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