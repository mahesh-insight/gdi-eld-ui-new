"use client";

import { useSelector } from 'react-redux';
import { useState, useCallback, useEffect } from 'react';
import './DashboardWidgets.css';
import { BasicChart } from '@/common/Charts/BasicChart';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import { Chart } from '@progress/kendo-react-charts';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';
import { CurrencyFormatter } from '@/common/CurrencyFormatter';
import { MetricLabel } from '@/common/MetricLabel';
import { ChangeLabel } from '@/common/ChangeLabel';
import { formatMonthYear } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon } from '@/lib/svg/svgList';

const iconPaths = {
  warning: "M256 32 0 480h512zm-32 160h64v160h-64zm0 256v-64h64v64z",
  error: "M256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32m-32 352L96 256l45-45 83 83 147-147 45 45z",
  info: "M256 480c123.7 0 224-100.3 224-224S379.7 32 256 32 32 132.3 32 256s100.3 224 224 224m-32-352h64v160h-64zm0 256v-64h64v64z",
};

export default function DashboardWidgets({ ssrData, mode }) {
  const widgetFlags = useSelector(state => state.dashboard.widgetFlags);
  const widgets = ssrData?.widgets || {};

  // Chart type states for each widget
  const [azureChartType, setAzureChartType] = useState('line');
  const [m365ChartType, setM365ChartType] = useState('column');
  const [msCloudChartType, setMsCloudChartType] = useState('column');
  const [adobeChartType, setAdobeChartType] = useState('column');

  // Chart type change handlers with logging
  const handleAzureChartTypeChange = useCallback((newType) => {
    console.log('🔄 Azure chart type changing to', newType);
    setAzureChartType(newType);
  }, []);

  const handleMsCloudChartTypeChange = useCallback((newType) => {
    console.log('🔄 MS Cloud chart type changing to', newType);
    setMsCloudChartType(newType);
  }, []);

  const handleAdobeChartTypeChange = useCallback((newType) => {
    console.log('🔄 Adobe chart type changing to', newType);
    setAdobeChartType(newType);
  }, []);

  const columnLineAreaOptions = [
    { type: 'column', icon: 'chartColumnStackedIcon', title: 'Column chart' },
    { type: 'line', icon: 'chartLineStackedIcon', title: 'Line chart' },
    { type: 'area', icon: 'chartAreaStackedIcon', title: 'Area chart' }
  ];

  console.log('🎨 DashboardWidgets rendering:', {
    mode,
    hasSSRData: !!ssrData,
    widgetKeys: Object.keys(widgets),
    widgetFlags,
    chartTypes: {
      azure: azureChartType,
      msCloud: msCloudChartType,
      adobe: adobeChartType
    }
  });
  
  // Save widget count to localStorage for loading.js to use
  useEffect(() => {
    if (typeof window !== 'undefined' && widgetFlags) {
      const enabledCount = Object.values(widgetFlags).filter(flag => flag === true).length;
      if (enabledCount > 0) {
        localStorage.setItem('dashboard_widget_count', enabledCount.toString());
      }
    }
  }, [widgetFlags]);
  
  const formatCurrency = (value, currencyCode) => {
    if (!value) return `${currencyCode} 0.00`;
    return `${currencyCode} ${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (yyyymm) => {
    if (!yyyymm || yyyymm.length !== 6) return "Invalid Date";
    const year = yyyymm.substring(0, 4);
    const month = yyyymm.substring(4, 6);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(month, 10) - 1;
    return monthIndex >= 0 && monthIndex < 12 ? `${monthNames[monthIndex]} ${year}` : "Invalid Month";
  };

  // Render Azure Spend Widget
  const renderAzureSpendWidget = () => {
    if (!widgetFlags.isAzureSpendWidgetDataState) return null;
    
    const data = widgets.azureSpend?.data || {};
    const { 
      currentEstimatedUsage, 
      latestBilledUsage, 
      latestAzureUsage,
      latestInvoiceDate,
      latestBilledUsageDate,
      latestAzureChange,
      latestAzureChangePercent,
      latestAzureChangePercentExists,
      currencyCode
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
            chartOptions={columnLineAreaOptions}
            dropDownList={false}
            pageType="dashboard"
          />
          {data.latestInvoiceTrend?.chartData && data.latestInvoiceTrend.chartData.length > 0 ? (
            <Chart key={azureChartType} onRefresh={() => {}} className="dashboard-chart">
              <BasicGroupedChart
                chartType={azureChartType}
                data={data.latestInvoiceTrend.chartData}
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
  };

  // Render M365 Widget
  const renderM365Widget = () => {
    if (!widgetFlags.isM365WidgetDataState) return null;
    
    const data = widgets.m365?.data || {};
    const { 
      cloudLicenseTotalSpend,
      latestBillableItemDate,
      latestChange,
      latestChangePercent,
      haveLatestChangePercent,
      subscriptionSummary,
      subscriptionExpirationSummary,
      currencyCode
    } = data;

    const totals = subscriptionSummary?.totals || [];

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>M365 | Modern Work</h3>
        </div>
        <div className="widget-body">
          <div className="widget-metric">
            <div className="widget-metric-row">
              <MetricLabel title={`Invoiced M365 for ${formatDate(latestBillableItemDate)}`}>
                Latest Invoice
              </MetricLabel>
              <CurrencyFormatter
                title={`Invoiced M365 for ${formatMonthYear(latestBillableItemDate)}`}
                value={cloudLicenseTotalSpend}
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
                title={`Difference in spend on ${formatMonthYear(latestBillableItemDate)} M365 invoice from the previous month`}
                value={Math.abs(latestChange)}
                currency={currencyCode}
                percentage={latestChangePercent}
                showPercentage={haveLatestChangePercent}
              />
            </div>
          )}
          
          {subscriptionExpirationSummary && subscriptionExpirationSummary.length > 0 && (
            <div className="widget-alerts">
              {subscriptionExpirationSummary.map((alert, idx) => (
                <div key={idx} className={`alert alert-${alert.iconType}`}>
                  <div className="alert-icon">
                    <svg viewBox="0 0 512 512" fill={alert.iconStatus} width="1em" height="1em">
                      {iconPaths[alert.iconType] && (
                        <path d={iconPaths[alert.iconType]} />
                      )}
                    </svg>
                  </div>
                  <span className="alert-message">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="widget-counts">
            {totals.map((item, idx) => {
              const colorClasses = ['vertical-pink', 'vertical-blue', 'vertical-gray'];
              const colorClass = colorClasses[idx] || 'vertical-gray';
              return (
                <div key={idx} className={`count-item ${colorClass}`}>
                  <span className="count-label">{item.label}</span>
                  <span className="count-value">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render MS Cloud Widget
  const renderMSCloudWidget = () => {
    if (!widgetFlags.isMSSpendWidgetDataState) return null;
    
    const data = widgets.msCloud?.data || {};
    const {
      billableItemTotal,
      latestBillableItemDate,
      latestChange,
      latestChangePercent,
      latestChangePercentExists,
      currencyCode
    } = data;

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>Total Microsoft Cloud</h3>
        </div>
        <div className="widget-body">
          <div className="widget-metric">
            <div className="widget-metric-row">
              <MetricLabel title={`Invoice for ${formatDate(latestBillableItemDate)}`}>
                Latest Insight Invoice
              </MetricLabel>
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
          {data.billableItemTrend?.chartData && data.billableItemTrend.chartData.length > 0 ? (
            <Chart key={msCloudChartType} onRefresh={() => {}} className="dashboard-chart">
              <BasicGroupedChart
                chartType={msCloudChartType}
                data={data.billableItemTrend.chartData}
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
  };

  // Render Adobe Widget
  const renderAdobeWidget = () => {
    if (!widgetFlags.isAdobeWidgetDataState) return null;
    
    const data = widgets.adobeSpend?.data || {};
    const {
      totalSpend,
      latestBillableItemDate,
      latestChange,
      latestPercent,
      latestPercentExists,
      currencyCode
    } = data;

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>Adobe VIP</h3>
        </div>
        <div className="widget-body">
          <div className="widget-metric">
            <div className="widget-metric-row">
              <MetricLabel title={`Invoice for ${formatDate(latestBillableItemDate)}`}>
                Latest Insight Invoice
              </MetricLabel>
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
                {latestChange > 0 ? <ArrowUpIcon className="svg-style" /> : <ArrowDownIcon className="svg-style"/>}
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
            trendingChartType={adobeChartType}
            handleChartTypeChange={handleAdobeChartTypeChange}
            chartOptions={columnLineAreaOptions}
            dropDownList={false}
            pageType="dashboard"
          />
          {data.billableItemTrend?.chartData && data.billableItemTrend.chartData.length > 0 ? (
            <Chart key={adobeChartType} onRefresh={() => {}} className="dashboard-chart">
              <BasicGroupedChart
                chartType={adobeChartType}
                data={data.billableItemTrend.chartData}
                groupedByField="label"
                valueField="value"
                categoryField="group"
                categoryFormat="MMM"
                valueFormat="c0"
                legendPosition="bottom"
                showLabels={false}
                stacked={adobeChartType === 'column'}
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
  };

  // Render AWS Widget
  const renderAWSWidget = () => {
    if (!widgetFlags.isAwsSpendWidgetDataState) return null;
    
    const data = widgets.awsSpend?.data || {};
    const {
      totalSpend,
      currentEstimatedUsage,
      latestBillableItemDate,
      latestChange,
      latestPercent,
      latestPercentExists,
      currencyCode
    } = data;

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>AWS Spend</h3>
        </div>
        <div className="widget-body">
          {currentEstimatedUsage > 0 && (
            <div className="widget-metric">
              <MetricLabel title="Current estimated AWS usage">
                Current Estimated Usage
              </MetricLabel>
              <span className="metric-value">{formatCurrency(currentEstimatedUsage, currencyCode)}</span>
            </div>
          )}
          <div className="widget-metric">
            <MetricLabel title={`Latest AWS invoice for ${formatDate(latestBillableItemDate)}`}>
              Latest Insight Invoice
            </MetricLabel>
            <span className="metric-value">{formatCurrency(totalSpend, currencyCode)}</span>
            <span className="metric-date">{formatDate(latestBillableItemDate)}</span>
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
          <h4>Trending 6 Month Spend</h4>
          <div className="chart-placeholder">Chart will be rendered here</div>
        </div>
      </div>
    );
  };

  // Render MPSA Widget
  const renderMPSAWidget = () => {
    if (!widgetFlags.isMPSAWidgetDataState) return null;
    
    const data = widgets.mpsa?.data || {};
    const {
      mpsaExpirationSummaries,
      totals
    } = data;

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>MPSA</h3>
        </div>
        <div className="widget-body">
          {mpsaExpirationSummaries && mpsaExpirationSummaries.length > 0 && (
            <div className="widget-alerts">
              {mpsaExpirationSummaries.map((alert, idx) => (
                <div key={idx} className={`alert alert-${alert.iconType}`}>
                  <span className="alert-icon">{alert.iconType === 'error' ? '🔴' : alert.iconType === 'warning' ? '⚠️' : 'ℹ️'}</span>
                  <span className="alert-message">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="widget-counts">
            {totals && totals.map((item, idx) => (
              <div key={idx} className="count-item">
                <span className="count-label">{item.label}</span>
                <span className="count-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const hasAnyWidgets = Object.values(widgetFlags).some(flag => flag === true);

  if (!hasAnyWidgets) {
    return (
      <div className="no-widgets">
        <h2>📊 No Dashboard Widgets Available</h2>
        <p>No widgets are currently enabled for this account.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-widgets-container">
      <div className="widgets-grid">
        {renderAzureSpendWidget()}
        {renderM365Widget()}
        {renderMSCloudWidget()}
        {renderAWSWidget()}
        {renderAdobeWidget()}
        {renderMPSAWidget()}
      </div>
    </div>
  );
}
