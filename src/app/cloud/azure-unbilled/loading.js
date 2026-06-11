// src/app/cloud/azure-unbilled/loading.js
import './azure-unbilled.css';
import { Skeleton } from '@progress/kendo-react-indicators';

export default function Loading() {
  return (
    <div className="azure-unbilled-page">
      <div className="azure-unbilled-container">
        {/* Header skeleton */}
        <div className="azure-unbilled-header">
          <div className="azure-unbilled-header-top">
            <Skeleton style={{ width: '240px', height: '28px' }} />
            <Skeleton className="azure-unbilled-skeleton-kpi" />
          </div>
          <Skeleton style={{ width: '300px', height: '32px', marginBottom: '12px' }} />
          <div className="azure-unbilled-month-row">
            <Skeleton style={{ width: '100px', height: '18px' }} />
            <Skeleton className="azure-unbilled-skeleton-month" />
          </div>
        </div>

        {/* Tab strip skeleton */}
        <div style={{ borderBottom: '1px solid #dee2e6', marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <Skeleton style={{ width: '160px', height: '36px' }} />
          <Skeleton style={{ width: '220px', height: '36px' }} />
        </div>

        {/* Filter row skeleton */}
        <div className="azure-unbilled-filters" style={{ marginBottom: '16px' }}>
          <Skeleton style={{ flex: 1, height: '58px' }} />
          <Skeleton style={{ flex: 1, height: '58px' }} />
          <Skeleton style={{ width: '120px', height: '32px' }} />
          <Skeleton style={{ width: '120px', height: '32px' }} />
        </div>

        {/* Chart skeleton */}
        <Skeleton className="azure-unbilled-skeleton-chart" style={{ marginBottom: '24px' }} />

        {/* Grid skeleton */}
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="azure-unbilled-skeleton-row" />
        ))}
      </div>
    </div>
  );
}
