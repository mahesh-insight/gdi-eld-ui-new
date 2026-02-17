"use client";
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/request';
import M365Widget from '../../dashboard/components/M365Widget';
import { Skeleton } from '@progress/kendo-react-indicators';

function M365Skeleton() {
  return (
    <div className="dashboard-widget">
      <Skeleton shape="text" style={{ width: '200px', height: '24px', marginBottom: '16px' }} />
      <Skeleton shape="text" style={{ width: '150px', height: '40px', marginBottom: '8px' }} />
      <Skeleton shape="rectangle" style={{ width: '100%', height: '200px' }} />
    </div>
  );
}

export default function M365EmbedPage({ searchParams }) {
  const soldToId = searchParams.soldToId;
  const payload = [soldToId];
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.post(
          "https://api-ccrdev.insight.com/ccr-dashboard-service/license",
          payload
        );
        
        const parsed = response.data;
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].data) {
          setApiData(parsed[0].data);
        } else {
          setApiData(parsed);
        }
      } catch (e) {
        setApiData({ error: 'Failed to fetch data', details: e?.message });
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soldToId]);

  const isLoading = apiData === null;
  return (
    <div className="dashboard-widget" style={{ maxWidth: 420, margin: "32px auto" }}>
      {isLoading ? <M365Skeleton /> : <M365Widget data={apiData || {}} />}
    </div>
  );
}
