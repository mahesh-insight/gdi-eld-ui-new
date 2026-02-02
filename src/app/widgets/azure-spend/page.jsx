"use client";
import { useEffect, useState } from 'react';
import { useStore } from 'react-redux';
import AzureSpendWidget from '../../dashboard/components/AzureSpendWidget';
import AzureSpendSkeleton from './AzureSpendSkeleton';

export default function AzureSpendEmbedPage({ searchParams }) {
  const soldToId = searchParams.soldToId;
  const payload = [soldToId];
  const [apiData, setApiData] = useState(null);

  const store = useStore();
  useEffect(() => {
    async function fetchData() {
      let accessToken;
      try {
        const authState = store.getState().auth;
        accessToken = authState?.loginResponse?.tokens?.bearerToken || authState?.accessToken;
      } catch (e) {
        accessToken = undefined;
      }
      try {
        const res = await fetch(
          "https://api-ccrdev.insight.com/ccr-dashboard-service/microsoft/azurespend",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify(payload),
          }
        );
        let rawText = await res.text();
        try {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].data) {
            setApiData(parsed[0].data);
          } else {
            setApiData(parsed);
          }
        } catch (err) {
          setApiData({ error: 'Failed to fetch data', details: err?.message });
        }
      } catch (e) {
        setApiData({ error: 'Failed to fetch data', details: e?.message });
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soldToId, store]);

  const isLoading = apiData === null;
  return (
    <div className="dashboard-widget" style={{ maxWidth: 420, margin: "32px auto" }}>
      {isLoading ? <AzureSpendSkeleton /> : <AzureSpendWidget data={apiData || {}} />}
    </div>
  );
}
