import { useState, useCallback } from 'react';
import { Chart } from '@progress/kendo-react-charts';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import { MetricLabel } from '@/common/MetricLabel';
import { CurrencyFormatter } from '@/common/CurrencyFormatter';
import { ChangeLabel } from '@/common/ChangeLabel';
import { formatMonthYear } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon } from '@/lib/svg/svgList';

const columnLineAreaOptions = [
  { type: 'column', icon: 'chartColumnStackedIcon', title: 'Column chart' },
  { type: 'line', icon: 'chartLineStackedIcon', title: 'Line chart' },
  { type: 'area', icon: 'chartAreaStackedIcon', title: 'Area chart' }
];

export default function AWSWidget({ data = {}, chartType: initialChartType = 'column' }) {
  const [awsChartType, setAwsChartType] = useState(initialChartType);
  const handleAwsChartTypeChange = useCallback((newType) => setAwsChartType(newType), []);
  const {
    totalSpend,
    currentEstimatedUsage,
    latestBillableItemDate,
    latestChange,
    latestPercent,
    latestPercentExists,
    currencyCode,
    billableItemTrend
  } = data;
  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Amazon Web Services</h3>
      </div>
      <div className="widget-body">
        <div className="widget-metric">
          <div className="widget-metric-row">
            <MetricLabel title={`Current estimated AWS usage for ${formatMonthYear(latestBillableItemDate)}`}>Current Estimated Usage</MetricLabel>
            <CurrencyFormatter
              title={`Current estimated AWS usage for ${formatMonthYear(latestBillableItemDate)}`}
              value={currentEstimatedUsage}
              alignRight={true}
              showCurrencyCode={true}
              currency={currencyCode}
            />
          </div>
        </div>
        <div className="widget-metric">
          <div className="widget-metric-row">
            <MetricLabel title={`Invoice for ${formatMonthYear(latestBillableItemDate)}`}>Latest Insight Invoice</MetricLabel>
            <CurrencyFormatter
              title={`Invoice for ${formatMonthYear(latestBillableItemDate)}`}
              value={totalSpend}
              alignRight={true}
              showCurrencyCode={true}
              currency={currencyCode}
            />
          </div>
        </div>
        {latestChange !== 0 && (
          <div className="widget-change">
            <span className={`change-indicator ${latestChange > 0 ? 'up' : 'down'}`}>
              {latestChange > 0 ? <ArrowUpIcon className="svg-style" /> : <ArrowDownIcon className="svg-style" />}
            </span>
            <ChangeLabel
              title={`Difference in spend on ${formatMonthYear(latestBillableItemDate)} invoice from the previous month`}
              value={Math.abs(latestChange)}
              currency={currencyCode}
              percentage={latestPercent}
              showPercentage={latestPercentExists}
            />
          </div>
        )}
      </div>
      <div className="widget-chart">
        <ChartTitleAndButtons
          title="Trending 6 Month Spend"
          trendingChartType={awsChartType}
          handleChartTypeChange={handleAwsChartTypeChange}
          chartOptions={columnLineAreaOptions}
          dropDownList={false}
          pageType="dashboard"
        />
        {billableItemTrend?.chartData && billableItemTrend.chartData.length > 0 ? (
          <Chart key={awsChartType} onRefresh={() => {}} className="dashboard-chart">
            <BasicGroupedChart
              chartType={awsChartType}
              data={billableItemTrend.chartData}
              groupedByField="label"
              valueField="value"
              categoryField="group"
              categoryFormat="MMM"
              valueFormat="c0"
              legendPosition="bottom"
              showLabels={false}
              stacked={awsChartType === 'column'}
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
