// src/app/azure-invoice/AzureInvoiceClient.jsx
"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { IntlProvider } from "@progress/kendo-react-intl";
import "@/i18n"; // Initialize i18next
import { Chart } from "@progress/kendo-react-charts";
// === imports from your existing component ===

import { BasicGroupedChart } from "@/common/Charts/BasicGroupedChart";
import { BasicPieDoughnutChart } from "@/common/Charts/BasicPieDoughnutChart";
// adjust to your actual file
// plus Panel, Skeleton, DropDownList, Button, etc:
import { Panel, PanelBody } from "@/components/ui/panel";
import { azureInvoiceColumns } from "@/common/commonDataSets";
import { useSelector, useDispatch } from 'react-redux';

// Import all Redux actions from the appropriate slices
import { 
  setIntlLocalProvider, 
  setInvoiceCreditState,
  setFileNameState,
  setFilterQuery,
  setAccountCustomer,
  setInitialLoadingState,
  setBreadcrumbState,
  setDetailLoadingState,
  setLocationObjectState
} from "@/lib/store/slices/pageSlice";

import { 
  selectInvoiceMonths,
  selectCurrentMonth,
  selectSummaryData,
  selectCreditsData,
  selectTrendData,
  selectPieChartData,
  selectInvoiceTrendData,
  selectTotalSpend,
  selectSpendPeriod,
  selectTopNExpensiveProducts,
  setSelectedMonth,
  setAppliedFilters
} from "@/lib/store/slices/azureInvoiceSlice";

import {
  setGridSort,
  setViewBilledUsage,
  setInitialColumnWidth
} from "@/lib/store/slices/gridSlice";

const moment = require("moment");

export default function AzureInvoiceClient() {
  const router = useRouter();
  const { t } = useTranslation();
  const columns = azureInvoiceColumns(t);

  // ----------------- REDUX HOOKS (replacing Recoil) -----------------
  const isIntlLocalProvider = useSelector(state => state.page.intlLocalProvider);

  // ----------------- REDUX SELECTORS - No local state needed -----------------
  const dispatch = useDispatch();
  
  // Get all data from Redux store (server-side rendered and cached)
  const invoiceMonths = useSelector(selectInvoiceMonths);
  const currentMonth = useSelector(selectCurrentMonth);
  const summaryData = useSelector(selectSummaryData);
  const creditsData = useSelector(selectCreditsData);
  const trendData = useSelector(selectTrendData);
  const pieChartData = useSelector(selectPieChartData);
  const invoiceTrendData = useSelector(selectInvoiceTrendData);
  const totalSpend = useSelector(selectTotalSpend);
  const spendPeriod = useSelector(selectSpendPeriod);
  const topNExpensiveProducts = useSelector(selectTopNExpensiveProducts);
  
  // Get UI properties from Redux instead of props
  const { uiProperties } = useSelector(state => state.ui);
  
  // Derived data from Redux
  const usageMonth = currentMonth?.value;
  const usageMonthDifference = currentMonth?.usageMonthDifference;

  // credits from Redux store
  useEffect(() => {
    dispatch(setInvoiceCreditState(totalSpend));
  }, [dispatch, totalSpend]);

  // flags / config from Redux UI properties
  const archeraURL = uiProperties?.CCR_ARCHERA_URL || "";
  const flags = uiProperties?.flags || {};
  const isClickThruFlag = flags["gdi-357-clickthru"] || false;
  const isArcheraFlag = flags["gdi-1217-archera"] || false;

  // =================================================================
  //  Use centralized Azure Invoice API
  // =================================================================

  // -----------------------------------------------------------------
  //  REDUX DATA HANDLERS - No client-side API calls
  // -----------------------------------------------------------------
  
  // All data comes from server-side rendered props, stored in Redux
  // Client-side interactions only update local state for UI changes

  // -----------------------------------------------------------------
  //  INITIAL EFFECT – much smaller now
  // -----------------------------------------------------------------
  useEffect(() => {
    document.title = t("azurePlanInvoice.azureInvoice");
    dispatch(setFileNameState("Azure Invoice"));
    dispatch(setFilterQuery([]));
    dispatch(setAccountCustomer(null));
    dispatch(setInitialLoadingState(false));
    dispatch(setGridSort({ field: "id", dir: "asc" })); // initialSort placeholder
    dispatch(setViewBilledUsage(true));
    dispatch(setInitialColumnWidth({
      grid: typeof document !== "undefined" ? document.querySelector(".k-grid") : null,
      columns
    }));
  }, [dispatch, t, columns]);

  // -----------------------------------------------------------------
  //  redirectToBilled using Next router
  // -----------------------------------------------------------------
  const redirectToBilled = useCallback(() => {
    // build redirectPageObject as in original component
    const redirectPageObject = {
      selectedMonth: currentMonth,
      // ... fill from current selectedMonth, etc.
    };
    dispatch(setLocationObjectState(redirectPageObject));
    dispatch(setBreadcrumbState(true));
    dispatch(setDetailLoadingState(false));
    router.push("/AzureBilledConsumptionDetail");
  }, [dispatch, currentMonth, router]);

  // -----------------------------------------------------------------
  //  RENDER – Basic Azure Invoice UI
  // -----------------------------------------------------------------
  return (
    <IntlProvider locale={isIntlLocalProvider}>
      <div className="azure-invoice-container">
        <h1>{t("azurePlanInvoice.azureInvoice")}</h1>
        
        {/* Display summary data if available */}
        {summaryData && (
          <div className="summary-section">
            <h2>Summary</h2>
            <pre>{JSON.stringify(summaryData, null, 2)}</pre>
          </div>
        )}
        
        {/* Display current month if available */}
        {currentMonth && (
          <div className="month-section">
            <h3>Current Month: {currentMonth.value}</h3>
            {usageMonthDifference && (
              <p>Usage Month Difference: {usageMonthDifference}</p>
            )}
          </div>
        )}
        
        {/* Display total spend */}
        {totalSpend && (
          <div className="spend-section">
            <h3>Total Spend: ${totalSpend}</h3>
          </div>
        )}
        
        {/* Charts section */}
        {trendData && trendData.length > 0 && (
          <div className="charts-section">
            <h3>Trend Chart</h3>
            <BasicGroupedChart 
              data={trendData}
              title="Azure Usage Trend"
            />
          </div>
        )}
        
        {pieChartData && pieChartData.length > 0 && (
          <div className="pie-chart-section">
            <h3>Distribution Chart</h3>
            <BasicPieDoughnutChart 
              data={pieChartData}
              title="Azure Services Distribution"
            />
          </div>
        )}
        
        {/* Action buttons */}
        <div className="actions-section">
          <button
            onClick={redirectToBilled}
            className="btn btn-primary"
          >
            View Billed Usage Details
          </button>
        </div>
        
        {/* Debug Section - API Responses */}
        <div className="debug-section">
          <h3>🔍 API Responses Debug (callAzureInvoiceAPI)</h3>
          
          <div className="debug-item">
            <h4>📅 Invoice Months (invoiceMonths API)</h4>
            <pre>{JSON.stringify(invoiceMonths, null, 2)}</pre>
          </div>
          
          <div className="debug-item">
            <h4>📊 Summary Data (invoiceSummary API)</h4>
            <pre>{JSON.stringify(summaryData, null, 2)}</pre>
          </div>
          
          <div className="debug-item">
            <h4>💳 Credits Data (invoiceCredits API)</h4>
            <pre>{JSON.stringify(creditsData, null, 2)}</pre>
          </div>
          
          <div className="debug-item">
            <h4>📈 Trend Data (invoiceTrend API)</h4>
            <pre>{JSON.stringify(trendData, null, 2)}</pre>
          </div>
          
          <div className="debug-item">
            <h4>🔢 Derived Data</h4>
            <div className="derived-data">
              <p><strong>Total Spend:</strong> {totalSpend}</p>
              <p><strong>Usage Month:</strong> {usageMonth}</p>
              <p><strong>Usage Month Difference:</strong> {usageMonthDifference}</p>
              <p><strong>Top N Expensive Products:</strong></p>
              <pre>{JSON.stringify(topNExpensiveProducts, null, 2)}</pre>
              <p><strong>Pie Chart Data:</strong></p>
              <pre>{JSON.stringify(pieChartData, null, 2)}</pre>
              <p><strong>Invoice Trend Data:</strong></p>
              <pre>{JSON.stringify(invoiceTrendData, null, 2)}</pre>
            </div>
          </div>
        </div>        <style jsx>{`
          .azure-invoice-container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .summary-section,
          .month-section,
          .spend-section,
          .charts-section,
          .pie-chart-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          
          .actions-section {
            margin: 30px 0;
            text-align: center;
          }
          
          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          }
          
          .btn-primary {
            background-color: #007bff;
            color: white;
          }
          
          .btn-primary:hover {
            background-color: #0056b3;
          }
          
          .debug-section {
            margin: 40px 0;
            padding: 20px;
            border: 2px solid #ff6600;
            border-radius: 10px;
            background-color: #f8f9fa;
          }
          
          .debug-section h3 {
            color: #ff6600;
            margin-bottom: 20px;
            font-size: 24px;
          }
          
          .debug-item {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ccc;
            border-radius: 5px;
            background-color: white;
          }
          
          .debug-item h4 {
            color: #007bff;
            margin-bottom: 10px;
            font-size: 18px;
          }
          
          .debug-item pre {
            background-color: #f1f1f1;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          
          .derived-data p {
            margin: 10px 0;
            font-weight: 500;
          }
        `}</style>
      </div>
    </IntlProvider>
  );
}
