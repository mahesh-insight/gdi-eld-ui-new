"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Skeleton } from '@progress/kendo-react-indicators';
import { Chart } from '@progress/kendo-react-charts';
import { Button } from '@progress/kendo-react-buttons';
import { downloadIcon } from '@progress/kendo-svg-icons';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import GridTable from '@/components/GridTable/GridTable';
import {
  fetchInvoiceHistoryTrend,
  fetchInvoiceHistorySummary,
  fetchInvoiceHistoryDetail,
  fetchInvoiceHistoryMonths,
} from './actions';
import './invoice-history.css';

const PAGE_SIZE = 20;

// Format "2026-04-01T00:00:00Z" → "Apr 2026"
const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
};

const PROVIDER_ALL = { provider: 'All', abbreviation: 'All', dataExists: {} };

const CHART_OPTIONS = [
  { type: 'column', icon: 'chartColumnStackedIcon', title: 'Column chart' },
  { type: 'line',   icon: 'chartLineStackedIcon',   title: 'Line chart'   },
  { type: 'area',   icon: 'chartAreaStackedIcon',   title: 'Area chart'   },
];

const PERIOD_OPTIONS = ['Last 6 Months', 'Last 12 Months', 'All'];

// ─── grid columns (base definitions — cells injected in render) ────────────
const BASE_GRID_COLUMNS = [
  { field: 'provider',       title: 'Provider',        minWidth: 100 },
  { field: 'invoiceDate',    title: 'Invoice Date',    minWidth: 120, format: '{0:yyyy-MM-dd}' },
  { field: 'invoiceNumber',  title: 'Invoice Number',  minWidth: 140 },
  { field: 'subTotal',       title: 'Sub Total',       minWidth: 120, format: '{0:c2}' },
  { field: 'taxTotal',       title: 'Tax Total',       minWidth: 110, format: '{0:c2}' },
  { field: 'grandTotal',     title: 'Invoice Total',   minWidth: 130, format: '{0:c2}' },
  { field: 'currency',       title: 'Currency',        minWidth: 90  },
  { field: 'invoiceDueDate', title: 'Invoice Due Date',minWidth: 130, format: '{0:yyyy-MM-dd}' },
  { field: 'invoiceStatus',  title: 'Invoice Status',  minWidth: 120 },
  { field: 'pdfUrl',         title: 'PDF Link',        minWidth: 120 },
  { field: 'haveDetail',     title: 'View Details',    minWidth: 110 },
];

export default function InvoiceHistoryClientContent({ mode = 'csr', initialData, userContext }) {
  const router = useRouter();

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const loginResponse = useSelector((state) => state.auth?.loginResponse);

  let selectedSoldToId = mode === 'ssr'
    ? userContext?.soldToId
    : (loginResponse?.userProfile?.defaultContext?.[0]?.soldToId || loginResponse?.soldToId);

  if (!selectedSoldToId && typeof window !== 'undefined') {
    try {
      const p = localStorage.getItem('persist:ccr-auth');
      if (p) {
        const parsed = JSON.parse(p);
        let lr = parsed.loginResponse;
        if (typeof lr === 'string') lr = JSON.parse(lr);
        if (typeof lr === 'string') lr = JSON.parse(lr);
        selectedSoldToId = lr?.userProfile?.defaultContext?.[0]?.soldToId || lr?.soldToId;
      }
    } catch { /* ignore */ }
  }

  // ─── Derive month lists ───────────────────────────────────────────────────
  const initialMonths    = mode === 'ssr' ? (initialData?.months || []) : [];
  const defaultEndMonth  = initialMonths[0]  || null;   // newest
  const defaultStartMonth = initialMonths[initialMonths.length - 1] || null; // oldest

  // ─── Loading states ───────────────────────────────────────────────────────
  const [loading,      setLoading]      = useState(mode !== 'ssr');
  const [gridLoading,  setGridLoading]  = useState(mode !== 'ssr');
  const [trendLoading, setTrendLoading] = useState(false);

  // ─── Data states ──────────────────────────────────────────────────────────
  const [providers,    setProviders]    = useState(mode === 'ssr' ? [PROVIDER_ALL, ...(initialData?.providers || [])] : [PROVIDER_ALL]);
  const [months,       setMonths]       = useState(initialMonths);
  const [trendData,    setTrendData]    = useState(mode === 'ssr' ? (initialData?.trend?.chartData || []) : []);
  const [summary,      setSummary]      = useState(mode === 'ssr' ? (initialData?.summary || null) : null);
  const [gridData,     setGridData]     = useState(mode === 'ssr' ? (initialData?.detail?.content || []) : []);
  const [gridTotal,    setGridTotal]    = useState(mode === 'ssr' ? (initialData?.detail?.totalElements || 0) : 0);

  // ─── Filter states ────────────────────────────────────────────────────────
  const [selectedProvider,   setSelectedProvider]   = useState(PROVIDER_ALL);
  const [selectedStartMonth, setSelectedStartMonth] = useState(defaultStartMonth);
  const [selectedEndMonth,   setSelectedEndMonth]   = useState(defaultEndMonth);
  const [invoiceNumbers,     setInvoiceNumbers]     = useState([{ label: 'All Invoices', value: 'All' }]);
  const [selectedInvoiceNum, setSelectedInvoiceNum] = useState({ label: 'All Invoices', value: 'All' });
  const [pendingInvoiceNum,  setPendingInvoiceNum]  = useState({ label: 'All Invoices', value: 'All' });

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [chartType, setChartType] = useState('column');
  const [page,          setPage]          = useState(0);
  const [filtersDirty,  setFiltersDirty]  = useState(false);

  const hasInitialized = useRef(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const buildDateRange = () => ({
    start: selectedStartMonth?.value ?? defaultStartMonth?.value,
    end:   selectedEndMonth?.value   ?? defaultEndMonth?.value,
  });

  // Update invoice number dropdown from summary selectLists
  const applySelectLists = useCallback((summaryData) => {
    const invoiceList = summaryData?.selectLists?.find(l => l.name === 'invoiceNumber');
    if (invoiceList?.items) {
      setInvoiceNumbers(invoiceList.items);
    }
  }, []);

  // ─── Client-side init ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'ssr' || hasInitialized.current) return;
    if (!selectedSoldToId) return;
    hasInitialized.current = true;

    (async () => {
      setLoading(true);
      try {
        const monthsResult = await fetchInvoiceHistoryMonths(selectedSoldToId);
        const mList = monthsResult.data || [];
        setMonths(mList);

        const start = mList[mList.length - 1]?.value;
        const end   = mList[0]?.value;
        setSelectedStartMonth(mList[mList.length - 1] || null);
        setSelectedEndMonth(mList[0] || null);

        const [trendRes, summaryRes, detailRes] = await Promise.allSettled([
          fetchInvoiceHistoryTrend(selectedSoldToId),
          fetchInvoiceHistorySummary(selectedSoldToId, start, end),
          fetchInvoiceHistoryDetail(selectedSoldToId, start, end),
        ]);

        if (trendRes.status === 'fulfilled')   setTrendData(trendRes.value.data?.chartData || []);
        if (summaryRes.status === 'fulfilled') {
          setSummary(summaryRes.value.data);
          applySelectLists(summaryRes.value.data);
        }
        if (detailRes.status === 'fulfilled') {
          setGridData(detailRes.value.data?.content || []);
          setGridTotal(detailRes.value.data?.totalElements || 0);
        }
      } catch (e) {
        console.error('❌ Invoice History init error:', e);
      } finally {
        setLoading(false);
        setGridLoading(false);
      }
    })();
  }, [selectedSoldToId, mode, applySelectLists]);

  // ─── Populate invoice numbers from SSR summary ────────────────────────────
  useEffect(() => {
    if (mode === 'ssr' && initialData?.summary) {
      applySelectLists(initialData.summary);
    }
  }, [mode, initialData, applySelectLists]);

  // ─── Provider change → reload trend only ─────────────────────────────────
  const handleProviderChange = useCallback(async (e) => {
    const prov = e.value;
    setSelectedProvider(prov);
    setTrendLoading(true);
    try {
      const res = await fetchInvoiceHistoryTrend(selectedSoldToId, { provider: prov.provider });
      setTrendData(res.data?.chartData || []);
    } catch (err) {
      console.error('❌ Trend fetch error:', err);
    } finally {
      setTrendLoading(false);
    }
  }, [selectedSoldToId]);

  // ─── Apply Filters ────────────────────────────────────────────────────────
  const handleApplyFilters = useCallback(async () => {
    if (!selectedSoldToId) return;
    const { start, end } = buildDateRange();
    if (!start || !end) return;

    const invoiceNum = pendingInvoiceNum?.value ?? 'all';
    setSelectedInvoiceNum(pendingInvoiceNum);
    setFiltersDirty(false);
    setGridLoading(true);
    setPage(0);

    try {
      const [summaryRes, detailRes] = await Promise.allSettled([
        fetchInvoiceHistorySummary(selectedSoldToId, start, end, { provider: selectedProvider.provider }),
        fetchInvoiceHistoryDetail(selectedSoldToId, start, end, { page: 0, provider: selectedProvider.provider, invoiceNumber: invoiceNum }),
      ]);
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data);
        applySelectLists(summaryRes.value.data);
      }
      if (detailRes.status === 'fulfilled') {
        setGridData(detailRes.value.data?.content || []);
        setGridTotal(detailRes.value.data?.totalElements || 0);
      }
    } catch (e) {
      console.error('❌ Apply filters error:', e);
    } finally {
      setGridLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSoldToId, selectedStartMonth, selectedEndMonth, selectedProvider, pendingInvoiceNum, applySelectLists]);

  // ─── Grid pagination state ────────────────────────────────────────────────
  const [gridDataState, setGridDataState] = useState({ skip: 0, take: PAGE_SIZE });

  const handleDataStateChange = useCallback(async (e) => {
    const newState = e.dataState;
    setGridDataState(newState);
    const newPage = newState.skip / newState.take;
    setPage(newPage);
    setGridLoading(true);
    const { start, end } = buildDateRange();
    const invoiceNum = selectedInvoiceNum?.value ?? 'all';
    try {
      const res = await fetchInvoiceHistoryDetail(selectedSoldToId, start, end, {
        page: newPage,
        size: newState.take,
        provider: selectedProvider.provider,
        invoiceNumber: invoiceNum,
      });
      setGridData(res.data?.content || []);
      setGridTotal(res.data?.totalElements || 0);
    } catch (err) {
      console.error('❌ Page change error:', err);
    } finally {
      setGridLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSoldToId, selectedStartMonth, selectedEndMonth, selectedProvider, selectedInvoiceNum]);

  // ─── Navigate to View Details ─────────────────────────────────────────────
  const handleViewDetails = useCallback((row) => {
    const provider = row.providerAbbreviation?.toLowerCase();
    const invoiceNum = row.invoiceNumber;
    if (provider === 'microsoft') {
      router.push(`/MicrosoftInvoiceDetail?invoiceNumber=${invoiceNum}`);
    } else if (provider === 'aws') {
      router.push(`/invoices?provider=aws&invoice=${invoiceNum}`);
    } else {
      router.push(`/invoices?provider=${provider}&invoice=${invoiceNum}`);
    }
  }, [router]);

  // ─── Render cells for special columns ────────────────────────────────────
  const buildGridColumns = useCallback(() => {
    return BASE_GRID_COLUMNS.map(col => {
      if (col.field === 'pdfUrl') {
        return {
          ...col,
          cell: (cellProps) => (
            <td>
              {cellProps.dataItem.pdfUrl ? (
                <a href={cellProps.dataItem.pdfUrl} target="_blank" rel="noopener noreferrer" className="invoice-history-pdf-link">
                  Download PDF
                </a>
              ) : '—'}
            </td>
          ),
        };
      }
      if (col.field === 'haveDetail') {
        return {
          ...col,
          cell: (cellProps) => (
            <td>
              {cellProps.dataItem.haveDetail ? (
                <button className="invoice-history-detail-link" onClick={() => handleViewDetails(cellProps.dataItem)}>
                  View Details
                </button>
              ) : '—'}
            </td>
          ),
        };
      }
      if (col.field === 'invoiceStatus') {
        return {
          ...col,
          cell: (cellProps) => {
            const cls = cellProps.dataItem.invoiceStatus?.toLowerCase() === 'paid' ? 'paid' : 'unpaid';
            return (
              <td>
                <span className={`invoice-history-status-badge ${cls}`}>
                  {cellProps.dataItem.invoiceStatus}
                </span>
              </td>
            );
          },
        };
      }
      return col;
    });
  }, [handleViewDetails]);

  // ─── Loading skeletons ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="invoice-history-container">
        <div className="invoice-history-header">
          <Skeleton className="invoice-history-skeleton-title" />
        </div>
        <div className="invoice-history-provider-row">
          <div className="invoice-history-dropdown-group">
            <Skeleton className="invoice-history-skeleton-dropdown" />
          </div>
        </div>
        <div className="invoice-history-chart-section" style={{ paddingTop: 16 }}>
          <Skeleton className="invoice-history-skeleton-chart" />
        </div>
        <div className="invoice-history-grid-section">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="invoice-history-skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Format months for DropDownList ──────────────────────────────────────
  const monthItems = months.map(m => ({ ...m, text: m.text }));

  return (
    <div className="invoice-history-container">

      {/* ── Page title ── */}
      <div className="invoice-history-header">
        <h1>Invoice History</h1>
      </div>

      {/* ── Provider selector ── */}
      <div className="invoice-history-provider-row">
        <div className="invoice-history-dropdown-group">
          <label>Provider</label>
          <DropDownList
            data={providers}
            textField="provider"
            dataItemKey="provider"
            value={selectedProvider}
            onChange={handleProviderChange}
            style={{ width: 200 }}
          />
        </div>
      </div>

      {/* ── Trend chart ── */}
      <div className="invoice-history-chart-section">
        <ChartTitleAndButtons
          title="Invoice Trend"
          trendingChartType={chartType}
          handleChartTypeChange={(t) => setChartType(t)}
          chartOptions={CHART_OPTIONS}
          dropDownList={false}
          pageType="invoice-history"
          periodOptions={PERIOD_OPTIONS}
          selectedPeriod="Last 12 Months"
        />
        {trendLoading ? (
          <Skeleton className="invoice-history-skeleton-chart" />
        ) : trendData.length > 0 ? (
          <Chart onRefresh={() => {}} className="dashboard-chart">
            <BasicGroupedChart
              chartType={chartType}
              data={trendData}
              groupedByField="label"
              valueField="value"
              categoryField="group"
              categoryFormat="MMM yyyy"
              valueFormat="c0"
              legendPosition="bottom"
              showLabels={false}
              stacked={chartType === 'column'}
              yAxisLabelStep={2}
              height={280}
            />
          </Chart>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#666' }}>No chart data available</div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="invoice-history-filters">
        {/* Start Date */}
        <div className="invoice-history-date-group">
          <label className="invoice-history-filter-label">Start Date</label>
          <DropDownList
            data={monthItems}
            textField="text"
            dataItemKey="value"
            value={selectedStartMonth}
            onChange={(e) => { setSelectedStartMonth(e.value); setFiltersDirty(true); }}
            style={{ width: 150 }}
          />
        </div>

        {/* End Date */}
        <div className="invoice-history-date-group">
          <label className="invoice-history-filter-label">End Date</label>
          <DropDownList
            data={monthItems}
            textField="text"
            dataItemKey="value"
            value={selectedEndMonth}
            onChange={(e) => { setSelectedEndMonth(e.value); setFiltersDirty(true); }}
            style={{ width: 150 }}
          />
        </div>

        {/* Invoice Number */}
        <div className="invoice-history-invoice-group">
          <label className="invoice-history-filter-label">Invoice Number</label>
          <div className="invoice-history-invoice-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <DropDownList
              data={invoiceNumbers}
              textField="label"
              dataItemKey="value"
              value={pendingInvoiceNum}
              onChange={(e) => { setPendingInvoiceNum(e.value); setFiltersDirty(true); }}
              style={{ flex: 1 }}
            />
            {pendingInvoiceNum?.value && pendingInvoiceNum.value !== 'All' && (
              <button
                className="invoice-history-invoice-clear"
                style={{ position: 'relative', right: 'unset', top: 'unset', transform: 'none' }}
                onClick={() => { setPendingInvoiceNum({ label: 'All Invoices', value: 'All' }); setFiltersDirty(true); }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Apply Filters */}
        <Button
          themeColor="primary"
          className="invoice-history-apply-btn"
          onClick={handleApplyFilters}
          disabled={!filtersDirty && !selectedSoldToId}
        >
          Apply Filters
        </Button>

        {/* Download CSV */}
        <Button
          themeColor="base"
          className="invoice-history-download-btn"
          icon="download"
          svgIcon={downloadIcon}
          title="Download CSV"
        >
          &nbsp;
        </Button>

        <div className="invoice-history-download-note" style={{ display: 'block', width: '100%' }}>
          ⓘ Please note that your download may not be available immediately. Please check back in the next 1 - 2 days.
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="invoice-history-grid-section">
        <GridTable
          data={{ data: gridData, total: gridTotal }}
          columns={buildGridColumns()}
          dataState={gridDataState}
          dataStateChange={handleDataStateChange}
          loading={gridLoading}
          sortable
          pageable
        />
      </div>
    </div>
  );
}
