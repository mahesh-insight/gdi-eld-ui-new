'use client';

import { useCallback } from 'react';
import { useDownloadContext } from './downloadContext';
import { fetchDownloadHistory, checkPendingDownloads, submitDownloadRequest, deleteDownloadRequest, downloadFileById } from './downloadService';
import { buildQuartzPayload } from './quartzPayloadBuilder';

/**
 * Custom hook for download functionality
 * Provides centralized download operations for any component
 */
export function useDownload() {
  const {
    isDownloadPopupVisible,
    downloadFileDetails,
    scheduledDownloads,
    hasPendingDownloads,
    isLoading,
    setIsLoading,
    setScheduledDownloads,
    setHasPendingDownloads,
    openDownloadPopup,
    closeDownloadPopup,
  } = useDownloadContext();

  /**
   * Open download popup with specific configuration
   * @param {Object} config - Download configuration
   */
  const scheduleDownload = useCallback(async (config) => {
    const {
      requestTypeID,
      fileName,
      soldToId,
      apiEndpoint,
      usageMonth,
      invoiceMonth,
      filterState,
      gridTotalElements = 0,
    } = config;

    console.log('🚀 scheduleDownload: Setting isLoading to TRUE');
    setIsLoading(true);

    try {
      const fileDetails = {
        requestTypeID,
        fileName,
        soldToId,
        apiEndpoint,
        usageMonth,
        invoiceMonth,
        filterState,
        gridTotalElements,
      };

      openDownloadPopup(fileDetails);

      // Fetch existing download history
      console.log('📥 Fetching download history...');
      const historyResult = await fetchDownloadHistory(requestTypeID);
      console.log('📥 History result:', historyResult);
      if (historyResult.success) {
        const downloads = historyResult.data?.content || [];
        console.log('📥 Setting downloads:', downloads.length, 'items');
        setScheduledDownloads(downloads);
      }

      // Check for pending downloads
      const pendingResult = await checkPendingDownloads(requestTypeID);
      if (pendingResult.success) {
        setHasPendingDownloads(pendingResult.hasPending);
      }
    } catch (error) {
      console.error('scheduleDownload error:', error);
    } finally {
      console.log('✅ scheduleDownload: Setting isLoading to FALSE');
      setIsLoading(false);
    }
  }, [openDownloadPopup, setIsLoading, setScheduledDownloads, setHasPendingDownloads]);

  /**
   * Submit a download request
   * @param {Object} params - Download parameters
   */
  const submitDownload = useCallback(async (params) => {
    setIsLoading(true);

    try {
      // Build Quartz payload
      const payload = buildQuartzPayload(params);

      console.log('📥 Submitting download request:', {
        requestTypeID: params.requestTypeID,
        fileName: params.fileName,
        payload,
      });

      // Submit request
      const result = await submitDownloadRequest(payload);

      if (result.success) {
        console.log('✅ Download request submitted successfully');
        
        // Update scheduled downloads
        setScheduledDownloads(result.data?.content || []);
        setHasPendingDownloads(true);

        return {
          success: true,
          message: 'Download request submitted successfully',
        };
      } else {
        console.error('❌ Download request failed:', result.error);
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('submitDownload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit download request',
      };
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setScheduledDownloads, setHasPendingDownloads]);

  /**
   * Refresh download history (with loading state - for manual refresh)
   * @param {string} requestTypeID - Request type identifier
   */
  const refreshDownloadHistory = useCallback(async (requestTypeID) => {
    setIsLoading(true);

    try {
      const result = await fetchDownloadHistory(requestTypeID);
      
      if (result.success) {
        const downloads = result.data?.content || [];
        setScheduledDownloads(downloads);
      }

      const pendingResult = await checkPendingDownloads(requestTypeID);
      if (pendingResult.success) {
        setHasPendingDownloads(pendingResult.hasPending);
      }
    } catch (error) {
      console.error('refreshDownloadHistory error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setScheduledDownloads, setHasPendingDownloads]);

  /**
   * Silent refresh - for auto-refresh without showing loader
   * @param {string} requestTypeID - Request type identifier
   */
  const silentRefreshDownloadHistory = useCallback(async (requestTypeID) => {
    try {
      // Fetch only open/incomplete downloads
      const result = await checkPendingDownloads(requestTypeID);
      
      if (result.success) {
        const hasPending = result.hasPending;
        setHasPendingDownloads(hasPending);
        
        // If there are pending downloads, fetch the full history
        if (hasPending || result.data?.content?.length > 0) {
          const historyResult = await fetchDownloadHistory(requestTypeID);
          if (historyResult.success) {
            const downloads = historyResult.data?.content || [];
            setScheduledDownloads(downloads);
          }
        }
      }
    } catch (error) {
      console.error('silentRefreshDownloadHistory error:', error);
      // Silent failure - don't disrupt user experience
    }
  }, [setScheduledDownloads, setHasPendingDownloads]);

  /**
   * Check for pending downloads on page load
   * @param {string} requestTypeID - Request type identifier
   */
  const checkPending = useCallback(async (requestTypeID) => {
    try {
      const result = await checkPendingDownloads(requestTypeID);
      if (result.success) {
        setHasPendingDownloads(result.hasPending);
      }
    } catch (error) {
      console.error('checkPending error:', error);
    }
  }, [setHasPendingDownloads]);

  /**
   * Download a file
   * @param {Object} dataItem - Download item with id, fileName, and reportFormat
   */
  const downloadFile = useCallback(async (dataItem) => {
    try {
      setIsLoading(true);
      
      if (!dataItem.id) {
        throw new Error('Download ID is missing');
      }
      
      console.log('📥 Downloading file:', { id: dataItem.id, fileName: dataItem.fileName });
      
      // Use server action to download file with proper authentication
      const result = await downloadFileById(dataItem.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Download failed');
      }

      // Convert array back to Uint8Array and create blob
      const uint8Array = new Uint8Array(result.data);
      const blob = new Blob([uint8Array], { type: result.contentType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension based on format field
      let fileExtension = 'xlsx'; // Default to Excel
      if (dataItem.reportFormat) {
        const format = dataItem.reportFormat.toLowerCase();
        if (format === 'csv') {
          fileExtension = 'csv';
        } else if (format === 'excel') {
          fileExtension = 'xlsx';
        }
      }
      
      link.setAttribute('download', `${dataItem.fileName}.${fileExtension}`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ File downloaded:', dataItem.fileName);
    } catch (error) {
      console.error('downloadFile error:', error);
      console.log('Failed to download file: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  /**
   * Remove a download from history
   * @param {Object} dataItem - Download item with id
   */
  const removeFile = useCallback(async (dataItem) => {
    if (!dataItem.id || !downloadFileDetails?.requestTypeID) {
      console.error('Missing id or requestTypeID');
      return;
    }

    try {
      setIsLoading(true);
      
      // Call delete API using server action
      const result = await deleteDownloadRequest(dataItem.id);

      if (!result.success) {
        throw new Error(result.error || 'Remove failed');
      }

      console.log('✅ File removed:', dataItem.fileName);

      // Refresh the download history
      await refreshDownloadHistory(downloadFileDetails.requestTypeID);
    } catch (error) {
      console.error('removeFile error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, downloadFileDetails, refreshDownloadHistory]);

  return {
    // State
    isDownloadPopupVisible,
    downloadFileDetails,
    scheduledDownloads,
    hasPendingDownloads,
    isLoading,
    
    // Actions
    scheduleDownload,
    submitDownload,
    refreshDownloadHistory,
    silentRefreshDownloadHistory,
    checkPending,
    closeDownloadPopup,
    downloadFile,
    removeFile,
  };
}
