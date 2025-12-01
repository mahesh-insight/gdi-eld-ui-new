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
import { Chart } from "@progress/kendo-react-charts";
import {
  useRecoilValue,
  useRecoilState,
  useSetRecoilState,
} from "recoil";

// === imports from your existing component ===

import { BasicGroupedChart } from "@/common/Charts/BasicGroupedChart";
import { BasicPieDoughnutChart } from "@/common/Charts/BasicPieDoughnutChart";
// adjust to your actual file
// plus Panel, Skeleton, DropDownList, Button, etc:
import { Panel, PanelBody } from "@/components/ui/panel";
import { azureInvoiceColumns } from "@/common/commonDataSets";
import { intlLocalProvider, invoiceCreditState } from "@/common/recoil/pageAtoms";

const moment = require("moment");

export default function AzureInvoiceClient({ soldToId, uiProps, initialData }) {
  const router = useRouter();
  const { t } = useTranslation();
  const columns = azureInvoiceColumns(t);

  // ----------------- RECOIL HOOKS (same as before) -----------------
  const setInvoiceCreditState = useSetRecoilState(invoiceCreditState);
  const isIntlLocalProvider = useRecoilValue(intlLocalProvider);
  // ... all your other useRecoilValue/useRecoilState/useSetRecoilState hooks

  // ----------------- LOCAL STATE FROM initialData -----------------
  const [initialInvoiceMonth, setInitialInvoiceMonth] = useState(
    initialData.invoiceMonths || []
  );

  const [usageMonth, setUsageMonth] = useState(initialData.usageMonth);
  const [usageMonthDifference, setUsageMonthDifference] = useState(
    initialData.usageMonthDifference
  );

  const [spendPeriod, setSpendPeriod] = useState(
    initialData.summary?.spendPeriod || {}
  );

  const [topNExpensiveProducts, setTopNExpensiveProducts] = useState(
    initialData.summary?.topNExpensiveProducts?.spend || []
  );

  const [pieChartData, setPieChartData] = useState(
    () =>
      (initialData.summary?.topNExpensiveProducts?.spend || []).map((p) => ({
        category: p.label,
        value: p.value,
        group: p.group,
        label: p.label,
        clickKey: p.clickKey,
      }))
  );

  const [invoiceTrendData, setInvoiceTrendData] = useState(
    initialData.trend?.chartData || []
  );

  // credits from initialData
  useEffect(() => {
    setInvoiceCreditState(initialData.credits?.totalSpend || 0);
  }, [initialData.credits, setInvoiceCreditState]);

  // flags / config from server (instead of localStorage)
  const archeraURL = uiProps?.CCR_ARCHERA_URL || "";
  const flags = uiProps?.flags || {};
  const isClickThruFlag = flags["gdi-357-clickthru"] || false;
  const isArcheraFlag = flags["gdi-1217-archera"] || false;

  // =================================================================
  //  Helper to call the unified /api/azure-invoice route
  // =================================================================
  const callAzureInvoiceApi = useCallback(async (action, payload) => {
    const res = await fetch("/api/azure-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!res.ok) {
      throw new Error(`azure-invoice API "${action}" failed`);
    }
    return res.json();
  }, []);

  // -----------------------------------------------------------------
  //  CLIENT WRAPPERS USING THE SINGLE ROUTE + ACTION
  // -----------------------------------------------------------------

  const fetchInvoiceCredit = useCallback(
    async (value, filter) => {
      const response = await callAzureInvoiceApi("credits", {
        soldToId,
        value,
        filter,
      });
      setInvoiceCreditState(response?.totalSpend);
      return response;
    },
    [soldToId, callAzureInvoiceApi, setInvoiceCreditState]
  );

  const fetchInvoiceMonth = useCallback(
    async (value, filter, isTenantID) => {
      const response = await callAzureInvoiceApi("summary", {
        soldToId,
        value,
        filter,
        isTenantID,
      });

      setSpendPeriod(response?.spendPeriod);
      setTopNExpensiveProducts(response?.topNExpensiveProducts?.spend || []);

      const chartData =
        response?.topNExpensiveProducts?.spend?.map((product) => ({
          category: product?.label,
          value: product?.value,
          group: product?.group,
          label: product?.label,
          clickKey: product?.clickKey,
        })) || [];

      setPieChartData(chartData);
      // also set: selectLists, isReseller, intlLocalProvider, etc. as in old component

      return response;
    },
    [soldToId, callAzureInvoiceApi]
  );

  const fetchInvoiceTrend = useCallback(
    async (filter) => {
      const trendSelection =
        isTrendSelectedPeriodState === "Last 6 Months" ||
        isTrendSelectedPeriodState === "" ||
        isTrendSelectedPeriodState === "Yearly"
          ? 6
          : 12;

      const response = await callAzureInvoiceApi("trend", {
        soldToId,
        months: trendSelection,
        filter,
      });

      setInvoiceTrendData(response?.chartData);
      setIsTrendSelectedState(false);
      return response;
    },
    [
      soldToId,
      callAzureInvoiceApi,
      /* isTrendSelectedPeriodState, setIsTrendSelectedState */
    ]
  );

  const fetchInvoiceMonthSummary = useCallback(
    async (value, filter) => {
      const response = await callAzureInvoiceApi("monthDetail", {
        soldToId,
        value,
        filter,
        monthlyDifference: selectedId === "monthlyDifference",
      });

      setAppliedFilterURLState(response?.thisPageUrl);
      setInvoiceMonthDetail(response?.content);
      setTotalInvoiceMonthDetail(response);
      setProducts(response?.content);
      setErrorState(false);
      return response;
    },
    [
      soldToId,
      selectedId,
      callAzureInvoiceApi,
      setAppliedFilterURLState,
      setInvoiceMonthDetail,
      setTotalInvoiceMonthDetail,
      setProducts,
      setErrorState,
    ]
  );

  // -----------------------------------------------------------------
  //  INITIAL EFFECT – much smaller now
  // -----------------------------------------------------------------
  useEffect(() => {
    document.title = t("azurePlanInvoice.azureInvoice");
    setFileNameState("Azure Invoice");
    setFilterQuery([]);
    setAccountCustomer();
    setInitialLoadingState(false);
    setGridSort(initialSort);
    setViewBilledUsage(true);
    setInitialColumnWidth(
      typeof document !== "undefined"
        ? document.querySelector(".k-grid")
        : null,
      columns
    );
  }, [
    t,
    columns,
    setFileNameState,
    setFilterQuery,
    setAccountCustomer,
    setInitialLoadingState,
    setGridSort,
    setViewBilledUsage,
    setInitialColumnWidth,
  ]);

  // -----------------------------------------------------------------
  //  redirectToBilled using Next router
  // -----------------------------------------------------------------
  const redirectToBilled = () => {
    // build redirectPageObject as in original component
    const redirectPageObject = {
      // ... fill from current selectedMonth, etc.
    };
    setLocationObjectState(redirectPageObject);
    setBreadcrumbState(true);
    setDetailLoadingState(false);
    router.push("/AzureBilledConsumptionDetail");
  };

  // -----------------------------------------------------------------
  //  RENDER – paste your big JSX from AzureInvoiceComponent here
  // -----------------------------------------------------------------
  return (
    <IntlProvider locale={isIntlLocalProvider}>
      {/* your original JSX from AzureInvoiceComponent's return(...) */}
    </IntlProvider>
  );
}
