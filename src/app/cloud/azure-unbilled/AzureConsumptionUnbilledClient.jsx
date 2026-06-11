'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Skeleton } from '@progress/kendo-react-indicators';
import { IntlProvider } from '@progress/kendo-react-intl';
import { Breadcrumb } from '@progress/kendo-react-layout';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { Tooltip } from '@progress/kendo-react-tooltip';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { Button } from '@progress/kendo-react-buttons';
import { SvgIcon } from '@progress/kendo-react-common';
import { infoCircleIcon } from '@progress/kendo-svg-icons';
import { Chart } from '@progress/kendo-react-charts';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { getInsightThemeColors } from '@/lib/chartColors';
import { formatCurrency } from '@/lib/utils';
import GridTable from '@/components/GridTable/GridTable';
import { useTranslation } from 'react-i18next';
import { azureDailyConsumptionColumns, azureEntitlementSummaryColumns } from '@/common/commonDataSets';
import {
  fetchUnbilledMonths,
  fetchConsolidatedUnbilledData,
  fetchUnbilledDailyData,
  fetchUnbilledEntitlementData,
} from './actions';
import './azure-unbilled.css';

const CHART_OPTIONS = [
  { type: 'column', icon: 'chartColumnStackedIcon', title: 'Column Chart' },
  { type: 'line',   icon: 'chartLineStackedIcon',   title: 'Line Chart'   },
  { type: 'area',   icon: 'chartAreaStackedIcon',   title: 'Area Chart'   },
];

export default function AzureConsumptionUnbilledClient({
  mode = 'client-side',
  initialData = null,
  userContext = null,
}) {
  const { t } = useTranslation();

  // ─── Resolve soldToId ────────────────────────────────────────────────────
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

  // ─── Core data state ──────────────────────────────────────────────────────
  const [months,         setMonths]         = useState(initialData?.months || []);
  const [selectedMonth,  setSelectedMonth]  = useState(
    initialData?.months?.[0] || null
  );
  const [estimatedTotal, setEstimatedTotal] = useState(initialData?.totalsResponse?.totalSpend || 0);

  // ─── Tab state ────────────────────────────────────────────────────────────
  const [selectedTab, setSelectedTab] = useState(0);

  // ─── Daily Consumption tab state ─────────────────────────────────────────
  const [dailySummary,    setDailySummary]    = useState(initialData?.dailySummaryResponse || null);
  const [dailyChartData,  setDailyChartData]  = useState([]);
  const [dailyGridData,   setDailyGridData]   = useState(initialData?.dailyGridResponse?.content || []);
  const [dailyGridTotal,  setDailyGridTotal]  = useState(initialData?.dailyGridResponse?.totalElements || 0);
  const [dailyDataState,  setDailyDataState]  = useState({ skip: 0, take: 20 });

  const [filterAzureSub,  setFilterAzureSub]  = useState([]);
  const [filterService,   setFilterService]   = useState([]);
  const [lastApplied,     setLastApplied]     = useState({ sub: [], svc: [] });

  // ─── Azure Subscription Summary tab state ────────────────────────────────
  const [entSummary,        setEntSummary]        = useState(initialData?.entSummaryResponse || null);
  const [entChartData,      setEntChartData]       = useState([]);
  const [entTrendData,      setEntTrendData]       = useState([]);
  const [entGridData,       setEntGridData]        = useState(initialData?.entGridResponse?.content || []);
  const [entGridTotal,      setEntGridTotal]       = useState(initialData?.entGridResponse?.totalElements || 0);
  const [entDataState,      setEntDataState]       = useState({ skip: 0, take: 20 });
  const [selectedEntSub,    setSelectedEntSub]     = useState([]);
  const [entSubOptions,     setEntSubOptions]      = useState([]);
  const [trendingChartType, setTrendingChartType]  = useState('column');
  const [trendingPeriod,    setTrendingPeriod]     = useState('Last 6 Months');

  // ─── Loading states ───────────────────────────────────────────────────────
  const [loading,           setLoading]           = useState(mode !== 'ssr');
  const [isApplyingDaily,   setIsApplyingDaily]   = useState(false);
  const [isLoadingEntTab,   setIsLoadingEntTab]   = useState(false);
  const [isLoadingTrend,    setIsLoadingTrend]    = useState(false);
  const [isLoadingDailyGrid, setIsLoadingDailyGrid] = useState(false);
  const [isLoadingEntGrid,  setIsLoadingEntGrid]  = useState(false);

  const hasInitialized = useRef(false);
  const entTabLoaded   = useRef(false);

  // ─── Breadcrumb ───────────────────────────────────────────────────────────
  const breadcrumbData = [
    { id: 'invoices', text: 'Invoice Reporting', url: '/invoices' },
    { id: 'unbilled', text: 'Unbilled Usage' },
  ];

  // ─── Derived filter options from daily summary ────────────────────────────
  const dailyFilterOptions = useMemo(() => {
    if (!dailySummary?.selectLists) return { subs: [], services: [] };
    const entList = dailySummary.selectLists.find(l => l.name === 'entitlementid');
    const svcList = dailySummary.selectLists.find(l => l.name === 'metercategory');
    return {
      subs:     entList?.items || [],
      services: svcList?.items || [],
    };
  }, [dailySummary]);

  const isDailyFiltersUnchanged = useMemo(() => (
    JSON.stringify(filterAzureSub) === JSON.stringify(lastApplied.sub) &&
    JSON.stringify(filterService)  === JSON.stringify(lastApplied.svc)
  ), [filterAzureSub, filterService, lastApplied]);

  // ─── Process daily chart: convert "Jun 01" strings to Date ───────────────
  const processDailyChart = useCallback((chartData, month) => {
    if (!chartData?.length || !month) return [];
    const year = month.slice(0, 4);
    return chartData.map(item => ({
      ...item,
      group: new Date(`${year} ${item.group}`),
    }));
  }, []);

  // ─── Process entitlement trend: group is ISO date string ─────────────────
  const processEntTrend = useCallback((trendResponse) => {
    const arr = trendResponse?.chartData;
    if (!Array.isArray(arr)) return [];
    return arr.map(item => ({
      ...item,
      group: new Date(item.group),
    }));
  }, []);

  // ─── Apply SSR initial data ───────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'ssr' || !initialData) return;

    // Daily chart
    if (initialData.dailySummaryResponse?.spendTrend?.chartData) {
      setDailyChartData(
        processDailyChart(
          initialData.dailySummaryResponse.spendTrend.chartData,
          initialData.months?.[0]?.value
        )
      );
    }

    // Entitlement chart + sub options
    if (initialData.entSummaryResponse) {
      const spend = initialData.entSummaryResponse.spendPeriod?.spend || [];
      setEntChartData(spend.map(i => ({ label: i.label, value: i.value })));

      const entList = initialData.entSummaryResponse.selectLists?.find(l => l.name === 'entitlementid');
      if (entList?.items) setEntSubOptions(entList.items);
    }

    if (initialData.entTrendResponse) {
      setEntTrendData(processEntTrend(initialData.entTrendResponse));
    }

    setLoading(false);
  }, [mode, initialData, processDailyChart, processEntTrend]);

  // ─── Client-side init ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'ssr' || hasInitialized.current) return;
    if (!soldToId) return;
    hasInitialized.current = true;

    (async () => {
      setLoading(true);
      try {
        const mRes = await fetchUnbilledMonths(soldToId);
        const mList = mRes.data || [];
        setMonths(mList);
        const firstMonth = mList[0] || null;
        setSelectedMonth(firstMonth);

        if (!firstMonth) { setLoading(false); return; }

        const res = await fetchConsolidatedUnbilledData(soldToId, firstMonth.value);
        if (res.error) { setLoading(false); return; }
        const d = res.data;

        setEstimatedTotal(d.totalsResponse?.totalSpend || 0);
        setDailySummary(d.dailySummaryResponse);
        setDailyChartData(processDailyChart(d.dailySummaryResponse?.spendTrend?.chartData, firstMonth.value));
        setDailyGridData(d.dailyGridResponse?.content || []);
        setDailyGridTotal(d.dailyGridResponse?.totalElements || 0);

        setEntSummary(d.entSummaryResponse);
        const spend = d.entSummaryResponse?.spendPeriod?.spend || [];
        setEntChartData(spend.map(i => ({ label: i.label, value: i.value })));
        const entList = d.entSummaryResponse?.selectLists?.find(l => l.name === 'entitlementid');
        if (entList?.items) setEntSubOptions(entList.items);
        setEntTrendData(processEntTrend(d.entTrendResponse));
        setEntGridData(d.entGridResponse?.content || []);
        setEntGridTotal(d.entGridResponse?.totalElements || 0);
      } catch (e) {
        console.error('❌ Unbilled init error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [soldToId, mode, processDailyChart, processEntTrend]);

  // ─── Month change ─────────────────────────────────────────────────────────
  const handleMonthChange = useCallback(async (e) => {
    const month = e.value;
    setSelectedMonth(month);
    setFilterAzureSub([]);
    setFilterService([]);
    setLastApplied({ sub: [], svc: [] });
    entTabLoaded.current = false;
    setDailyDataState({ skip: 0, take: 20 });
    setEntDataState({ skip: 0, take: 20 });

    setLoading(true);
    try {
      const res = await fetchConsolidatedUnbilledData(soldToId, month.value);
      if (res.error) return;
      const d = res.data;

      setEstimatedTotal(d.totalsResponse?.totalSpend || 0);
      setDailySummary(d.dailySummaryResponse);
      setDailyChartData(processDailyChart(d.dailySummaryResponse?.spendTrend?.chartData, month.value));
      setDailyGridData(d.dailyGridResponse?.content || []);
      setDailyGridTotal(d.dailyGridResponse?.totalElements || 0);

      setEntSummary(d.entSummaryResponse);
      const spend = d.entSummaryResponse?.spendPeriod?.spend || [];
      setEntChartData(spend.map(i => ({ label: i.label, value: i.value })));
      const entList = d.entSummaryResponse?.selectLists?.find(l => l.name === 'entitlementid');
      if (entList?.items) setEntSubOptions(entList.items);
      setEntTrendData(processEntTrend(d.entTrendResponse));
      setEntGridData(d.entGridResponse?.content || []);
      setEntGridTotal(d.entGridResponse?.totalElements || 0);

      // Reset tab to Daily Consumption
      setSelectedTab(0);
    } finally {
      setLoading(false);
    }
  }, [soldToId, processDailyChart, processEntTrend]);

  // ─── Apply Daily Filters ──────────────────────────────────────────────────
  const handleApplyDailyFilters = useCallback(async () => {
    if (!soldToId || !selectedMonth) return;
    setIsApplyingDaily(true);
    setDailyDataState({ skip: 0, take: 20 });

    const filters = {};
    if (filterAzureSub.length) filters.entitlementid = filterAzureSub.map(i => i.value).join(',');
    if (filterService.length)  filters.metercategory  = filterService.map(i => i.value).join(',');

    try {
      const res = await fetchUnbilledDailyData(soldToId, selectedMonth.value, filters);
      if (!res.error) {
        setDailySummary(res.data.dailySummaryResponse);
        setDailyChartData(processDailyChart(res.data.dailySummaryResponse?.spendTrend?.chartData, selectedMonth.value));
        setDailyGridData(res.data.dailyGridResponse?.content || []);
        setDailyGridTotal(res.data.dailyGridResponse?.totalElements || 0);
        setLastApplied({ sub: filterAzureSub, svc: filterService });
      }
    } finally {
      setIsApplyingDaily(false);
    }
  }, [soldToId, selectedMonth, filterAzureSub, filterService, processDailyChart]);

  // ─── Daily grid page change ───────────────────────────────────────────────
  const handleDailyDataStateChange = useCallback(async (e) => {
    const newState = e.dataState;
    setDailyDataState(newState);
    setIsLoadingDailyGrid(true);
    const page = newState.skip / newState.take;

    const filters = {};
    if (filterAzureSub.length) filters.entitlementid = filterAzureSub.map(i => i.value).join(',');
    if (filterService.length)  filters.metercategory  = filterService.map(i => i.value).join(',');

    try {
      const res = await fetchUnbilledDailyData(soldToId, selectedMonth?.value, filters, page, newState.take);
      if (!res.error) {
        setDailyGridData(res.data.dailyGridResponse?.content || []);
        setDailyGridTotal(res.data.dailyGridResponse?.totalElements || 0);
      }
    } finally {
      setIsLoadingDailyGrid(false);
    }
  }, [soldToId, selectedMonth, filterAzureSub, filterService]);

  // ─── Tab select ───────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(async (e) => {
    const tab = e.selected;
    setSelectedTab(tab);

    if (tab === 1 && !entTabLoaded.current && soldToId && selectedMonth) {
      entTabLoaded.current = true;
      setIsLoadingEntTab(true);
      try {
        const res = await fetchUnbilledEntitlementData(soldToId, selectedMonth.value);
        if (!res.error) {
          const d = res.data;
          setEntSummary(d.entSummaryResponse);
          const spend = d.entSummaryResponse?.spendPeriod?.spend || [];
          setEntChartData(spend.map(i => ({ label: i.label, value: i.value })));
          const entList = d.entSummaryResponse?.selectLists?.find(l => l.name === 'entitlementid');
          if (entList?.items) setEntSubOptions(entList.items);
          setEntTrendData(processEntTrend(d.entTrendResponse));
          setEntGridData(d.entGridResponse?.content || []);
          setEntGridTotal(d.entGridResponse?.totalElements || 0);
        }
      } finally {
        setIsLoadingEntTab(false);
      }
    }
  }, [soldToId, selectedMonth, processEntTrend]);

  // ─── Apply Entitlement filter ─────────────────────────────────────────────
  const handleApplyEntFilters = useCallback(async () => {
    if (!soldToId || !selectedMonth) return;
    setIsLoadingEntTab(true);
    setEntDataState({ skip: 0, take: 20 });

    const filters = {};
    if (selectedEntSub.length) filters.entitlementid = selectedEntSub.map(i => i.value).join(',');

    try {
      const res = await fetchUnbilledEntitlementData(soldToId, selectedMonth.value, filters);
      if (!res.error) {
        const d = res.data;
        setEntSummary(d.entSummaryResponse);
        const spend = d.entSummaryResponse?.spendPeriod?.spend || [];
        setEntChartData(spend.map(i => ({ label: i.label, value: i.value })));
        setEntTrendData(processEntTrend(d.entTrendResponse));
        setEntGridData(d.entGridResponse?.content || []);
        setEntGridTotal(d.entGridResponse?.totalElements || 0);
      }
    } finally {
      setIsLoadingEntTab(false);
    }
  }, [soldToId, selectedMonth, selectedEntSub, processEntTrend]);

  // ─── Trending period change ───────────────────────────────────────────────
  const handleTrendingPeriodChange = useCallback(async (period) => {
    setTrendingPeriod(period);
    const months = period === 'Last 12 Months' || period === 12 ? 12 : 6;
    setIsLoadingTrend(true);

    const filters = {};
    if (selectedEntSub.length) filters.entitlementid = selectedEntSub.map(i => i.value).join(',');

    try {
      const res = await fetchUnbilledEntitlementData(soldToId, selectedMonth?.value, filters, 0, 20, months);
      if (!res.error) setEntTrendData(processEntTrend(res.data.entTrendResponse));
    } finally {
      setIsLoadingTrend(false);
    }
  }, [soldToId, selectedMonth, selectedEntSub, processEntTrend]);

  // ─── Entitlement grid page change ────────────────────────────────────────
  const handleEntDataStateChange = useCallback(async (e) => {
    const newState = e.dataState;
    setEntDataState(newState);
    setIsLoadingEntGrid(true);
    const page = newState.skip / newState.take;

    const filters = {};
    if (selectedEntSub.length) filters.entitlementid = selectedEntSub.map(i => i.value).join(',');

    try {
      const res = await fetchUnbilledEntitlementData(soldToId, selectedMonth?.value, filters, page, newState.take);
      if (!res.error) {
        setEntGridData(res.data.entGridResponse?.content || []);
        setEntGridTotal(res.data.entGridResponse?.totalElements || 0);
      }
    } finally {
      setIsLoadingEntGrid(false);
    }
  }, [soldToId, selectedMonth, selectedEntSub]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <IntlProvider locale="en-US">
      <div className="azure-unbilled-page">
        <div className="azure-unbilled-container">

          {/* Header */}
          <div className="azure-unbilled-header">
            <div className="azure-unbilled-header-top">
              <Breadcrumb data={breadcrumbData} className="azure-unbilled-breadcrumb" />

              {/* Estimated Total – top right */}
              {loading ? (
                <Skeleton className="azure-unbilled-skeleton-kpi" />
              ) : (
                <div className="azure-unbilled-kpi">
                  <div className="azure-unbilled-kpi-label">Estimated Total</div>
                  <div className="azure-unbilled-kpi-value">
                    {formatCurrency(estimatedTotal)}
                  </div>
                </div>
              )}
            </div>

            <h1 className="azure-unbilled-title">Estimated Azure Plan Usage</h1>

            {/* Usage Month dropdown */}
            <div className="azure-unbilled-month-row">
              <label className="azure-unbilled-month-label">
                Usage Month
                <Tooltip anchorElement="target" position="right">
                  <SvgIcon
                    icon={infoCircleIcon}
                    size="small"
                    style={{ cursor: 'pointer', color: '#007bff' }}
                    title="Unbilled usage for the selected month. Data may be incomplete until the billing cycle closes."
                  />
                </Tooltip>
              </label>
              {loading ? (
                <Skeleton className="azure-unbilled-skeleton-month" />
              ) : (
                <DropDownList
                  data={months}
                  textField="text"
                  dataItemKey="value"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  style={{ width: 200 }}
                />
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="azure-unbilled-tabs">
            <TabStrip selected={selectedTab} onSelect={handleTabSelect} className="tabstrip">

              {/* ── Tab 1: Daily Consumption ── */}
              <TabStripTab title="Daily Consumption">
                <div className="azure-unbilled-tab-content">

                  {/* Filters */}
                  <div className="azure-unbilled-filters">
                    <div className="azure-unbilled-filter-group">
                      <label>Azure Subscription</label>
                      <MultiSelect
                        data={dailyFilterOptions.subs}
                        textField="label"
                        dataItemKey="value"
                        value={filterAzureSub}
                        onChange={e => setFilterAzureSub(e.value)}
                        placeholder="All"
                        disabled={isApplyingDaily || loading}
                      />
                    </div>

                    <div className="azure-unbilled-filter-group">
                      <label>Service Name</label>
                      <MultiSelect
                        data={dailyFilterOptions.services}
                        textField="label"
                        dataItemKey="value"
                        value={filterService}
                        onChange={e => setFilterService(e.value)}
                        placeholder="All"
                        disabled={isApplyingDaily || loading}
                      />
                    </div>

                    <Button
                      themeColor="primary"
                      className="azure-unbilled-apply-btn"
                      onClick={handleApplyDailyFilters}
                      disabled={isDailyFiltersUnchanged || isApplyingDaily || loading}
                    >
                      Apply Filters
                    </Button>

                    <button className="azure-unbilled-manage-tags-btn">Manage Tags</button>
                  </div>

                  {/* Daily chart */}
                  {(loading || isApplyingDaily) ? (
                    <Skeleton className="azure-unbilled-skeleton-chart" />
                  ) : dailyChartData.length > 0 ? (
                    <div className="azure-unbilled-chart-section">
                      <Chart onRefresh={() => {}}>
                        <BasicGroupedChart
                          chartType="column"
                          title="Daily Consumption by Service Name"
                          data={dailyChartData}
                          categoryField="group"
                          categoryFormat="MMM dd"
                          valueField="value"
                          valueFormat="c2"
                          groupedByField="label"
                          legendPosition="bottom"
                          tooltipFormat="c2"
                          showLabels={false}
                          stacked={true}
                        />
                      </Chart>
                    </div>
                  ) : (
                    <div className="azure-unbilled-no-data">No daily consumption data available.</div>
                  )}

                  {/* Daily grid */}
                  <div className="azure-unbilled-grid-section">
                    <h3>Azure Daily Consumption Items</h3>
                    <span className="grid-download-note">Use the Download to view more detailed data</span>
                    {(loading || isApplyingDaily) ? (
                      Array.from({ length: 5 }, (_, i) => (
                        <Skeleton key={i} className="azure-unbilled-skeleton-row" />
                      ))
                    ) : (
                      <GridTable
                        name="azureUnbilledDaily"
                        data={{ data: dailyGridData, total: dailyGridTotal }}
                        columns={azureDailyConsumptionColumns(t)}
                        loading={isLoadingDailyGrid || isApplyingDaily}
                        sortable
                        pageable
                        dataState={dailyDataState}
                        dataStateChange={handleDailyDataStateChange}
                        setWidth={w => w}
                      />
                    )}
                  </div>
                </div>
              </TabStripTab>

              {/* ── Tab 2: Azure Subscription Summary ── */}
              <TabStripTab title="Azure Subscription Summary">
                <div className="azure-unbilled-tab-content">

                  {isLoadingEntTab ? (
                    <>
                      <Skeleton style={{ width: '100%', height: '80px', marginBottom: 16 }} />
                      <div className="azure-unbilled-charts-row">
                        <Skeleton style={{ flex: 1, height: 400 }} />
                        <Skeleton style={{ flex: 1, height: 450 }} />
                      </div>
                      <Skeleton style={{ width: '100%', height: 400 }} />
                    </>
                  ) : (
                    <>
                      {/* Entitlement subscription filter */}
                      <div className="azure-unbilled-filters">
                        <div className="azure-unbilled-filter-group">
                          <label>Azure Subscription</label>
                          <MultiSelect
                            data={entSubOptions}
                            textField="label"
                            dataItemKey="value"
                            value={selectedEntSub}
                            onChange={e => setSelectedEntSub(e.value)}
                            placeholder="All"
                          />
                        </div>
                        <Button
                          themeColor="primary"
                          className="azure-unbilled-apply-btn"
                          onClick={handleApplyEntFilters}
                        >
                          Apply Filters
                        </Button>
                      </div>

                      {/* Charts row */}
                      <div className="azure-unbilled-charts-row">
                        {/* Monthly Consumption by Azure Subscription */}
                        <div className="azure-unbilled-chart-half">
                          {entChartData.length > 0 ? (
                            <Chart onRefresh={() => {}}>
                              <BasicGroupedChart
                                chartType="column"
                                title="Monthly Consumption by Azure Subscription"
                                data={entChartData}
                                categoryField="label"
                                valueField="value"
                                valueFormat="c2"
                                legendPosition="bottom"
                                showLabels={true}
                                showCategoryInLabels={true}
                                labelFormat="c2"
                                tooltipFormat="c2"
                              />
                            </Chart>
                          ) : (
                            <div className="azure-unbilled-no-data">
                              <p>Monthly Consumption by Azure Subscription</p>
                              <p>No data available.</p>
                            </div>
                          )}
                        </div>

                        {/* Trending Monthly Spend */}
                        <div className="azure-unbilled-chart-half">
                          <ChartTitleAndButtons
                            title="Trending Monthly Spend"
                            trendingChartType={trendingChartType}
                            handleChartTypeChange={setTrendingChartType}
                            chartOptions={CHART_OPTIONS}
                            dropDownList={true}
                            pageType="invoice"
                            onPeriodChange={handleTrendingPeriodChange}
                            selectedPeriod={trendingPeriod}
                          />
                          {isLoadingTrend ? (
                            <Skeleton className="azure-unbilled-skeleton-chart" />
                          ) : entTrendData.length > 0 ? (
                            <Chart
                              key={`${trendingChartType}-${entTrendData.length}`}
                              onRefresh={() => {}}
                              seriesColors={getInsightThemeColors()}
                            >
                              <BasicGroupedChart
                                chartType={trendingChartType}
                                data={entTrendData}
                                categoryField="group"
                                categoryFormat="MMM yyyy"
                                valueField="value"
                                valueFormat="c2"
                                groupedByField="label"
                                legendPosition="bottom"
                                tooltipFormat="c2"
                                showLabels={false}
                                stacked={trendingChartType === 'column'}
                              />
                            </Chart>
                          ) : (
                            <div className="azure-unbilled-no-data">No trending data available.</div>
                          )}
                        </div>
                      </div>

                      {/* Azure Subscription Summary grid */}
                      <div className="azure-unbilled-grid-section">
                        <h3>Azure Subscription Summary breakdown</h3>
                        <GridTable
                          name="azureUnbilledEntitlement"
                          data={{ data: entGridData, total: entGridTotal }}
                          columns={azureEntitlementSummaryColumns(t)}
                          loading={isLoadingEntGrid || isLoadingEntTab}
                          sortable
                          pageable
                          dataState={entDataState}
                          dataStateChange={handleEntDataStateChange}
                          setWidth={w => w}
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabStripTab>
            </TabStrip>
          </div>
        </div>
      </div>
    </IntlProvider>
  );
}
