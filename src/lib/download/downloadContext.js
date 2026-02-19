'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const DownloadContext = createContext(null);

export function DownloadProvider({ children }) {
  const [isDownloadPopupVisible, setIsDownloadPopupVisible] = useState(false);
  const [downloadFileDetails, setDownloadFileDetails] = useState(null);
  const [scheduledDownloads, setScheduledDownloads] = useState([]);
  const [hasPendingDownloads, setHasPendingDownloads] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openDownloadPopup = useCallback((fileDetails) => {
    setDownloadFileDetails(fileDetails);
    setIsDownloadPopupVisible(true);
  }, []);

  const closeDownloadPopup = useCallback(() => {
    setIsDownloadPopupVisible(false);
    setDownloadFileDetails(null);
  }, []);

  const value = {
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
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloadContext() {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownloadContext must be used within DownloadProvider');
  }
  return context;
}
