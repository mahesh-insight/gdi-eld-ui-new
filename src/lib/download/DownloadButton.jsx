'use client';

import { Button } from '@progress/kendo-react-buttons';
import { useDownload } from './useDownload';

/**
 * DownloadButton component
 * 
 * Reusable button component that triggers the download window with specific configuration.
 * 
 * @param {Object} props
 * @param {string} props.requestTypeID - The download request type ID (e.g., 'Azure_Plan_Invoice')
 * @param {string} props.fileName - Base file name for the download
 * @param {string} props.soldToId - Account/Customer sold-to ID
 * @param {string} [props.usageMonth] - Usage month (optional)
 * @param {string} [props.invoiceMonth] - Invoice month (optional)
 * @param {string} [props.filterState] - Query string with filters (optional)
 * @param {string} [props.apiEndpoint] - API endpoint for data fetching (optional)
 * @param {number} [props.gridTotalElements] - Total number of records (optional)
 * @param {string} [props.label] - Button label text (default: 'Download')
 * @param {string} [props.themeColor] - Kendo button theme (default: 'primary')
 * @param {string} [props.fillMode] - Kendo button fill mode (default: 'solid')
 * @param {string} [props.title] - Button title tooltip (optional)
 * @param {boolean} [props.disabled] - Whether button is disabled (default: false)
 * @param {string} [props.className] - Additional CSS classes
 * @param {Function} [props.onClick] - Additional click handler (optional)
 * @param {React.ReactNode} [props.children] - Button content (icons, text, etc.)
 */
export function DownloadButton({
  requestTypeID,
  fileName,
  soldToId,
  usageMonth,
  invoiceMonth,
  filterState,
  apiEndpoint,
  gridTotalElements = 0,
  label = 'Download',
  themeColor = 'primary',
  fillMode = 'solid',
  title,
  disabled = false,
  className = '',
  onClick,
  children,
}) {
  const { scheduleDownload, isLoading } = useDownload();

  const handleClick = async () => {
    // Call optional custom click handler first
    if (onClick) {
      onClick();
    }

    // Schedule the download
    await scheduleDownload({
      requestTypeID,
      fileName,
      soldToId,
      usageMonth,
      invoiceMonth,
      filterState,
      apiEndpoint,
      gridTotalElements,
    });
  };

  return (
    <Button
      fillMode={fillMode}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={className}
      title={title || label}
    >
      {children || (isLoading ? 'Loading...' : label)}
    </Button>
  );
}

/**
 * Example usage:
 * 
 * // Basic usage
 * <DownloadButton
 *   requestTypeID="Azure_Plan_Invoice"
 *   fileName="Azure-Invoice"
 *   soldToId={accountInfo.soldToID}
 *   invoiceMonth="202312"
 * />
 * 
 * // With filters
 * <DownloadButton
 *   requestTypeID="Azure_Plan_Consumption_Daily"
 *   fileName="Azure-Consumption"
 *   soldToId={accountInfo.soldToID}
 *   usageMonth="202312"
 *   filterState={window.location.search}
 *   gridTotalElements={totalRecords}
 * />
 * 
 * // Custom styling
 * <DownloadButton
 *   requestTypeID="Billing_Items"
 *   fileName="Billing-Items"
 *   soldToId={accountInfo.soldToID}
 *   label="Export to Excel"
 *   themeColor="success"
 *   className="custom-download-btn"
 * />
 */
