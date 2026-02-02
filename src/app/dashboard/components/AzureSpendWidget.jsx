"use client";
import { useState, useCallback } from 'react';
import { Chart } from '@progress/kendo-react-charts';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { CurrencyFormatter } from '@/common/CurrencyFormatter';
import { MetricLabel } from '@/common/MetricLabel';
import { ChangeLabel } from '@/common/ChangeLabel';
import { formatMonthYear } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon } from '@/lib/svg/svgList';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';

export default function AzureSpendWidget({ data = {}, chartType: initialChartType = 'line', onChartTypeChange, chartOptions = [
  { type: 'column', icon: 'chartColumnStackedIcon', title: 'Column chart' },
  { type: 'line', icon: 'chartLineStackedIcon', title: 'Line chart' },
  { type: 'area', icon: 'chartAreaStackedIcon', title: 'Area chart' }
],
  dropDownList = false,
  pageType = 'dashboard',
}) {
  const [azureChartType, setAzureChartType] = useState(initialChartType);
  const handleAzureChartTypeChange = useCallback((newType) => {
    setAzureChartType(newType);
    if (onChartTypeChange) onChartTypeChange(newType);
  }, [onChartTypeChange]);

  const {
    currentEstimatedUsage,
    latestBilledUsage,
    latestAzureUsage,
    latestInvoiceDate,
    latestBilledUsageDate,
    latestAzureChange,
    latestAzureChangePercent,
    latestAzureChangePercentExists,
    currencyCode,
    latestInvoiceTrend
  } = data;

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Azure Spend</h3>
      </div>
      <div className="widget-body">
        <div className="widget-metric">
          <div className="widget-metric-row">
            <MetricLabel title={`Current estimated usage for ${formatMonthYear(latestInvoiceDate)}`}>
              Current Estimated Usage
            </MetricLabel>
            <CurrencyFormatter
              title={`Current estimated usage for ${formatMonthYear(latestInvoiceDate)}`}
              value={currentEstimatedUsage}
              alignRight={true}
              showCurrencyCode={true}
              currency={currencyCode}
            />
          </div>
        </div>
        <div className="widget-metric">
          <div className="widget-metric-row">
            <MetricLabel title={`Invoiced usage for ${formatMonthYear(latestBilledUsageDate)}`}>
              Latest Billed Usage
            </MetricLabel>
            <CurrencyFormatter
              title={`Invoiced usage for ${formatMonthYear(latestBilledUsageDate)}`}
              value={latestAzureUsage}
              alignRight={true}
              showCurrencyCode={true}
              currency={currencyCode}
            />
          </div>
        </div>
        <div className="widget-metric">
          <div className="widget-metric-row">
            <MetricLabel title={`Total Azure Spend for ${formatMonthYear(latestInvoiceDate)}`}>
              Latest Azure Invoice
            </MetricLabel>
            <CurrencyFormatter
              title={`Total Azure Spend for ${formatMonthYear(latestInvoiceDate)}`}
              value={latestBilledUsage}
              alignRight={true}
              showCurrencyCode={true}
              currency={currencyCode}
            />
          </div>
        </div>
        {latestAzureChange !== 0 && (
          <div className="widget-change">
            <span className={`change-indicator ${latestAzureChange > 0 ? 'up' : 'down'}`}>
              {latestAzureChange > 0 ? <ArrowUpIcon className="svg-style"/> : <ArrowDownIcon className="svg-style"/>}
            </span>
            <ChangeLabel
              title={`Difference in spend on ${formatMonthYear(latestInvoiceDate)} invoice from the previous month`}
              value={Math.abs(latestAzureChange)}
              currency={currencyCode}
              percentage={latestAzureChangePercent}
              showPercentage={latestAzureChangePercentExists}
            />
          </div>
        )}
      </div>
      <div className="widget-chart">
        <ChartTitleAndButtons
          title="Trending 6 Month Spend"
          trendingChartType={azureChartType}
          handleChartTypeChange={handleAzureChartTypeChange}
          chartOptions={chartOptions}
          dropDownList={dropDownList}
          pageType={pageType}
        />
        {latestInvoiceTrend?.chartData && latestInvoiceTrend.chartData.length > 0 ? (
          <Chart key={azureChartType} onRefresh={() => {}} className="dashboard-chart">
            <BasicGroupedChart
              chartType={azureChartType}
              data={latestInvoiceTrend.chartData}
              groupedByField="label"
              valueField="value"
              categoryField="group"
              categoryFormat="MMM"
              valueFormat="c0"
              legendPosition="bottom"
              showLabels={false}
              stacked={azureChartType === 'column'}
              yAxisLabelStep={2}
              height={250}
            />
          </Chart>
        ) : (
          <div className="chart-placeholder">No chart data available</div>
        )}
      </div>
    </div>
  );
}
