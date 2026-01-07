"use client";
import { Skeleton } from '@progress/kendo-react-indicators';
import './loading.css';

export default function AzureInvoiceSkeleton() {
  return (
    <div className="azure-invoice-loading-page">
      <div className="azure-invoice-loading-container">
        {/* Header Section */}
        <div className="azure-invoice-loading-header">
          <div className="azure-invoice-loading-header-top">
            <Skeleton className="azure-invoice-loading-skeleton-title" />
            <div className="azure-invoice-loading-kpi-cards">
              <Skeleton className="azure-invoice-loading-skeleton-kpi" />
              <Skeleton className="azure-invoice-loading-skeleton-kpi" />
              <Skeleton className="azure-invoice-loading-skeleton-kpi" />
            </div>
          </div>
          <div className="azure-invoice-loading-header-bottom">
            <div className="azure-invoice-loading-month-selector">
              <Skeleton className="azure-invoice-loading-skeleton-selector" />
            </div>
            <Skeleton className="azure-invoice-loading-skeleton-link" />
          </div>
        </div>

        {/* Charts Section */}
        <div className="azure-invoice-loading-charts-section">
          <div className="azure-invoice-loading-charts-container">
            <div className="azure-invoice-loading-chart-box">
              <Skeleton className="azure-invoice-loading-skeleton-chart" />
            </div>
            <div className="azure-invoice-loading-chart-box">
              <Skeleton className="azure-invoice-loading-skeleton-chart" />
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="azure-invoice-loading-filter-section">
          <div className="azure-invoice-loading-filter-row">
            <div className="azure-invoice-loading-filter-group">
              <Skeleton className="azure-invoice-loading-skeleton-filter" />
            </div>
            <div className="azure-invoice-loading-filter-group">
              <Skeleton className="azure-invoice-loading-skeleton-filter" />
            </div>
            <div className="azure-invoice-loading-filter-group">
              <Skeleton className="azure-invoice-loading-skeleton-filter" />
            </div>
            <Skeleton className="azure-invoice-loading-skeleton-filter-button" />
          </div>
        </div>

        {/* Tabs Section with Tables */}
        <div className="azure-invoice-loading-tabs-section">
          <div className="azure-invoice-loading-table-container">
            <Skeleton className="azure-invoice-loading-skeleton-table-title" />
            <div className="azure-invoice-loading-table-rows">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="azure-invoice-loading-skeleton-table-row" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
