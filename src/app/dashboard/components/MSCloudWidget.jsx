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

export default function MSCloudWidget({ data = {}, chartType: initialChartType = 'column' }) {
  const [msCloudChartType, setMsCloudChartType] = useState(initialChartType);
  const handleMsCloudChartTypeChange = useCallback((newType) => setMsCloudChartType(newType), []);
  const {
    billableItemTotal,
    latestBillableItemDate,
    latestChange,
    latestChangePercent,
    latestChangePercentExists,
    currencyCode,
    billableItemTrend
  } = data;
  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Total Microsoft Cloud</h3>
      </div>
      <div className="widget-body">
        <div className="widget-metric">
          <div className="widget-metric-row">
            <MetricLabel title={`Invoice for ${latestBillableItemDate}`}>Latest Insight Invoice</MetricLabel>
            <CurrencyFormatter
              title={`Invoice for ${formatMonthYear(latestBillableItemDate)}`}
              value={billableItemTotal}
              alignRight={true}
              showCurrencyCode={true}
              currency={currencyCode}
            />
          </div>
        </div>
        {latestChange !== 0 && (
          <div className="widget-change">
            <span className={`change-indicator ${latestChange > 0 ? 'up' : 'down'}`}>
              {latestChange > 0 ? <ArrowUpIcon className="svg-style" /> : <ArrowDownIcon className="svg-style"/>}
            </span>
            <ChangeLabel
              title={`Difference in spend on ${formatMonthYear(latestBillableItemDate)} invoice from the previous month`}
              value={Math.abs(latestChange)}
              currency={currencyCode}
              percentage={latestChangePercent}
              showPercentage={latestChangePercentExists}
            />
          </div>
        )}
      </div>
      <div className="widget-chart">
        <ChartTitleAndButtons
          title="Trending 6 Month Spend"
          trendingChartType={msCloudChartType}
          handleChartTypeChange={handleMsCloudChartTypeChange}
          chartOptions={columnLineAreaOptions}
          dropDownList={false}
          pageType="dashboard"
        />
        {billableItemTrend?.chartData && billableItemTrend.chartData.length > 0 ? (
          <Chart key={msCloudChartType} onRefresh={() => {}} className="dashboard-chart">
            <BasicGroupedChart
              chartType={msCloudChartType}
              data={billableItemTrend.chartData}
              groupedByField="label"
              valueField="value"
              categoryField="group"
              categoryFormat="MMM"
              valueFormat="c0"
              legendPosition="bottom"
              showLabels={false}
              stacked={msCloudChartType === 'column'}
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
