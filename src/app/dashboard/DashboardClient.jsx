"use client";

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setMpsaStatusData } from '@/store/dashboardSlice';
import DashboardWidgets from './components/DashboardWidgets';

/**
 * DashboardClient Component
 * Supports both SSR (data from server) and Client-side (data from API calls)
 * 
 * Props:
 * - mode: 'ssr' (server-rendered with data) or 'client-side' (fetch on client)
 * - ssrData: Dashboard data from server (when mode='ssr')
 * - userContext: User context from server cookies (when mode='ssr')
 * - cached: Whether SSR data came from cache
 * - error: Error from server-side fetch (when mode='client-side')
 * - useEmbeddedPages: Whether to use iframe-embedded widget pages (default: false for performance)
 */
export default function DashboardClient({ mode = 'client-side', ssrData = null, userContext = null, cached = false, error = null, useEmbeddedPages = false }) {
  const dispatch = useDispatch();
  const { user, logout, isAuthenticated, loginResponse } = useAuth();
  const { username, firstName, persona } = loginResponse || {};
  
  // Get widget flags from Redux store
  const widgetFlags = useSelector(state => state.dashboard.widgetFlags);
  const mpsaStatusData = useSelector(state => state.dashboard.mpsaStatusData);

  // Derived: true only when mpsaStatusData holds a real successful API response (not an error body)
  const hasValidMpsaData = Boolean(
    mpsaStatusData &&
    mpsaStatusData.status === 200 &&
    mpsaStatusData.data &&
    typeof mpsaStatusData.data === 'object' &&
    !mpsaStatusData.data.error &&
    Object.keys(mpsaStatusData.data).length > 0
  );

  const [mpsaError, setMpsaError] = useState(error);
  const [mpsaLoading, setMpsaLoading] = useState(mode === 'client-side');
  const [dashboardData, setDashboardData] = useState(ssrData);
  const hasFetchedMpsa = useRef(mode === 'ssr' && ssrData?.mpsaStatus);

  // Clean up bypassCache query param after initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('bypassCache')) {
        console.log('🧹 Removing bypassCache query param from URL');
        searchParams.delete('bypassCache');
        const newUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Initialize Redux store with SSR data on mount
  useEffect(() => {
    
    if (mode === 'ssr' && ssrData && ssrData.mpsaStatus) {
      console.log('✅ CLIENT: Initializing with SSR data', {
        cached,
        hasWidgetFlags: !!ssrData.widgetFlags,
        widgetCount: ssrData.widgets ? Object.keys(ssrData.widgets).length : 0
      });
      
      // Store mpsaStatus data in Redux
      const serializableResponse = {
        data: ssrData.mpsaStatus.data || ssrData.mpsaStatus,
        status: 200,
        statusText: 'OK (SSR)'
      };
      
      dispatch(setMpsaStatusData(serializableResponse));
      setMpsaLoading(false);
      hasFetchedMpsa.current = true;
    }
  }, [mode, ssrData, cached, dispatch]);
  // Client-side mpsaStatus fetch (only if mode='client-side' and no SSR data)
  useEffect(() => {
    // Note: accountJustSwitched flag was already checked and removed in previous useEffect
    // If account was just switched, hasFetchedMpsa.current was set to false
    
    // Always check hasFetchedMpsa FIRST - if false, we need to fetch regardless of mode
    if (hasFetchedMpsa.current) {
      console.log('ℹ️ CLIENT: Already fetched, skipping', { mode, hasFetchedMpsa: hasFetchedMpsa.current });
      return;
    }
    
    // If we reach here, hasFetchedMpsa is false, meaning we need to fetch
    // This happens either in client-side mode OR when account was just switched

    const fetchMpsaStatus = async () => {
      // Get soldToId - prioritize localStorage (updated during account switch)
      let soldToId;
      
      // Check localStorage first (most recent, especially after account switch)
      if (typeof window !== 'undefined') {
        try {
          const storedSoldToId = localStorage.getItem('soldToId');
          if (storedSoldToId) {
            const parsed = JSON.parse(storedSoldToId);
            soldToId = Array.isArray(parsed) ? parsed[0] : parsed;
            console.log('📍 Using soldToId from localStorage:', soldToId);
          }
        } catch (e) {
          console.warn('Failed to parse soldToId from localStorage:', e);
        }
      }
      
      // Fallback to Redux if localStorage doesn't have it
      if (!soldToId) {
        soldToId = user?.soldToId || loginResponse?.userProfile?.defaultContext?.[0]?.soldToId;
        console.log('📍 Using soldToId from Redux:', soldToId);
      }
      
      // Check if mpsaStatusData has actual SUCCESSFUL data (not error responses)
      // (reuses the component-level hasValidMpsaData derived value)
      
      console.log('='.repeat(80));
      console.log('🏠 Dashboard mounted - MPSA Status Check (Client-side fallback)');
      console.log('='.repeat(80));
      console.log('📊 Redux State:');
      console.log('  - mpsaStatusData:', JSON.stringify(mpsaStatusData, null, 2));
      console.log('  - Has valid MPSA data:', hasValidMpsaData);
      console.log('  - Widget flags:', widgetFlags);
      console.log('');
      console.log('👤 User Info:');
      console.log('  - soldToId:', soldToId);
      console.log('');
      console.log('🔐 Auth State:');
      console.log('  - isAuthenticated:', isAuthenticated);
      console.log('  - accessToken exists:', !!loginResponse?.tokens?.bearerToken);
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
        console.log('🚀 CLIENT FALLBACK: Calling mpsaStatus API');
        setMpsaLoading(true);
        
        try {
          const { default: request } = await import('../../lib/api/request');
          
          console.log('📡 Making API request to mpsaStatus...');
          const response = await request.get('mpsaStatus', {
            pathParam: soldToId
          });
          
          console.log('✅ mpsaStatus response received, status:', response?.status);

          if (!response || response.status !== 200) {
            console.warn('⚠️ mpsaStatus returned non-200 status:', response?.status, '- skipping Redux update (auth interceptor will redirect)');
            hasFetchedMpsa.current = false;
            setMpsaLoading(false);
            return;
          }

          // Store ONLY serializable data in Redux (no AxiosHeaders, config, etc.)
          const serializableResponse = {
            data: response.data,
            status: response.status,
            statusText: response.statusText
          };
          
          // Store mpsaStatus data in Redux store (will extract widget flags automatically)
          dispatch(setMpsaStatusData(serializableResponse));
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
        console.log('ℹ️ CLIENT: mpsaStatusData already available, skipping fetch');
        console.log('📊 Widget flags:', widgetFlags);
        setMpsaLoading(false);
      } else if (!soldToId) {
        console.warn('⚠️ CLIENT: No soldToId available for mpsaStatus call');
        setMpsaLoading(false);
      } else {
        console.log('ℹ️ CLIENT: Conditions not met for mpsaStatus call');
        setMpsaLoading(false);
      }
    };
    
    fetchMpsaStatus();
  }, [mode, user, loginResponse, isAuthenticated, mpsaStatusData, widgetFlags, dispatch]); // Run when auth state changes

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
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        
        {/* Loading State */}
        {(mpsaLoading || (!hasValidMpsaData && !mpsaError)) && (
          <div className="dashboard-loading">
            <div style={{ 
              fontSize: '48px',
              marginBottom: '15px'
            }}>⏳</div>
            <h3>Loading Dashboard Data...</h3>
            <p>Fetching widget information and configurations</p>
          </div>
        )}

        {/* Error State */}
        {mpsaError && !hasValidMpsaData && (
          <div className="dashboard-error">
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>❌</div>
            <h3>Failed to Load Dashboard</h3>
            <p style={{ marginBottom: '15px' }}>
              Unable to fetch context data from the server
            </p>
            <pre style={{ 
              fontSize: '12px',
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(mpsaError, null, 2)}
            </pre>
          </div>
        )}

        {/* Dashboard Widgets */}
        {hasValidMpsaData && !mpsaError && (
          <DashboardWidgets ssrData={dashboardData} mode={mode} useEmbeddedPages={useEmbeddedPages} />
        )}
      </div>
    </ProtectedRoute>
  );
}