"use client";
import { Skeleton } from '@progress/kendo-react-indicators';

export default function AzureSpendSkeleton() {
  return (
    <div className="dashboard-widget" style={{ maxWidth: 420, margin: "32px auto", minHeight: 420 }}>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Skeleton shape="text" style={{ width: 160, height: 28, marginBottom: 16 }} />
          <Skeleton shape="text" style={{ width: 120, height: 18, marginBottom: 8 }} />
          <Skeleton shape="text" style={{ width: 120, height: 18, marginBottom: 8 }} />
          <Skeleton shape="text" style={{ width: 120, height: 18, marginBottom: 8 }} />
          <Skeleton shape="text" style={{ width: 180, height: 16, marginBottom: 8 }} />
        </div>
        <Skeleton shape="rect" style={{ width: '100%', height: 220, borderRadius: 12 }} />
      </div>
    </div>
  );
}
