// src/app/invoices/history/loading.js
"use client";
import { Skeleton } from '@progress/kendo-react-indicators';
import './invoice-history.css';

export default function Loading() {
  return (
    <div className="invoice-history-container">
      <div className="invoice-history-header">
        <Skeleton className="invoice-history-skeleton-title" />
      </div>
      <div className="invoice-history-provider-row">
        <div className="invoice-history-dropdown-group">
          <Skeleton className="invoice-history-skeleton-dropdown" />
        </div>
      </div>
      <div className="invoice-history-chart-section" style={{ paddingTop: 16 }}>
        <Skeleton className="invoice-history-skeleton-chart" />
      </div>
      <div className="invoice-history-filters">
        <Skeleton className="invoice-history-skeleton-dropdown" />
        <Skeleton className="invoice-history-skeleton-dropdown" />
        <Skeleton className="invoice-history-skeleton-dropdown" />
      </div>
      <div className="invoice-history-grid-section">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="invoice-history-skeleton-row" />
        ))}
      </div>
    </div>
  );
}
