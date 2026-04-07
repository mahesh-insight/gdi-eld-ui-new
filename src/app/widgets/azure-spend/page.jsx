"use client";
import { useEffect, useState } from 'react';
import { useStore } from 'react-redux';
import AzureSpendWidget from '../../dashboard/components/AzureSpendWidget';
import AzureSpendSkeleton from './AzureSpendSkeleton';

export default function AzureSpendEmbedPage({ searchParams }) {
  const [apiData, setApiData] = useState(null);
  const [accessToken, setAccessToken] = useState(searchParams.token || null);
  const [soldToId, setSoldToId] = useState(searchParams.soldToId || null);
  const [allowedOrigins] = useState([
    'http://localhost:8080', // React app
    'http://localhost:8081',
    'http://localhost:3000',
    'https://your-domain.com', // Add your production domains here
  ]);

  const store = useStore();

  // Notify parent of errors
  const notifyParent = (type, data) => {
    if (window.parent !== window) {
      const origin = allowedOrigins[0]; // Send to first allowed origin or track the source
      window.parent.postMessage({ type, ...data }, origin);
    }
  };

  // Fetch data from API
  const fetchData = async (token, soldTo) => {
    if (!token) {
      const error = { error: 'Unauthorized', details: 'Access token is required' };
      setApiData(error);
      notifyParent('WIDGET_ERROR', error);
      return;
    }

    if (!soldTo) {
      const error = { error: 'Bad Request', details: 'soldToId is required' };
      setApiData(error);
      notifyParent('WIDGET_ERROR', error);
      return;
    }

    try {
      const response = await fetch(
        `/api/widgets/azure-spend?soldToId=${encodeURIComponent(soldTo)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        setApiData(errorData);
        notifyParent('WIDGET_ERROR', errorData);
        return;
      }

      const parsed = await response.json();
      let data;
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].data) {
        data = parsed[0].data;
      } else {
        data = parsed;
      }
      setApiData(data);
      notifyParent('WIDGET_LOADED', { success: true });
    } catch (e) {
      const error = { error: 'Failed to fetch data', details: e?.message };
      setApiData(error);
      notifyParent('WIDGET_ERROR', error);
    }
  };

  useEffect(() => {
    // Handle postMessage from parent
    const handleMessage = (event) => {
      // Validate origin for security
      if (!allowedOrigins.includes(event.origin)) {
        console.warn('Message from unauthorized origin:', event.origin);
        return;
      }

      const { type, token, soldToId: newSoldToId } = event.data;

      if (type === 'AUTH_TOKEN') {
        setAccessToken(token);
        setSoldToId(newSoldToId || soldToId);
        
        // Fetch data with the provided token
        fetchData(token, newSoldToId || soldToId);
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify parent that widget is ready
    if (window.parent !== window) {
      notifyParent('WIDGET_READY', {
        timestamp: new Date().toISOString(),
        needsAuth: !accessToken,
      });
    }

    // If token already available from URL params, fetch immediately
    if (accessToken && soldToId) {
      fetchData(accessToken, soldToId);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = apiData === null;
  return (
    <div className="dashboard-widget" style={{ maxWidth: 420, margin: "32px auto" }}>
      {isLoading ? <AzureSpendSkeleton /> : <AzureSpendWidget data={apiData || {}} />}
    </div>
  );
}
