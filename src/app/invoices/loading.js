// src/app/invoices/loading.js
"use client";
import { Skeleton } from '@progress/kendo-react-indicators';
import './loading.css';

export default function Loading() {
  return (
    <div className="invoices-loading-page">
      <div className="invoices-loading-container">
        {/* Header Section */}
        <div className="invoices-loading-header">
          <div className="invoices-loading-header-top">
            <Skeleton className="invoices-loading-skeleton-title" />
            <div className="invoices-loading-total-spend">
              <Skeleton className="invoices-loading-skeleton-total" />
            </div>
          </div>
        </div>

        {/* Dropdowns Section */}
        <div className="invoices-loading-controls">
          <div className="invoices-loading-dropdown-group">
            <Skeleton className="invoices-loading-skeleton-label" />
            <Skeleton className="invoices-loading-skeleton-dropdown" />
          </div>
          <div className="invoices-loading-dropdown-group">
            <Skeleton className="invoices-loading-skeleton-label" />
            <Skeleton className="invoices-loading-skeleton-dropdown" />
          </div>
          <div className="invoices-loading-dropdown-group">
            <Skeleton className="invoices-loading-skeleton-label" />
            <Skeleton className="invoices-loading-skeleton-dropdown" />
          </div>
        </div>

        {/* Chart Section */}
        <div className="invoices-loading-chart">
          <Skeleton className="invoices-loading-skeleton-chart-title" />
          <Skeleton className="invoices-loading-skeleton-chart" />
        </div>

        {/* Grid Section */}
        <div className="invoices-loading-grid">
          <Skeleton className="invoices-loading-skeleton-grid-title" />
          <div className="invoices-loading-grid-rows">
            {Array.from({ length: 10 }, (_, index) => (
              <Skeleton key={index} className="invoices-loading-skeleton-grid-row" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}