// src/app/subscriptions/loading.js
import './subscriptions.css';
import { Skeleton } from '@progress/kendo-react-indicators';

export default function Loading() {
  return (
    <div className="sub-page">
      <div className="sub-container">

        {/* Header skeleton */}
        <div className="sub-header">
          <div className="sub-header-top">
            <div className="sub-title-area">
              <Skeleton style={{ width: 320, height: 32, marginBottom: 8 }} />
              <Skeleton style={{ width: 480, height: 16 }} />
            </div>
            <div className="sub-kpi-row">
              <Skeleton style={{ width: 110, height: 60 }} />
              <Skeleton style={{ width: 130, height: 60 }} />
              <Skeleton style={{ width: 120, height: 60 }} />
            </div>
          </div>
          <div className="sub-status-row" style={{ marginTop: 12 }}>
            <Skeleton style={{ width: 60, height: 18 }} />
            <Skeleton style={{ width: 240, height: 32 }} />
          </div>
        </div>

        {/* Tab strip skeleton */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #dee2e6', marginBottom: 16 }}>
          <Skeleton style={{ width: 160, height: 36 }} />
          <Skeleton style={{ width: 140, height: 36 }} />
          <Skeleton style={{ width: 180, height: 36 }} />
        </div>

        {/* Two charts side by side */}
        <div className="sub-charts-row">
          <Skeleton style={{ flex: 1, height: 300 }} />
          <Skeleton style={{ flex: 1, height: 300 }} />
        </div>

        {/* Filters row */}
        <div className="sub-filters-row" style={{ marginBottom: 16 }}>
          <Skeleton style={{ flex: 1, height: 58 }} />
          <Skeleton style={{ flex: 1, height: 58 }} />
          <Skeleton style={{ flex: 1, height: 58 }} />
          <Skeleton style={{ width: 130, height: 32 }} />
        </div>

        {/* Grid rows */}
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} style={{ width: '100%', height: 36, marginBottom: 4 }} />
        ))}
      </div>
    </div>
  );
}
