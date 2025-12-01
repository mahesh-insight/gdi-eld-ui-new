import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import qs from "qs";
import { useForm } from "react-hook-form";
import { useRecoilValue, useSetRecoilState, useRecoilState } from "recoil";
import { Input } from "@progress/kendo-react-inputs";
import { Button, ButtonGroup, Message } from "@insight/toolkit-react";
import { FieldError } from "@insight/toolkit-react/lib/Form/Components/Decorators";
import request from "../../../src/library/api/request.js";
import "./download.css";
import { downloadColumns } from "../../../src/common/commonDataSets";
import GridFunctions from "../../../src/common/gridFunctions";
import GridTable from "../../../xps-utils/core/GridTable/index.js";
import { ProductsLoader, gridPagination, handleFilterPagination } from "../../../src/common/products-loader.js";
import { scheduledDownloadgridResponse, downloadGridResponse, gridResponse, handleGridResponse, pendingDownloadGridResponse, recordsExceedState } from "../../../src/recoil/gridAtoms.js";
import { selectedAccountState } from "../../../src/recoil/userAtoms.js";
import { AnalyticsData } from "../../../xps-utils/core/Analytics/utils";
import { errorState, billableItemsSortState, scheduleDownloadState, accountCustomer, selectedPagination, filterQuery, plainLoadingState, downloadPopupVisibilityState } from "../../../src/recoil/pageAtoms.js";
import Loader, { PlainLoader } from "../../../xps-utils/core/Loader";
import DownloadGridTable from "../GridTable/downloadGrid.js";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { DatePicker, DateRangePicker } from "@progress/kendo-react-dateinputs";
import { Hint } from "@progress/kendo-react-labels";
import { useTranslation } from "react-i18next";


export default function Download(props) {
  const { t } = useTranslation();
  var columns = downloadColumns(t);
  const location = useLocation();
  const _export = useRef(null);
  const moment = require("moment");
  const { fileObj } = props;
  const { exportURL, requestTypeID, gridDataObject } = fileObj;
  const { exportDateRangeURL, exportURLWithFilter, filterState, inputTagList, isCustomFlag, fileName, startDate, invoiceMonth, usageMonth, soldTo, invoiceNumber } = gridDataObject || {};
  const updatedStartDate = (fileName === 'Legacyconsumption' ? startDate : invoiceMonth || usageMonth)
  const fName = updatedStartDate ? fileName+'-'+soldTo+'-'+updatedStartDate : fileName+'-'+soldTo;
  const [error, setError] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const { setInitialColumnWidth, setWidth } = GridFunctions();
  const [fileValueInitial, setfileValueInitial] = useState(fName);
  const isAccountCustomer = useRecoilValue(accountCustomer);
  const isRecordExceeded = useRecoilValue(recordsExceedState);
  const gridDetails = useRecoilValue(gridResponse);
  const accountInfo = useRecoilValue(selectedAccountState);
  const isPagination = useRecoilValue(selectedPagination);
  const isErrorState = useRecoilValue(errorState);
  const isFilterQuery = useRecoilValue(filterQuery);
  const isPlainLoading = useRecoilValue(plainLoadingState);
  const isScheduledDownloadgridResponse = useRecoilValue(scheduledDownloadgridResponse) || [];
  const setScheduleDownloadState = useSetRecoilState(scheduleDownloadState);
  const setScheduledDownloadgridResponse = useSetRecoilState(scheduledDownloadgridResponse);
  const setPendingDownloadGridResponse = useSetRecoilState(pendingDownloadGridResponse);
  const setHandleGridResponse = useSetRecoilState(handleGridResponse);
  const setPagination = useSetRecoilState(selectedPagination);
  const setGridData = useSetRecoilState(gridResponse);
  const setPlainLoading = useSetRecoilState(plainLoadingState);
  const setDownloadPopupVisibilityState = useSetRecoilState(downloadPopupVisibilityState);
  const [gridSort, setGridSort] = useRecoilState(billableItemsSortState);
  const analytics = AnalyticsData();
  const { updateAnalytics } = analytics;
  const setDownloadGridResponse = useSetRecoilState(downloadGridResponse);
  const { handleSubmit, reset, register, getValues, formState: { errors } } = useForm();
  const [page, setPage] = useState(0);
  const [defaultStartDate, setDefaultStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000));
  const today = useMemo(() => new Date(), []); 
  const [dateError, setDateError] = useState(false);
  const [dateErrorMessage, setDateErrorMessage] = useState();
  const [reportDataInitialState, setReportDataInitialState] = useState({
    value: {
      text: t("downloadReports.selectedMonth"),
      value: 'selectedmonth=true',
    },
  });

  const [consumptionReportDataInitialState, setConsumptionReportDataInitialState] = useState({
    value: {
      text: t("downloadReports.selectedMonth"),
      value: 'selectedmonth',
    },
  });

  const reportData = [
    {
      text: t("downloadReports.selectedMonth"),
      value: 'selectedmonth=true',
    },
    {
      text: t("downloadReports.previousYear"),
      value: 'previousyear=true',
    },
    {
      text: t("downloadReports.currentYearToDate"),
      value: 'currentyear=true',
    },
  ];

  const reportDataConsumption = [
    {
      text: t("downloadReports.selectedMonth"),
      value: 'selectedmonth',
    },
    {
      text: t("downloadReports.customRange"),
      value: 'customRange',
    }
  ];

  const [dataState, setDataState] = useState({
    page,
    take: 20,
    skip: 0,
  });

  const [products, setProducts] = useState({
    data: [],
    total: gridDetails?.totalElements || 0,
  });

  const uiProps = JSON.parse(localStorage?.getItem("uiProps")) || {};

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  const formSubmit = (event) => {
    const domain = uiProps?.CCR_API_BASE_URL || process.env.API_BASE_URL;
    let dateRangeURL;
    const dateRangeType = consumptionReportDataInitialState?.value?.value;
    const reportType = reportDataInitialState?.value?.value;
    if (requestTypeID === "Azure_Consumption" && dateRangeType === "customRange") {
      dateRangeURL = `${domain}/${exportDateRangeURL}/${formatDate(defaultStartDate)}/${formatDate(selectedEndDate)}/export?page=0&${filterState}`;
    }
    const reportStatus = requestTypeID === "Billing_Items" ? `&${reportDataInitialState?.value?.value}` : '';
    const updatedExportURL = ((requestTypeID === "Billing_Items" && reportType === 'selectedmonth=true') || requestTypeID === "Billing_History") ? exportURLWithFilter : exportURL;
    const updatedURL = `${domain}/${updatedExportURL}${reportStatus ? reportStatus : ''}`;
    const url = requestTypeID === "Azure_Consumption" && dateRangeType === "customRange" ? dateRangeURL : updatedURL;
    if (fileValueInitial?.length === 0) {
      setError(true);
      return;
    }

    setError(false);
    setLoading(true);

    let [periodStart, periodEnd] = usageMonth ? usageMonth?.split("/") : [""];
    periodEnd = periodEnd || periodStart;

    const quartzRequestTypes = [
      "Azure_Plan_Invoice_Compare",
      "AWS_Consumption_Daily",
      "AWS_Consumption_Summary",
    ];

    const apiEndPoint = quartzRequestTypes?.includes(requestTypeID)
      ? "downloadsQuartz"
      : "downloads";


    let productName = [];
    let productCategory = [];
    let skuName = [];
    let accountName = [];
    let serviceName = [];


    const parseFilterExpression = (raw) => {
      const decoded = decodeURIComponent(raw || "");

      const match = decoded.match(/^(.*?)\s+(?:equals|eq)\s+(.*)$/i);
      if (!match) return null;

      const [, key, valuePart] = match;
      const filterKey = key.trim().toLowerCase();
      const filterValues = valuePart
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      return { filterKey, filterValues };
    };

    if (filterState) {
      const normalized = filterState.startsWith("?")
        ? filterState.slice(1)
        : filterState;

      const params = normalized.split("&");

      params.forEach((param) => {
        if (!param) return;

        const [rawKey, rawValue] = param.split("=");
        if (rawKey !== "filter" || !rawValue) return;

        const parsed = parseFilterExpression(rawValue);
        if (!parsed) return;

        const { filterKey, filterValues } = parsed;

        switch (filterKey) {
          case "productname":
            productName = [...productName, ...filterValues];
            break;
          case "productcategory":
            productCategory = [...productCategory, ...filterValues];
            break;
          case "skuname":
            skuName = [...skuName, ...filterValues];
            break;
          case "accountname":
            accountName = [...accountName, ...filterValues];
            break;
          case "servicename":
            serviceName = [...serviceName, ...filterValues];
            break;
          default:
          // ignore unknown filters
        }
      });
    }

    const isQuartz = quartzRequestTypes?.includes(requestTypeID);

    const dataObject = isQuartz
      ? requestTypeID === "Azure_Plan_Invoice_Compare"
        ? {
            fileName: fileValueInitial,
            reportType: requestTypeID,
            soldToId: accountInfo?.soldToID,
            userId: accountInfo?.userId,
            additionalInfo: {
              periodStart: periodStart,
              periodEnd: periodEnd,
              productName: productName,
              productCategory: productCategory,
              skuName: skuName,
              serviceName: serviceName,
              accountName: accountName,
            },
          }
        : {
            fileName: fileValueInitial,
            reportType: requestTypeID,
            soldToId: accountInfo?.soldToID,
            additionalInfo: {
              yearMonth: periodStart,
              invoiceNumber: invoiceNumber || "",
              serviceName: serviceName,
              productCategory: productCategory,
              accountName: accountName,
            },
          }
      : {
          soldToID: accountInfo?.soldToID,
          requestTypeID: requestTypeID,
          url: url,
          fileName: fileValueInitial || fileName,
        };

    try {
      request
        .post(apiEndPoint, { data: dataObject })
        .then((response) => {
          setGridData(response);
          setPendingDownloadGridResponse(true);
          setScheduledDownloadgridResponse(response?.data?.content);
          refreshResults();
          setLoading(false);
        })
        .catch((error) => {
          console.error("formSubmit error -> ", error);
          setLoading(false);
        });
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const clearResults = () => {
    setScheduleDownloadState(false);
    setDownloadPopupVisibilityState(false);
  };

  const refreshResults = () => {
    setLoading(true);
    try {
      request
        .get("downloadByUser", {
          params: { requestTypeID: requestTypeID },
        })
        .then((response) => {
          setTimeout(() => {
            setScheduledDownloadgridResponse(response?.data?.content);
            setLoading(false);
          }, 0);
        })
        .catch((error) => {
          console.error("downloadByUser error -> ", error);
          setLoading(false);
        });
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const onFileNameChange = (event) => {
    if (event?.value?.length > 0) {
      setError(false);
    } else {
      setError(true);
    }
    setfileValueInitial(event?.target?.value);
  };

  const handleReportDateChange = (event) => {
    setConsumptionReportDataInitialState({});
    setReportDataInitialState({
      value: event?.target?.value,
    });
  };

  const handleConsumptionReportDateChange = (event) => {
    setReportDataInitialState({});
    setConsumptionReportDataInitialState({
      value: event?.target?.value,
    });
    if(event?.target?.value?.value === "customRange"){
      setfileValueInitial(`${fileName}-${soldTo}`);
    }else{
      setfileValueInitial(`${fName}`);
    }
  };

  const dataStateChange = (e) => {
    setHandleGridResponse(false);
    let slicedURL, trimURL, updatedPageNumber, paginationPage;
    const nextPageURL = gridDetails?.nextPageUrl;
    const prevPageUrl = gridDetails?.prevPageUrl;
    const lastPageUrl = gridDetails?.lastPageUrl;
    const selectedTitle = e?.targetEvent?.currentTarget?.title;
    const selectedText = e?.targetEvent?.currentTarget?.innerText;
    const lastPageSelectedText =
      e?.targetEvent?.currentTarget?.className?.includes("k-pager-last");
    const firstPageSelectedText =
      e?.targetEvent?.currentTarget?.className?.includes("k-pager-first");
    const nextLevel =
      e?.targetEvent?.currentTarget?.nextSibling === null &&
      e?.targetEvent?.currentTarget?.previousSibling;
    const prevLevel =
      e?.targetEvent?.currentTarget?.previousSibling === null &&
      e?.targetEvent?.currentTarget?.nextSibling;
    const furtherNextLevel =
      e?.targetEvent?.currentTarget?.previousElementSibling
        ?.getAttribute("aria-label")
        ?.match(/\d+/)[0];
    const furtherPrevLevel = e?.targetEvent?.currentTarget?.nextElementSibling
      ?.getAttribute("aria-label")
      ?.match(/\d+/)[0];

    const datStateObject = {
      selectedTitle,
      slicedURL,
      nextPageURL,
      trimURL,
      updatedPageNumber,
      prevPageUrl,
      lastPageSelectedText,
      lastPageUrl,
      firstPageSelectedText,
      selectedText,
      nextLevel,
      furtherNextLevel,
      prevLevel,
      furtherPrevLevel,
    };
    paginationPage = gridPagination(datStateObject);
    setPage(paginationPage);
    setPagination(paginationPage);
    setDataState(e.dataState, page);
  };

  const dataReceived = (products) => {
    if (products.data) {
      setProducts(products);
    } else {
      setProducts({
        data: [],
        total: 0,
      });
    }
  };

  const maxEndDateAllowed = useMemo(() => {
    const maxDate = new Date(defaultStartDate.getTime());
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate > today ? today : maxDate;
  }, [defaultStartDate, today]);

  const handleStartDateChange = (event) => {
    const newStartDate = new Date(event.target.value);
    setDefaultStartDate(newStartDate);
  
    const calculatedEndDate = new Date(newStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    setSelectedEndDate(calculatedEndDate > today ? today : calculatedEndDate);
  };

  const handleEndDateChange = (event) => {
    const newEndDate = new Date(event.target.value);
    setSelectedEndDate(newEndDate); 
  };

  useEffect(() => {
    const newEndDate = new Date(defaultStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const cappedNewEndDate = newEndDate > today ? today : newEndDate;
    setSelectedEndDate(cappedNewEndDate);
  }, [defaultStartDate, today]);

  useEffect(() => {
    try {
      const resizeObserver = new ResizeObserver(() => {});
      setTimeout(() => {
        resizeObserver.disconnect();
      }, 0);
    } catch (error) {
      console.log('Error disconnecting ResizeObserver:', error);
    }
  }, [isLoading, isScheduledDownloadgridResponse, location]);

  return (
    <>
      <Loader isLoading={isErrorState ? "" : isLoading} />
      <PlainLoader isPlainLoading={isErrorState ? "" : isPlainLoading} />
      <div className="o-grid o-grid--gutters">
        <div className="o-grid__item u-1/1">
          <div className="o-grid o-grid--gutters">
            <div className="o-grid__item u-1/1">
              <p>{t("downloadReports.title").toUpperCase()}</p>
            </div>
            <div className="o-grid__item u-1/1">
              <form onSubmit={handleSubmit(formSubmit)}>
                {requestTypeID === "Billing_Items" && (
                  <div className="o-grid__item u-1/3">
                    <div className="c-form__element">
                      <label
                        className="c-form__label u-text-bolder"
                        htmlFor="fileName"
                      >
                        {t("common.reportDate")}
                      </label>
                      <div className="c-form__control">
                        <DropDownList
                          data={reportData}
                          textField="text"
                          dataItemKey="value"
                          value={reportDataInitialState?.value}
                          onChange={handleReportDateChange}
                          style={{
                            width: "100%",
                            float: "right",
                          }}
                        />
                        <br />
                        <br /><br />
                      </div>
                    </div>
                  </div>
                )}
                {requestTypeID === "Azure_Consumption" && (
                  <div className="o-grid__item u-1/3">
                    <div className="c-form__element report-date">
                      <label
                        className="c-form__label u-text-bolder"
                        htmlFor="fileName"
                      >
                        {t("common.reportDate")}
                      </label>
                      <div className="c-form__control">
                        <div className="date-picker-range">
                          <DropDownList
                            data={reportDataConsumption}
                            textField="text"
                            dataItemKey="value"
                            value={consumptionReportDataInitialState?.value}
                            onChange={handleConsumptionReportDateChange}
                            style={{
                              width: "100%",
                              float: "right",
                            }}
                          />
                          {consumptionReportDataInitialState?.value?.value ===
                            "customRange" && (
                            <span className="results-message-text date-picker-range-text">
                              {t("common.customDateRange")}
                            </span>
                          )}
                        </div>
                        {consumptionReportDataInitialState?.value?.value ===
                          "customRange" && (
                          <>
                            <div>
                              <span className="label-text-bold">
                                {t("common.startDate")}
                              </span>
                              <DatePicker
                                format={"yyyy-MM-dd"}
                                placeholder={t("common.chooseDate")}
                                defaultValue={defaultStartDate}
                                max={today}
                                onChange={handleStartDateChange}
                              />
                              {dateError && (
                                <Hint
                                  id={"StartDate"}
                                  direction={"start"}
                                  className="dateHint"
                                >
                                  {dateErrorMessage}
                                </Hint>
                              )}
                            </div>
                            <br />
                            <div>
                              <span className="label-text-bold">{t("common.endDate")}</span>
                              <DatePicker
                                format={"yyyy-MM-dd"}
                                placeholder={t("common.chooseDate")}
                                min={defaultStartDate}
                                max={maxEndDateAllowed}
                                value={selectedEndDate}
                                onChange={handleEndDateChange}
                              />
                            </div>
                            <br />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="o-grid__item u-1/3">
                <div className="c-form__element">
                  <label
                    className="c-form__label u-text-bolder"
                    htmlFor="fileName"
                  >
                    {t("common.fileName")}
                  </label>
                  <div className="c-form__control">
                    <Input
                      className="c-input"
                      id="fileName"
                      value={fileValueInitial}
                      onChange={onFileNameChange}
                      defaultValue={fileValueInitial}
                      placeholder={t("common.fileName")}
                    />
                    {isRecordExceeded && (
                      <div className="o-grid__item u-1/1">
                        <FieldError showErrorIcon className="c-form__error">
                          {t("common.reportRowLimitExceeded")}
                        </FieldError>
                      </div>
                    )}
                    {error && (
                      <FieldError showErrorIcon className="c-form__error">
                        {t("common.validFileName")}
                      </FieldError>
                    )}
                    <br />
                  </div>
                  {(reportDataInitialState?.value?.value.includes("selectedmonth") || consumptionReportDataInitialState?.value?.value ===
                            "selectedmonth") && (
                    <div className="results-message-text">
                      {t("downloadReports.filesDownloadInfo")}
                    </div>
                  )}
                </div>
                </div>
                <br />
                <div className="c-form__element">
                  <ButtonGroup align="left">
                    <Button color="primary" type="submit">
                      {t("common.runReport")}
                    </Button>
                    <Button color="secondary" onClick={() => clearResults()}>
                      {t("common.close")}
                    </Button>
                  </ButtonGroup>
                </div>
              </form>
            </div>
            <div className="o-grid__item u-1/3"></div>
            <div className="o-grid__item u-1/3"></div>
          </div>
        </div>
        <div className="o-grid__item u-1/1">
          <br />
          <hr />
          <div className="previous-download">
            <div>
              <p>{t("common.previousDownloads")}</p>
              <div className="results-message-text">
                {t("common.downloadProgress")}
              </div>
            </div>
            <ButtonGroup align="right">
              <Button color="primary" onClick={() => refreshResults()}>
                {t("common.refresh")}
              </Button>
            </ButtonGroup>
          </div>

          <br />

          <div className="o-grid o-grid--gutters">
            <div className="o-grid__item u-1/2"></div>
            <div className="o-grid__item u-1/1">
              <div className="billable_item_grid">
                {!isLoading && (
                  <>
                    <DownloadGridTable
                      className="download-grid-table"
                      name={"downloadFile"}
                      columns={columns}
                      tenantId={isAccountCustomer}
                      _export={_export}
                      gridSort={gridSort}
                      filterable={true}
                      sortable={true}
                      pageable={true}
                      dataState={{ ...dataState }}
                      data={products}
                      gridData={gridDetails?.content}
                      page={page}
                      dataStateChange={dataStateChange}
                      setWidth={setWidth}
                    />
                    {!isErrorState && (
                      <ProductsLoader
                        name={"downloadFile"}
                        page={page}
                        callType={"get"}
                        requestTypeID={requestTypeID}
                        tenantId={isAccountCustomer}
                        apiEndPoint={"downloadByUser"}
                        // filterQuery={isFilterQuery}
                        dataState={dataState}
                        onDataReceived={dataReceived}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
