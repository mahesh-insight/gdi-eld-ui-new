'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { IntlProvider } from '@progress/kendo-react-intl';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { Button } from '@progress/kendo-react-buttons';
import { Checkbox } from '@progress/kendo-react-inputs';
import { Skeleton } from '@progress/kendo-react-indicators';
import { Tooltip } from '@progress/kendo-react-tooltip';
import { SvgIcon } from '@progress/kendo-react-common';
import { infoCircleIcon, downloadIcon } from '@progress/kendo-svg-icons';
import { Chart } from '@progress/kendo-react-charts';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { getInsightThemeColors } from '@/lib/chartColors';
import GridTable from '@/components/GridTable/GridTable';
import { useTranslation } from 'react-i18next';
import {
  fetchConsolidatedSubscriptionsData,
  fetchSubscriptionDetail,
  fetchLicenseDetail,
  fetchHistorySummary,
  fetchHistoryDetail,
} from './actions';
import './subscriptions.css';

// ─── Column definitions ──────────────────────────────────────────────────────

const subscriptionDetailColumns = () => [
  { field: 'productName',       title: 'Product Name',       minWidth: 200 },
  { field: 'subscriptionId',    title: 'Subscription ID',    minWidth: 280 },
  { field: 'quantity',          title: 'Current Quantity',   minWidth: 140 },
  { field: 'CurrentUnitPrice',  title: 'Current Unit Price', minWidth: 150, format: '{0:c2}' },
  { field: 'commitmentEndDate', title: 'Anniversary Date',   minWidth: 160, format: '{0:yyyy-MM-dd}' },
  { field: 'autoRenewEnabled',  title: 'Auto Renew',         minWidth: 120 },
  { field: 'termDuration',      title: 'Commitment Period',  minWidth: 150 },
  { field: 'billingType',       title: 'Billing Type',       minWidth: 130 },
  { field: 'billingCycle',      title: 'Billing Frequency',  minWidth: 150 },
];

const licenseSummaryColumns = () => [
  { field: 'offerName',             title: 'Product Name',         minWidth: 220 },
  { field: 'offerID',               title: 'Offer ID',             minWidth: 300 },
  { field: 'licenseQuantity',       title: 'License Quantity',     minWidth: 150 },
  { field: 'subscriptionQuantity',  title: 'Subscription Quantity',minWidth: 180 },
  { field: 'status',                title: 'Subscription Status',  minWidth: 160 },
  { field: 'tenantID',              title: 'Tenant ID',            minWidth: 300 },
  { field: 'tenantName',            title: 'Customer Name',        minWidth: 220 },
];

const historyColumns = () => [
  { field: 'productName',        title: 'Product Name',       minWidth: 220 },
  { field: 'offerId',            title: 'Offer ID',           minWidth: 300 },
  { field: 'commitmentPeriod',   title: 'Commitment Period',  minWidth: 150 },
  { field: 'changeDate',         title: 'Changed Date',       minWidth: 160, format: '{0:yyyy-MM-dd}' },
  { field: 'quantity',           title: 'Changed Quantity',   minWidth: 150 },
  { field: 'quantityChange',     title: 'Delta',              minWidth: 100 },
  { field: 'subscriptionStatus', title: 'Subscription Status',minWidth: 170 },
  { field: 'tenantId',           title: 'Tenant ID',          minWidth: 300 },
  { field: 'customerName',       title: 'Customer Name',      minWidth: 220 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSelectList(selectLists, name) {
  return selectLists?.find(l => l.name === name)?.items || [];
}

function sumLicenses(licenseContent = []) {
  return licenseContent.reduce((sum, row) => sum + (row.licenseQuantity || 0), 0);
}

function processHistoryChartData(chartData = []) {
  return chartData.map(d => ({ ...d, group: new Date(d.group) }));
}

function processExpiringChartData(countPeriod = []) {
  return countPeriod.map(p => ({
    label: p.period.trim(),
    value: p.totalCount,
    color: p.count?.[0]?.chartColor || '#AE0A46',
    group: 'Renewal',
  }));
}

function lookbackFromPeriod(period) {
  return period === 'Last 12 Months' ? 12 : 6;
}

const STATUS_DEFAULT = { label: 'Active Subscriptions Only', value: 'Active' };
const PERIOD_DEFAULT = 'Last 12 Months';

// ─── Component ───────────────────────────────────────────────────────────────

export default function SubscriptionsClient({ mode = 'client-side', initialData = null, userContext = null }) {
  const { t } = useTranslation();

  // ─── soldToId (not needed for subscription API calls, kept for pattern parity) ─
  const [soldToId, setSoldToId] = useState(userContext?.soldToId || '');
  useEffect(() => {
    if (!soldToId && typeof window !== 'undefined') {
      try {
        const p = localStorage.getItem('persist:ccr-auth');
        if (p) {
          let lr = JSON.parse(p).loginResponse;
          if (typeof lr === 'string') lr = JSON.parse(lr);
          if (typeof lr === 'string') lr = JSON.parse(lr);
          const id = lr?.userProfile?.defaultContext?.[0]?.soldToId || lr?.soldToId;
          if (id) setSoldToId(id);
        }
      } catch { /**/ }
    }
  }, [soldToId]);

  // ─── Global status filter ─────────────────────────────────────────────────
  const [statusFilter, setStatusFilter]   = useState(STATUS_DEFAULT);
  const [statusOptions, setStatusOptions] = useState([STATUS_DEFAULT]);

  // ─── Summary / KPI data ───────────────────────────────────────────────────
  const [topNProducts,  setTopNProducts]  = useState(initialData?.summary?.topNProducts || []);
  const [expiringChart, setExpiringChart] = useState([]);
  const [ccxLink,       setCcxLink]       = useState(initialData?.summary?.ccxJumpLink || '');
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalSubs,     setTotalSubs]     = useState(0);
  const [totalLicenses, setTotalLicenses] = useState(0);

  // ─── Summary extras ───────────────────────────────────────────────────────
  const [isReseller,       setIsReseller]       = useState(false);
  const [offerOptions,     setOfferOptions]     = useState([]);
  const [tenantOptions,    setTenantOptions]    = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // ─── Tab 1: Subscription Details ─────────────────────────────────────────
  const [subData,            setSubData]            = useState(initialData?.subscriptions?.content || []);
  const [subTotal,           setSubTotal]           = useState(initialData?.subscriptions?.totalElements || 0);
  const [subDataState,       setSubDataState]       = useState({ skip: 0, take: 20 });
  const [filterProduct,      setFilterProduct]      = useState([]);
  const [filterRenewal,      setFilterRenewal]      = useState([]);
  const [filterAutoRenew,    setFilterAutoRenew]    = useState([]);
  const [renewalOptions,     setRenewalOptions]     = useState([]);
  const [autoRenewOptions,   setAutoRenewOptions]   = useState([]);
  const [isLoadingSubGrid,   setIsLoadingSubGrid]   = useState(false);

  // ─── Tab 2: License Summary ───────────────────────────────────────────────
  const [licData,           setLicData]           = useState(initialData?.licenses?.content || []);
  const [licTotal,          setLicTotal]          = useState(initialData?.licenses?.totalElements || 0);
  const [licDataState,      setLicDataState]      = useState({ skip: 0, take: 20 });
  const [filterLicProduct,  setFilterLicProduct]  = useState([]);
  const [isLoadingLicGrid,  setIsLoadingLicGrid]  = useState(false);

  // ─── Tab 3: Subscription History ─────────────────────────────────────────
  const [historyChartData,  setHistoryChartData]  = useState([]);
  const [historyGridData,   setHistoryGridData]   = useState([]);
  const [historyGridTotal,  setHistoryGridTotal]  = useState(0);
  const [histDataState,     setHistDataState]     = useState({ skip: 0, take: 20 });
  const [histProduct,       setHistProduct]       = useState([]);
  const [histOfferOptions,  setHistOfferOptions]  = useState([]);
  const [histCommitment,    setHistCommitment]    = useState({ label: 'Monthly', value: 'Monthly' });
  const [commitmentOpts,    setCommitmentOpts]    = useState([{ label: 'Monthly', value: 'Monthly' }, { label: 'Annual', value: 'Annual' }]);
  const [showChangedOnly,   setShowChangedOnly]   = useState(false);
  const [histPeriod,        setHistPeriod]        = useState(PERIOD_DEFAULT);
  const [isLoadingHistory,  setIsLoadingHistory]  = useState(false);
  const [isLoadingHistGrid, setIsLoadingHistGrid] = useState(false);

  // ─── Global loading ───────────────────────────────────────────────────────
  // Start loading if client-side mode, OR if SSR mode was used but no useful data arrived.
  const [loading,        setLoading]        = useState(mode !== 'ssr' || !initialData?.summary);
  const [isApplyingSub,  setIsApplyingSub]  = useState(false);
  const [isApplyingLic,  setIsApplyingLic]  = useState(false);
  const [selectedTab,    setSelectedTab]    = useState(0);

  const historyLoaded  = useRef(false);
  const hasInitialized = useRef(false);

  // ─── Process summary data into state ────────────────────────────────────
  const applySummary = useCallback((summary) => {
    if (!summary) return;
    setCcxLink(summary.ccxJumpLink || '');
    setTopNProducts(summary.topNProducts || []);
    setExpiringChart(processExpiringChartData(summary.expiring?.countPeriod || []));
    setIsReseller(summary.isReseller || false);
    // KPI totals directly from summary response
    setTotalProducts(summary.totals?.find(t => t.label === 'Products')?.value || 0);
    setTotalSubs(summary.totals?.find(t => t.label === 'Subscriptions')?.value || 0);
    setTotalLicenses(summary.totals?.find(t => t.label === 'Licenses')?.value || 0);

    const statusList = getSelectList(summary.selectLists, 'Status');
    if (statusList.length) setStatusOptions(statusList.map(i => ({ label: i.label, value: i.value })));

    const offerList = getSelectList(summary.selectLists, 'offername');
    if (offerList.length) setOfferOptions(offerList.map(i => ({ label: i.label, value: i.value })));

    // No "All" option — placeholder text handles that
    const renewalList = getSelectList(summary.selectLists, 'renewalperiod');
    if (renewalList.length) setRenewalOptions(renewalList.map(i => ({ label: i.label, value: i.value })));

    const arList = getSelectList(summary.selectLists, 'autorenew');
    if (arList.length) setAutoRenewOptions(arList.map(i => ({ label: i.label, value: i.value })));

    // Tenant options for resellers — exclude the "All" placeholder item
    const tenantList = getSelectList(summary.selectLists, 'tenantId');
    setTenantOptions(tenantList.filter(i => i.value !== 'All').map(i => ({ label: i.label, value: i.value })));
  }, []);

  // ─── Apply SSR initial data ──────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'ssr' || !initialData) return;
    applySummary(initialData.summary);
    if (initialData.subscriptions) {
      setSubData(initialData.subscriptions.content || []);
      setSubTotal(initialData.subscriptions.totalElements || 0);
    }
    if (initialData.licenses) {
      setLicData(initialData.licenses.content || []);
      setLicTotal(initialData.licenses.totalElements || 0);
    }
    setLoading(false);
  }, [mode, initialData, applySummary]);

  // ─── Client-side init ────────────────────────────────────────────────────
  // Runs in client-side mode, OR when mode=ssr but SSR returned no useful data.
  useEffect(() => {
    if (mode === 'ssr' && initialData?.summary) return;
    if (!soldToId) return; // wait for soldToId from localStorage
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchConsolidatedSubscriptionsData(soldToId, statusFilter.value);
        if (res.error) return;
        const d = res.data;
        applySummary(d.summary);
        if (d.subscriptions) {
          setSubData(d.subscriptions.content || []);
          setSubTotal(d.subscriptions.totalElements || 0);
        }
        if (d.licenses) {
          setLicData(d.licenses.content || []);
          setLicTotal(d.licenses.totalElements || 0);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, soldToId, statusFilter.value, applySummary]);

  // ─── Status filter change (global reload) ───────────────────────────────
  const handleStatusChange = useCallback(async (e) => {
    const newStatus = e.value;
    setStatusFilter(newStatus);
    setFilterProduct([]); setFilterRenewal([]); setFilterAutoRenew([]);
    setFilterLicProduct([]);
    setSelectedCustomer(null);
    setSubDataState({ skip: 0, take: 20 });
    setLicDataState({ skip: 0, take: 20 });
    historyLoaded.current = false;
    setLoading(true);
    try {
      const res = await fetchConsolidatedSubscriptionsData(soldToId, newStatus.value);
      if (res.error) return;
      const d = res.data;
      applySummary(d.summary);
      if (d.subscriptions) {
        setSubData(d.subscriptions.content || []);
        setSubTotal(d.subscriptions.totalElements || 0);
      }
      if (d.licenses) {
        setLicData(d.licenses.content || []);
        setLicTotal(d.licenses.totalElements || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [soldToId, applySummary]);

  // ─── Customer (tenant) filter change ────────────────────────────────────
  const handleCustomerChange = useCallback(async (e) => {
    const customer = e.value;
    setSelectedCustomer(customer);
    setFilterProduct([]); setFilterRenewal([]); setFilterAutoRenew([]);
    setFilterLicProduct([]);
    setSubDataState({ skip: 0, take: 20 });
    setLicDataState({ skip: 0, take: 20 });
    setIsLoadingSubGrid(true);
    try {
      const [subRes, licRes] = await Promise.all([
        fetchSubscriptionDetail(soldToId, {
          status: statusFilter.value,
          tenantId: customer?.value,
          page: 0, size: 20,
        }),
        fetchLicenseDetail(soldToId, {
          status: statusFilter.value,
          tenantId: customer?.value,
          page: 0, size: 100,
        }),
      ]);
      if (!subRes.error) {
        setSubData(subRes.data?.content || []);
        setSubTotal(subRes.data?.totalElements || 0);
      }
      if (!licRes.error) {
        setLicData(licRes.data?.content || []);
        setLicTotal(licRes.data?.totalElements || 0);
      }
    } finally {
      setIsLoadingSubGrid(false);
    }
  }, [soldToId, statusFilter.value]);

  // ─── Tab 1: Apply subscription filters ──────────────────────────────────
  const handleApplySubFilters = useCallback(async () => {
    setIsApplyingSub(true);
    setSubDataState({ skip: 0, take: 20 });
    try {
      const res = await fetchSubscriptionDetail(soldToId, {
        status: statusFilter.value,
        productNames: filterProduct.length ? filterProduct.map(i => i.value) : undefined,
        renewalPeriods: filterRenewal.length ? filterRenewal.map(i => i.value) : undefined,
        autoRenews: filterAutoRenew.length ? filterAutoRenew.map(i => i.value) : undefined,
        tenantId: selectedCustomer?.value,
        page: 0, size: 20,
      });
      if (!res.error) {
        setSubData(res.data.content || []);
        setSubTotal(res.data.totalElements || 0);
      }
    } finally {
      setIsApplyingSub(false);
    }
  }, [soldToId, statusFilter.value, filterProduct, filterRenewal, filterAutoRenew, selectedCustomer]);

  // ─── Tab 1: Grid page change ─────────────────────────────────────────────
  const handleSubDataStateChange = useCallback(async (e) => {
    const ds = e.dataState;
    setSubDataState(ds);
    setIsLoadingSubGrid(true);
    try {
      const res = await fetchSubscriptionDetail(soldToId, {
        status: statusFilter.value,
        productNames: filterProduct.length ? filterProduct.map(i => i.value) : undefined,
        renewalPeriods: filterRenewal.length ? filterRenewal.map(i => i.value) : undefined,
        autoRenews: filterAutoRenew.length ? filterAutoRenew.map(i => i.value) : undefined,
        tenantId: selectedCustomer?.value,
        page: ds.skip / ds.take,
        size: ds.take,
      });
      if (!res.error) {
        setSubData(res.data.content || []);
        setSubTotal(res.data.totalElements || 0);
      }
    } finally {
      setIsLoadingSubGrid(false);
    }
  }, [soldToId, statusFilter.value, filterProduct, filterRenewal, filterAutoRenew, selectedCustomer]);

  // ─── Tab 2: Apply license filters ────────────────────────────────────────
  const handleApplyLicFilters = useCallback(async () => {
    setIsApplyingLic(true);
    setLicDataState({ skip: 0, take: 20 });
    try {
      const res = await fetchLicenseDetail(soldToId, {
        status: statusFilter.value,
        productNames: filterLicProduct.length ? filterLicProduct.map(i => i.value) : undefined,
        tenantId: selectedCustomer?.value,
        page: 0, size: 20,
      });
      if (!res.error) {
        setLicData(res.data.content || []);
        setLicTotal(res.data.totalElements || 0);
      }
    } finally {
      setIsApplyingLic(false);
    }
  }, [soldToId, statusFilter.value, filterLicProduct, selectedCustomer]);

  // ─── Tab 2: Grid page change ─────────────────────────────────────────────
  const handleLicDataStateChange = useCallback(async (e) => {
    const ds = e.dataState;
    setLicDataState(ds);
    setIsLoadingLicGrid(true);
    try {
      const res = await fetchLicenseDetail(soldToId, {
        status: statusFilter.value,
        productNames: filterLicProduct.length ? filterLicProduct.map(i => i.value) : undefined,
        tenantId: selectedCustomer?.value,
        page: ds.skip / ds.take,
        size: ds.take,
      });
      if (!res.error) {
        setLicData(res.data.content || []);
        setLicTotal(res.data.totalElements || 0);
      }
    } finally {
      setIsLoadingLicGrid(false);
    }
  }, [soldToId, statusFilter.value, filterLicProduct, selectedCustomer]);

  // ─── Tab 3: Load history data ────────────────────────────────────────────
  const loadHistoryData = useCallback(async (opts = {}) => {
    const {
      status = statusFilter.value,
      commitment = histCommitment.value,
      products = histProduct,
      period = histPeriod,
      changed = showChangedOnly,
      page = 0,
      size = 20,
      gridOnly = false,
    } = opts;

    const filters = {
      status,
      commitmentPeriod: commitment,
      productNames: products.length ? products.map(i => i.value) : undefined,
      lookbackMonths: lookbackFromPeriod(period),
      includeUnchanged: !changed,
    };

    if (!gridOnly) {
      setIsLoadingHistory(true);
      try {
        const [summaryRes, detailRes] = await Promise.all([
          fetchHistorySummary(soldToId, filters),
          fetchHistoryDetail(soldToId, { ...filters, page, size }),
        ]);
        if (!summaryRes.error) {
          const cd = summaryRes.data?.changes?.chartData || [];
          setHistoryChartData(processHistoryChartData(cd));
          // Refresh commitment options from selectLists
          const cpList = summaryRes.data?.selectLists?.find(l => l.name === 'CommitmentPeriod');
          if (cpList?.items?.length) {
            setCommitmentOpts(cpList.items.map(i => ({ label: i.label, value: i.value })));
          }
          // Refresh offer options for history product filter
          const offerList = summaryRes.data?.selectLists?.find(l => l.name === 'offerName');
          if (offerList?.items?.length) {
            setHistOfferOptions(offerList.items.map(i => ({ label: i.label, value: i.value })));
          }
        }
        if (!detailRes.error) {
          setHistoryGridData(detailRes.data?.content || []);
          setHistoryGridTotal(detailRes.data?.totalElements || 0);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    } else {
      setIsLoadingHistGrid(true);
      try {
        const res = await fetchHistoryDetail(soldToId, { ...filters, page, size });
        if (!res.error) {
          setHistoryGridData(res.data?.content || []);
          setHistoryGridTotal(res.data?.totalElements || 0);
        }
      } finally {
        setIsLoadingHistGrid(false);
      }
    }
  }, [soldToId, statusFilter.value, histCommitment.value, histProduct, histPeriod, showChangedOnly]);

  // ─── Tab select ───────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(async (e) => {
    const tab = e.selected;
    setSelectedTab(tab);
    if (tab === 2 && !historyLoaded.current) {
      historyLoaded.current = true;
      await loadHistoryData();
    }
  }, [loadHistoryData]);

  // ─── Tab 3: Apply history filters ─────────────────────────────────────────
  const handleApplyHistoryFilters = useCallback(async () => {
    setHistDataState({ skip: 0, take: 20 });
    historyLoaded.current = true;
    await loadHistoryData({ page: 0 });
  }, [loadHistoryData]);

  // ─── Tab 3: Grid page change ─────────────────────────────────────────────
  const handleHistDataStateChange = useCallback(async (e) => {
    const ds = e.dataState;
    setHistDataState(ds);
    await loadHistoryData({ page: ds.skip / ds.take, size: ds.take, gridOnly: true });
  }, [loadHistoryData]);

  // ─── Tab 3: Period change ─────────────────────────────────────────────────
  const handleHistPeriodChange = useCallback(async (period) => {
    setHistPeriod(period);
    await loadHistoryData({ period });
  }, [loadHistoryData]);

  // ─── Locale ───────────────────────────────────────────────────────────────
  const locale = useMemo(() => {
    if (typeof window !== 'undefined') {
      return navigator.language || 'en-US';
    }
    return 'en-US';
  }, []);

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderTopNChart = (fullWidth = false) => (
    topNProducts.length > 0 ? (
      <Chart onRefresh={() => {}}>
        <BasicGroupedChart
          chartType="bar"
          title="Top 5 Licensed Products"
          data={topNProducts}
          categoryField="label"
          valueField="value"
          showLabels={true}
          showCategoryInLabels={true}
          legendPosition="bottom"
          legendVisible={false}
          tooltipFormat="n0"
          valueFormat="n0"
          labelFormat="n0"
          locale={locale}
        />
      </Chart>
    ) : (
      <div className="sub-no-data">No product data available.</div>
    )
  );

  const renderExpiringChart = () => (
    expiringChart.length > 0 ? (
      <Chart onRefresh={() => {}}>
        <BasicGroupedChart
          chartType="column"
          title="Coming up for Renewal"
          data={expiringChart}
          categoryField="label"
          valueField="value"
          useColors={true}
          showLabels={true}
          showCategoryInLabels={false}
          legendPosition="bottom"
          legendVisible={true}
          tooltipFormat="n0"
          valueFormat="n0"
          labelFormat="n0"
          locale={locale}
        />
      </Chart>
    ) : (
      <div className="sub-no-data">No renewal data available.</div>
    )
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <IntlProvider locale={locale}>
      <div className="sub-page">
        <div className="sub-container">

          {/* ── Page Header ── */}
          <div className="sub-header">
            <div className="sub-header-top">
              <div className="sub-title-area">
                <h1 className="sub-title">M365 | Modern Work Subscriptions</h1>
                <p className="sub-note">
                  <SvgIcon icon={infoCircleIcon} size="small" style={{ color: '#007bff', verticalAlign: 'middle', marginRight: 4 }} />
                  Subscription reporting is updated nightly and may not reflect changes made in the last 24 hours.
                  {ccxLink && (
                    <> Changes to subscriptions can be made here on <a href={ccxLink} target="_blank" rel="noreferrer" className="sub-link">buy.insight.com</a>.</>
                  )}
                </p>
              </div>

              {/* KPI cards */}
              <div className="sub-kpi-row">
                {loading ? (
                  <>
                    <Skeleton style={{ width: 120, height: 60 }} />
                    <Skeleton style={{ width: 140, height: 60 }} />
                    <Skeleton style={{ width: 130, height: 60 }} />
                  </>
                ) : (
                  <>
                    <div className="sub-kpi sub-kpi-pink">
                      <div className="sub-kpi-label">Products</div>
                      <div className="sub-kpi-value">{totalProducts.toLocaleString()}</div>
                    </div>
                    <div className="sub-kpi sub-kpi-pink">
                      <div className="sub-kpi-label">Subscriptions</div>
                      <div className="sub-kpi-value">{totalSubs.toLocaleString()}</div>
                    </div>
                    <div className="sub-kpi sub-kpi-blue">
                      <div className="sub-kpi-label">Licenses</div>
                      <div className="sub-kpi-value">{totalLicenses.toLocaleString()}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status + Customer filters */}
            <div className="sub-status-row">
              <label className="sub-status-label">Status</label>
              <DropDownList
                data={statusOptions}
                textField="label"
                dataItemKey="value"
                value={statusFilter}
                onChange={handleStatusChange}
                style={{ width: 240 }}
                disabled={loading}
              />
              {isReseller && tenantOptions.length > 0 && (
                <>
                  <label className="sub-status-label" style={{ marginLeft: 16 }}>Customer Name</label>
                  <DropDownList
                    data={tenantOptions}
                    textField="label"
                    dataItemKey="value"
                    value={selectedCustomer}
                    onChange={handleCustomerChange}
                    defaultItem={{ label: 'All Customers', value: null }}
                    style={{ width: 260 }}
                    disabled={loading}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <TabStrip selected={selectedTab} onSelect={handleTabSelect} className="tabstrip sub-tabstrip">

            {/* ══════════════════════════════════════════
                Tab 1 – Subscription Details
            ══════════════════════════════════════════ */}
            <TabStripTab title="Subscription Details">
              <div className="sub-tab-content">

                {/* Two charts side by side */}
                {loading ? (
                  <div className="sub-charts-row">
                    <Skeleton style={{ flex: 1, height: 320 }} />
                    <Skeleton style={{ flex: 1, height: 320 }} />
                  </div>
                ) : (
                  <div className="sub-charts-row">
                    <div className="sub-chart-half">{renderTopNChart()}</div>
                    <div className="sub-chart-half">{renderExpiringChart()}</div>
                  </div>
                )}

                {/* Filters */}
                <div className="sub-filters-row">
                  <div className="sub-filter-group">
                    <label>Product Name</label>
                    <MultiSelect
                      data={offerOptions}
                      textField="label"
                      dataItemKey="value"
                      value={filterProduct}
                      onChange={e => setFilterProduct(e.value)}
                      placeholder="All"
                      disabled={isApplyingSub || loading}
                    />
                  </div>
                  <div className="sub-filter-group">
                    <label>Renewal Range</label>
                    <MultiSelect
                      data={renewalOptions}
                      textField="label"
                      dataItemKey="value"
                      value={filterRenewal}
                      onChange={e => setFilterRenewal(e.value)}
                      placeholder="All"
                      disabled={isApplyingSub || loading}
                    />
                  </div>
                  <div className="sub-filter-group">
                    <label>Auto Renew</label>
                    <MultiSelect
                      data={autoRenewOptions}
                      textField="label"
                      dataItemKey="value"
                      value={filterAutoRenew}
                      onChange={e => setFilterAutoRenew(e.value)}
                      placeholder="All"
                      disabled={isApplyingSub || loading}
                    />
                  </div>
                  <div className="sub-filter-actions">
                    <Button themeColor="primary" onClick={handleApplySubFilters} disabled={isApplyingSub || loading}>
                      Apply Filters
                    </Button>
                    <Button fillMode="flat" className="sub-download-btn" title="Download">
                      <SvgIcon icon={downloadIcon} size="medium" />
                    </Button>
                  </div>
                </div>

                {/* Subscription grid */}
                {(loading || isApplyingSub) ? (
                  Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} style={{ width: '100%', height: 36, marginBottom: 4 }} />
                  ))
                ) : (
                  <GridTable
                    name="subscriptionDetail"
                    data={{ data: subData, total: subTotal }}
                    columns={subscriptionDetailColumns()}
                    loading={isLoadingSubGrid || isApplyingSub}
                    sortable
                    pageable
                    dataState={subDataState}
                    dataStateChange={handleSubDataStateChange}
                    setWidth={w => w}
                  />
                )}
              </div>
            </TabStripTab>

            {/* ══════════════════════════════════════════
                Tab 2 – License Summary
            ══════════════════════════════════════════ */}
            <TabStripTab title="License Summary">
              <div className="sub-tab-content">

                {/* Full-width chart */}
                {loading ? (
                  <Skeleton style={{ width: '100%', height: 320, marginBottom: 24 }} />
                ) : (
                  <div className="sub-chart-full">{renderTopNChart(true)}</div>
                )}

                {/* License filters */}
                <div className="sub-filters-row">
                  <div className="sub-filter-group">
                    <label>Product Name</label>
                    <MultiSelect
                      data={offerOptions}
                      textField="label"
                      dataItemKey="value"
                      value={filterLicProduct}
                      onChange={e => setFilterLicProduct(e.value)}
                      placeholder="All"
                      disabled={isApplyingLic || loading}
                    />
                  </div>
                  <div className="sub-filter-actions">
                    <Button themeColor="primary" onClick={handleApplyLicFilters} disabled={isApplyingLic || loading}>
                      Apply Filters
                    </Button>
                    <Button fillMode="flat" className="sub-download-btn" title="Download">
                      <SvgIcon icon={downloadIcon} size="medium" />
                    </Button>
                  </div>
                </div>

                {/* License grid */}
                {(loading || isApplyingLic) ? (
                  Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} style={{ width: '100%', height: 36, marginBottom: 4 }} />
                  ))
                ) : (
                  <GridTable
                    name="licenseSummary"
                    data={{ data: licData, total: licTotal }}
                    columns={licenseSummaryColumns()}
                    loading={isLoadingLicGrid || isApplyingLic}
                    sortable
                    pageable
                    dataState={licDataState}
                    dataStateChange={handleLicDataStateChange}
                    setWidth={w => w}
                  />
                )}
              </div>
            </TabStripTab>

            {/* ══════════════════════════════════════════
                Tab 3 – Subscription History
            ══════════════════════════════════════════ */}
            <TabStripTab title="Subscription History">
              <div className="sub-tab-content">

                {/* History filters */}
                <div className="sub-filters-row sub-history-filters">
                  <div className="sub-filter-group">
                    <label>Product Name</label>
                    <MultiSelect
                      data={histOfferOptions}
                      textField="label"
                      dataItemKey="value"
                      value={histProduct}
                      onChange={e => setHistProduct(e.value)}
                      placeholder="All"
                      disabled={isLoadingHistory}
                    />
                  </div>
                  <div className="sub-filter-group">
                    <label>Commitment Period</label>
                    <DropDownList
                      data={commitmentOpts}
                      textField="label"
                      dataItemKey="value"
                      value={histCommitment}
                      onChange={e => setHistCommitment(e.value)}
                      disabled={isLoadingHistory}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="sub-filter-checkbox">
                    <Checkbox
                      value={showChangedOnly}
                      onChange={e => setShowChangedOnly(e.value)}
                      label="Show changed subscriptions only"
                    />
                  </div>
                  <div className="sub-filter-actions">
                    <Button themeColor="primary" onClick={handleApplyHistoryFilters} disabled={isLoadingHistory}>
                      Apply Filters
                    </Button>
                  </div>
                </div>

                {/* Subscription Change Over Time chart */}
                {isLoadingHistory ? (
                  <Skeleton style={{ width: '100%', height: 380, marginBottom: 16 }} />
                ) : (
                  <div className="sub-chart-full">
                    <ChartTitleAndButtons
                      title="Subscription Change Over Time"
                      dropDownList={true}
                      pageType="invoice"
                      onPeriodChange={handleHistPeriodChange}
                      selectedPeriod={histPeriod}
                    />
                    {historyChartData.length > 0 ? (
                      <Chart onRefresh={() => {}} seriesColors={getInsightThemeColors()}>
                        <BasicGroupedChart
                          chartType="line"
                          data={historyChartData}
                          categoryField="group"
                          categoryFormat="yyyy-MM-dd"
                          valueField="value"
                          valueFormat="n0"
                          groupedByField="label"
                          legendPosition="bottom"
                          tooltipFormat="n0"
                          showLabels={false}
                          locale={locale}
                        />
                      </Chart>
                    ) : (
                      <div className="sub-no-data">Select filters and click Apply Filters to load history.</div>
                    )}
                  </div>
                )}

                {/* Download button row */}
                <div className="sub-history-download-row">
                  <Button fillMode="flat" className="sub-download-btn" title="Download">
                    <SvgIcon icon={downloadIcon} size="medium" />
                  </Button>
                </div>

                {/* History grid */}
                {isLoadingHistory ? (
                  Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} style={{ width: '100%', height: 36, marginBottom: 4 }} />
                  ))
                ) : (
                  <GridTable
                    name="subscriptionHistory"
                    data={{ data: historyGridData, total: historyGridTotal }}
                    columns={historyColumns()}
                    loading={isLoadingHistGrid || isLoadingHistory}
                    sortable
                    pageable
                    dataState={histDataState}
                    dataStateChange={handleHistDataStateChange}
                    setWidth={w => w}
                  />
                )}
              </div>
            </TabStripTab>

          </TabStrip>
        </div>
      </div>
    </IntlProvider>
  );
}
