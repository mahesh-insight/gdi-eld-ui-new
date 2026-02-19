/**
 * Centralized Download System for Next.js
 * 
 * This module provides a modern, centralized download functionality that can be
 * used across all pages in the application.
 * 
 * Architecture:
 * - downloadContext.js: React Context for global download state management
 * - downloadService.js: Server Actions for API calls (fetch history, submit request)
 * - quartzPayloadBuilder.js: Centralized payload builder for all download types
 * - useDownload.js: Custom hook for download operations
 * - DownloadWindow.jsx: Modal component for download configuration
 * - DownloadButton.jsx: Reusable button component to trigger downloads
 * 
 * Usage:
 * 
 * 1. Wrap your app with DownloadProvider (usually in layout.js):
 *    import { DownloadProvider } from '@/lib/download';
 *    
 *    <DownloadProvider>
 *      {children}
 *    </DownloadProvider>
 * 
 * 2. Add DownloadWindow to your layout or page:
 *    import { DownloadWindow } from '@/lib/download';
 *    
 *    <DownloadWindow accountInfo={accountInfo} t={t} />
 * 
 * 3. Use DownloadButton in your pages:
 *    import { DownloadButton } from '@/lib/download';
 *    
 *    <DownloadButton
 *      requestTypeID="Azure_Plan_Invoice"
 *      fileName="Azure-Invoice"
 *      soldToId={accountInfo.soldToID}
 *      invoiceMonth="202312"
 *    />
 * 
 * 4. Or use the hook directly for custom logic:
 *    import { useDownload } from '@/lib/download';
 *    
 *    const { scheduleDownload, submitDownload } = useDownload();
 *    
 *    await scheduleDownload({
 *      requestTypeID: 'Azure_Plan_Invoice',
 *      fileName: 'Invoice',
 *      soldToId: '123456',
 *      invoiceMonth: '202312'
 *    });
 * 
 * Supported Download Types:
 * - Azure_Plan_Invoice
 * - Azure_Plan_Consumption_Daily
 * - Azure_Plan_BC_Comparison
 * - AWS_Consumption_Daily
 * - AWS_Consumption_Summary
 * - Billing_Items
 * - Billing_Items_History
 * - Legacy_Billing_Items
 * - Legacy_Billing_Items_History
 * - Subscription_Detail
 * - License_Summary_Charges
 * - MPSA_Invoice
 * - MPSA_Invoice_Reconcile
 * - MPSA_Subscription
 * - MPSA_Subscription_History
 * - MPSA_License_Detail
 */

export { DownloadProvider, useDownloadContext } from './downloadContext';
export { useDownload } from './useDownload';
export { DownloadWindow } from './DownloadWindow';
export { DownloadButton } from './DownloadButton';
export { ProgressBarCell } from './ProgressBarCell';
export { ActionCell } from './ActionCell';
export { buildQuartzPayload } from './quartzPayloadBuilder';
export {
  fetchDownloadHistory,
  checkPendingDownloads,
  submitDownloadRequest,
  deleteDownloadRequest,
} from './downloadService';
