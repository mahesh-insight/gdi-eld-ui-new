import { Skeleton } from '@progress/kendo-react-indicators';
import './AzureBilledConsumption.css';

export default function Loading() {
  return (
    <div className="azure-billed-page">
      <div className="azure-billed-container">
        {/* Breadcrumb Skeleton */}
        <div className="azure-billed-breadcrumb">
          <Skeleton shape="text" style={{ width: '300px', height: '20px' }} />
        </div>

        {/* Header Section */}
        <div className="azure-billed-header">
          {/* Title Skeleton */}
          <div className="azure-billed-header-top">
            <Skeleton shape="text" style={{ width: '400px', height: '32px', marginBottom: '20px' }} />
            
            {/* KPI Cards Skeleton */}
            <div className="kpi-cards">
              <div className="skeleton-kpi-wrapper">
                <Skeleton className="skeleton-full-size" />
              </div>
              <div className="skeleton-kpi-wrapper">
                <Skeleton className="skeleton-full-size" />
              </div>
              <div className="skeleton-kpi-wrapper">
                <Skeleton className="skeleton-full-size" />
              </div>
            </div>
          </div>

          {/* Customer Dropdown Skeleton */}
          <div className="azure-billed-header-bottom">
            <div className="azure-billed-customer-selector">
              <Skeleton className="skeleton-customer-label" />
              <Skeleton className="skeleton-customer-dropdown" />
            </div>
          </div>
        </div>

        {/* Tabs Section Skeleton */}
        <div className="azure-billed-tabs-section">
          <Skeleton className="skeleton-tabs" />
          <div className="azure-billed-tab-skeleton-content">
            <Skeleton className="skeleton-table" style={{ height: '400px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
