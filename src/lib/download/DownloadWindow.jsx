'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Window } from '@progress/kendo-react-dialogs';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Input } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { DatePicker } from '@progress/kendo-react-dateinputs';
import { Button, ButtonGroup } from '@progress/kendo-react-buttons';
import { RadioButton } from '@progress/kendo-react-inputs';
import { Hint } from '@progress/kendo-react-labels';
import { Loader } from '@progress/kendo-react-indicators';
import { useDownload } from './useDownload';
import { ProgressBarCell } from './ProgressBarCell';
import { ActionCell } from './ActionCell';
import './download.css';

export function DownloadWindow() {
  // Get accountInfo and translation from Redux/i18n context
  const accountInfo = useSelector((state) => state.user?.accountInfo);
  const { t } = useTranslation();
  
  // Grid state management
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [dataState, setDataState] = useState({
    page: 0,
    take: 20,
    skip: 0,
  });
  
  const {
    isDownloadPopupVisible,
    downloadFileDetails,
    scheduledDownloads,
    isLoading,
    submitDownload,
    refreshDownloadHistory,
    silentRefreshDownloadHistory,
    closeDownloadPopup,
  } = useDownload();

  console.log('🔄 DownloadWindow render:', {
    isVisible: isDownloadPopupVisible,
    isLoading,
    downloadsLength: scheduledDownloads?.length || 0,
    hasFileDetails: !!downloadFileDetails,
  });

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('Excel');
  const [reportDateType, setReportDateType] = useState('selectedmonth');
  const [customDateRange, setCustomDateRange] = useState('selectedmonth');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [fileNameError, setFileNameError] = useState(false);
  const [dateError, setDateError] = useState(false);

  const today = useMemo(() => new Date(), []);
  const maxEndDate = useMemo(() => {
    const maxDate = new Date(startDate.getTime());
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate > today ? today : maxDate;
  }, [startDate, today]);

  // Report date options
  const reportDateOptions = [
    { text: t?.('download.selectedMonth') || 'Selected Month', value: 'selectedmonth' },
    { text: t?.('download.previousYear') || 'Previous Year', value: 'previousyear' },
    { text: t?.('download.currentYearToDate') || 'Current Year to Date', value: 'currentyear' },
  ];

  const customRangeOptions = [
    { text: t?.('download.selectedMonth') || 'Selected Month', value: 'selectedmonth' },
    { text: t?.('download.customRange') || 'Custom Range', value: 'customRange' },
  ];

  // Initialize fileName when popup opens
  useEffect(() => {
    if (isDownloadPopupVisible && downloadFileDetails) {
      const { fileName: baseName, soldToId, usageMonth, invoiceMonth, requestTypeID, apiEndpoint } = downloadFileDetails;
      const month = usageMonth || invoiceMonth || '';
      
      let generatedName;
      
      // Special formatting for Billing_Items: provider-invoices-soldToIdNumber-invoiceMonth
      if (requestTypeID === 'Billing_Items') {
        // Extract provider from apiEndpoint (e.g., "adobeBillableInvoiceMonthDetail" -> "adobe")
        const provider = apiEndpoint
          ?.replace('BillableInvoiceMonthDetail', '')
          ?.toLowerCase() || 'microsoft';
        
        // Extract soldToId number from pipe-separated string (e.g., "Insight|SAP|0011035258|2400" -> "0011035258")
        const soldToIdParts = soldToId?.split('|') || [];
        const soldToIdNumber = soldToIdParts[2] || soldToId;
        
        generatedName = month
          ? `${provider}-invoices-${soldToIdNumber}-${month}`
          : `${provider}-invoices-${soldToIdNumber}`;
      } else {
        // Default format for other report types
        generatedName = month
          ? `${baseName}-${soldToId}-${month}`
          : `${baseName}-${soldToId}`;
      }
      
      setFileName(generatedName);
      setFileNameError(false);
    }
  }, [isDownloadPopupVisible, downloadFileDetails]);

  // Reset end date when start date changes
  useEffect(() => {
    const newEndDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    setEndDate(newEndDate > today ? today : newEndDate);
  }, [startDate, today]);

  // Auto-refresh downloads every 30 seconds when there are incomplete downloads
  useEffect(() => {
    if (!isDownloadPopupVisible || !scheduledDownloads || scheduledDownloads.length === 0 || !downloadFileDetails) {
      return;
    }

    // Check if there are any incomplete downloads
    const hasIncompleteDownloads = scheduledDownloads.some(
      (download) => download.percentComplete < 100 || download.status !== 'Complete'
    );

    if (!hasIncompleteDownloads) {
      console.log('✅ All downloads complete, stopping auto-refresh');
      return;
    }

    console.log('🔄 Starting auto-refresh: polling every 30 seconds for incomplete downloads');

    // Set up interval to refresh every 30 seconds
    const intervalId = setInterval(() => {
      console.log('⏰ Auto-refresh: Silently fetching download updates...');
      silentRefreshDownloadHistory(downloadFileDetails.requestTypeID);
    }, 30000); // 30 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(intervalId);
    };
  }, [isDownloadPopupVisible, scheduledDownloads, silentRefreshDownloadHistory, downloadFileDetails]);

  const handleFileNameChange = (event) => {
    const value = event.target.value;
    setFileName(value);
    setFileNameError(value.length === 0);
  };

  const handleReportDateChange = (event) => {
    setReportDateType(event.target.value.value);
  };

  const handleCustomRangeChange = (event) => {
    const value = event.target.value.value;
    setCustomDateRange(value);
    
    if (value === 'customRange') {
      const { fileName: baseName, soldToId } = downloadFileDetails;
      setFileName(`${baseName}-${soldToId}`);
    } else {
      const { fileName: baseName, soldToId, usageMonth, invoiceMonth } = downloadFileDetails;
      const month = usageMonth || invoiceMonth || '';
      setFileName(month ? `${baseName}-${soldToId}-${month}` : `${baseName}-${soldToId}`);
    }
  };

  const handleSubmit = async () => {
    if (!fileName) {
      setFileNameError(true);
      return;
    }

    if (!downloadFileDetails) return;

    const payload = {
      requestTypeID: downloadFileDetails.requestTypeID,
      fileName,
      soldToId: accountInfo?.soldToID || downloadFileDetails.soldToId,
      fileType,
      usageMonth: downloadFileDetails.usageMonth,
      invoiceMonth: downloadFileDetails.invoiceMonth,
      filterState: downloadFileDetails.filterState,
      apiEndpoint: downloadFileDetails.apiEndpoint,
      reportDateType: customDateRange === 'customRange' ? null : reportDateType,
      customStartDate: customDateRange === 'customRange' ? startDate : null,
      customEndDate: customDateRange === 'customRange' ? endDate : null,
      isUnbilled: downloadFileDetails.filterState?.includes('unbilledonly=true'),
    };

    const result = await submitDownload(payload);

    if (result.success) {
      // Refresh download history after submission
      await refreshDownloadHistory(downloadFileDetails.requestTypeID);
    }
  };

  const handleRefresh = () => {
    if (downloadFileDetails?.requestTypeID) {
      refreshDownloadHistory(downloadFileDetails.requestTypeID);
    }
  };

  const handleClose = () => {
    closeDownloadPopup();
    // Reset state
    setReportDateType('selectedmonth');
    setCustomDateRange('selectedmonth');
    setFileType('Excel');
    setFileNameError(false);
    setDateError(false);
  };
  
  // Handle grid data state changes (pagination, sorting, etc.)
  const dataStateChange = (e) => {
    setDataState(e.dataState);
    setPage(e.dataState.skip / e.dataState.take);
    setPageSize(e.dataState.take);
  };

  if (!isDownloadPopupVisible || !downloadFileDetails) {
    return null;
  }

  const { requestTypeID, gridTotalElements = 0 } = downloadFileDetails;
  const isRecordsExceeded = gridTotalElements > 1000000;
  
  // Determine if we should show report date dropdown
  const showReportDate = requestTypeID === 'Billing_Items';
  const showCustomRange = 
    requestTypeID === 'Azure_Plan_Consumption_Daily' || 
    requestTypeID === 'AWS_Consumption_Daily';

  return (
    <Window
      onClose={handleClose}
      initialWidth={window.screen.width / 1.25}
      initialHeight={window.screen.height / 1.5 }
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
      modal={true}
      className="download-window-centered"
    >
      <div className="download-window-content">
        {/* Report Configuration Section */}
        <div className="download-form">
            <div className="o-grid__item u-1/1">
              <h3>{t("download.scheduleDownload").toUpperCase()}</h3>
            </div>
          {showReportDate && (
            <div className="form-field">
              <label className="form-label">{t?.('download.reportDate') || 'Report Date'}</label>
              <DropDownList
                data={reportDateOptions}
                textField="text"
                dataItemKey="value"
                value={reportDateOptions.find(opt => opt.value === reportDateType)}
                onChange={handleReportDateChange}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {showCustomRange && (
            <div className="form-field">
              <label className="form-label">{t?.('download.reportDate') || 'Report Date'}</label>
              <DropDownList
                data={customRangeOptions}
                textField="text"
                dataItemKey="value"
                value={customRangeOptions.find(opt => opt.value === customDateRange)}
                onChange={handleCustomRangeChange}
                style={{ width: '100%' }}
              />

              {customDateRange === 'customRange' && (
                <>
                  <div className="date-range-fields">
                    <div>
                      <label className="form-label-small">{t?.('download.startDate') || 'Start Date'}</label>
                      <DatePicker
                        format="yyyy-MM-dd"
                        value={startDate}
                        max={today}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label-small">{t?.('download.endDate') || 'End Date'}</label>
                      <DatePicker
                        format="yyyy-MM-dd"
                        value={endDate}
                        min={startDate}
                        max={maxEndDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="form-field">
            <label className="form-label">{t?.('download.fileName') || 'File Name'}</label>
            <Input
              value={fileName}
              onChange={handleFileNameChange}
              placeholder={t?.('download.fileName') || 'File Name'}
              style={{ width: '100%' }}
            />
            {isRecordsExceeded && (
              <Hint direction="start" className="hint-error">
                {t?.('download.reportRowLimitExceeded') || 'Records exceed limit of 1,000,000'}
              </Hint>
            )}
            {fileNameError && (
              <Hint direction="start" className="hint-error">
                {t?.('download.validFileName') || 'Please enter a valid file name'}
              </Hint>
            )}
            {!isRecordsExceeded && (reportDateType === 'selectedmonth' || customDateRange === 'selectedmonth') && (
              <p className="hint-text">
                {t?.('download.filesDownloadInfo') || 'Files will download based on the data filters on the previous screen.'}
              </p>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">{t?.('download.fileType') || 'File Type'}</label>
            <div className="radio-group">
              <RadioButton
                name="fileType"
                value="Excel"
                checked={fileType === 'Excel'}
                label="Excel"
                onChange={(e) => setFileType(e.value)}
              />
              <RadioButton
                name="fileType"
                value="CSV"
                checked={fileType === 'CSV'}
                label="CSV"
                onChange={(e) => setFileType(e.value)}
              />
            </div>
          </div>

          <ButtonGroup align="left">
            <Button themeColor="primary" className="apply-filters-btn" onClick={handleSubmit} disabled={isLoading}>
              {t?.('download.runReport') || 'Run Report'}
            </Button> &nbsp;&nbsp;&nbsp;
            <Button themeColor="base" onClick={handleClose}>
              {t?.('download.close') || 'Close'}
            </Button>
          </ButtonGroup>
        </div>

        {/* Previous Downloads Section */}
        <hr />
        <div className="previous-downloads-section">
          <div className="section-header">
            <div>
              <h3>{t?.('download.previousDownloads') || 'Previous Downloads'}</h3>
              <p className="hint-text">
                {scheduledDownloads?.some(d => d.percentComplete < 100 || d.status !== 'Complete') 
                  ? 'Auto-refreshing every 30 seconds to update progress'
                  : (t?.('download.downloadProgress') || 'Download status will update automatically')
                }
              </p>
            </div>
            <Button themeColor="primary" className="apply-filters-btn" onClick={handleRefresh} disabled={isLoading}>
              {t?.('download.refresh') || 'Refresh'}
            </Button>
          </div>

          {/* Download History Grid */}
          <div className="downloads-grid">
            <Grid
                data={scheduledDownloads || []}
                style={{ height: 'auto', maxHeight: '500px' }}
                pageable={{
                  pageSizes: [20, 50, 100],
                  buttonCount: 4,
                }}
                sortable={true}
                skip={page * pageSize}
                take={pageSize}
                total={scheduledDownloads?.length || 0}
                onPageChange={(e) => {
                  setPage(e.page.skip / e.page.take);
                  setPageSize(e.page.take);
                }}
              >
                <GridColumn 
                  field="fileName" 
                  title={t?.('download.fileNameColumn') || 'File Name'} 
                  width="260px" 
                />
                <GridColumn
                  field="created"
                  title={t?.('download.createdDateColumn') || 'Scheduled Date UTC'}
                  width="250px"
                  cells={{
                    data: (props) => {
                      if (!props.dataItem.created) {
                        return <td>N/A</td>;
                      }
                      const date = new Date(props.dataItem.created);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      const seconds = String(date.getSeconds()).padStart(2, '0');
                      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                      return <td>{formattedDate}</td>;
                    }
                  }}
                />
                <GridColumn 
                  field="processTimespan" 
                  title={t?.('download.processTimeColumn') || 'Process Time'} 
                  width="200px" 
                />
                <GridColumn 
                  field="fileSize" 
                  title={t?.('download.fileSizeColumn') || 'File Size'} 
                  width="150px" 
                />
                <GridColumn
                  title={t?.('download.fileStatusColumn') || 'File Status'}
                  width="260px"
                  cells={{
                    data: (props) => <ProgressBarCell {...props} />
                  }}
                />
                <GridColumn
                  title={t?.('download.actionsColumn') || 'Actions'}
                  width="260px"
                  cells={{
                    data: (props) => <ActionCell {...props} />
                  }}
                />
              </Grid>
          </div>
        </div>
      </div>
    </Window>
  );
}
