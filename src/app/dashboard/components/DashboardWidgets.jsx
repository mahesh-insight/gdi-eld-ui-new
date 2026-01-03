"use client";

import { useSelector } from 'react-redux';
import { useState, useCallback } from 'react';
import './DashboardWidgets.css';
import { BasicChart } from '@/common/Charts/BasicChart';
import { BasicGroupedChart } from '@/common/Charts/BasicGroupedChart';
import { Chart } from '@progress/kendo-react-charts';
import ChartTitleAndButtons from '@/components/ChartTitleAndButtons';

export default function DashboardWidgets({ ssrData, mode }) {
  const widgetFlags = useSelector(state => state.dashboard.widgetFlags);
  const widgets = ssrData?.widgets || {};

  // Chart type states for each widget
  const [azureChartType, setAzureChartType] = useState('line');
  const [m365ChartType, setM365ChartType] = useState('column');
  const [msCloudChartType, setMsCloudChartType] = useState('column');
  const [adobeChartType, setAdobeChartType] = useState('column');

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
    rawAzureSpend: widgets.azureSpend,
    azureSpendHasData: !!widgets.azureSpend?.data,
    azureSpendDataKeys: widgets.azureSpend?.data ? Object.keys(widgets.azureSpend.data) : [],
    azureCurrentEstimated: widgets.azureSpend?.data?.currentEstimatedUsage,
    m365Data: widgets.m365?.data,
    msCloudData: widgets.msCloud?.data
  });
  
  const formatCurrency = (value, currencyCode = 'USD') => {
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
      currencyCode = 'USD'
    } = data;

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>Azure Spend</h3>
        </div>
        <div className="widget-body">
          <div className="widget-metric">
            <div className="widget-metric-row">
              <span className="metric-label">Current Estimated Usage</span>
              <span className="metric-value">{formatCurrency(currentEstimatedUsage, currencyCode)}</span>
            </div>
          </div>
          <div className="widget-metric">
            <div className="widget-metric-row">
              <span className="metric-label">Latest Billed Usage</span>
              <span className="metric-value">{formatCurrency(latestBilledUsage, currencyCode)}</span>
            </div>
            <span className="metric-date">{formatDate(latestBilledUsageDate)}</span>
          </div>
          <div className="widget-metric">
            <div className="widget-metric-row">
              <span className="metric-label">Latest Azure Invoice</span>
              <span className="metric-value">{formatCurrency(latestAzureUsage, currencyCode)}</span>
            </div>
            <span className="metric-date">{formatDate(latestInvoiceDate)}</span>
          </div>
          {latestAzureChange !== 0 && (
            <div className="widget-change">
              <span className={`change-indicator ${latestAzureChange > 0 ? 'up' : 'down'}`}>
                {latestAzureChange > 0 ? '▲' : '▼'}
              </span>
              <span className="change-text">
                {formatCurrency(Math.abs(latestAzureChange), currencyCode)}
                {latestAzureChangePercentExists && ` (${latestAzureChangePercent}%)`}
              </span>
              <span className="change-label"> from previous month</span>
            </div>
          )}
        </div>
        <div className="widget-chart">
          <ChartTitleAndButtons
            title="Trending 6 Month Spend"
            trendingChartType={azureChartType}
            handleChartTypeChange={(newType) => setAzureChartType(newType)}
            chartOptions={columnLineAreaOptions}
            dropDownList={false}
            pageType="dashboard"
          />
          {data.latestInvoiceTrend?.chartData && data.latestInvoiceTrend.chartData.length > 0 ? (
            <Chart onRefresh={() => {}} style={{ height: '250px' }}>
              <BasicGroupedChart
                key={azureChartType}
                chartType={azureChartType}
                data={data.latestInvoiceTrend.chartData}
                groupedByField="label"
                valueField="value"
                categoryField="group"
                categoryFormat="MMM"
                valueFormat="c0"
                legendPosition="bottom"
                showLabels={false}
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
      currencyCode = 'USD'
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
              <span className="metric-label">Latest Invoice</span>
              <span className="metric-value">{formatCurrency(cloudLicenseTotalSpend, currencyCode)}</span>
            </div>
            <span className="metric-date">{formatDate(latestBillableItemDate)}</span>
          </div>
          {latestChange !== 0 && (
            <div className="widget-change">
              <span className={`change-indicator ${latestChange > 0 ? 'up' : 'down'}`}>
                {latestChange > 0 ? '▲' : '▼'}
              </span>
              <span className="change-text">
                {formatCurrency(Math.abs(latestChange), currencyCode)}
                {haveLatestChangePercent && ` (${latestChangePercent}%)`}
              </span>
              <span className="change-label"> from previous month</span>
            </div>
          )}
          
          {subscriptionExpirationSummary && subscriptionExpirationSummary.length > 0 && (
            <div className="widget-alerts">
              {subscriptionExpirationSummary.map((alert, idx) => (
                <div key={idx} className={`alert alert-${alert.iconType}`}>
                  <span className="alert-icon">{alert.iconType === 'error' ? '🔴' : alert.iconType === 'warning' ? '⚠️' : 'ℹ️'}</span>
                  <span className="alert-message">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="widget-counts">
            {totals.map((item, idx) => (
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
      currencyCode = 'USD'
    } = data;

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>Total Microsoft Cloud</h3>
        </div>
        <div className="widget-body">
          <div className="widget-metric">
            <div className="widget-metric-row">
              <span className="metric-label">Latest Insight Invoice</span>
              <span className="metric-value">{formatCurrency(billableItemTotal, currencyCode)}</span>
            </div>
            <span className="metric-date">{formatDate(latestBillableItemDate)}</span>
          </div>
          {latestChange !== 0 && (
            <div className="widget-change">
              <span className={`change-indicator ${latestChange > 0 ? 'up' : 'down'}`}>
                {latestChange > 0 ? '▲' : '▼'}
              </span>
              <span className="change-text">
                {formatCurrency(Math.abs(latestChange), currencyCode)}
                {latestChangePercentExists && ` (${latestChangePercent}%)`}
              </span>
              <span className="change-label"> from previous month</span>
            </div>
          )}
        </div>
        <div className="widget-chart">
          <ChartTitleAndButtons
            title="Trending 6 Month Spend"
            trendingChartType={msCloudChartType}
            handleChartTypeChange={(newType) => setMsCloudChartType(newType)}
            chartOptions={columnLineAreaOptions}
            dropDownList={false}
            pageType="dashboard"
          />
          {data.billableItemTrend?.chartData && data.billableItemTrend.chartData.length > 0 ? (
            <Chart onRefresh={() => {}} style={{ height: '250px' }}>
              <BasicGroupedChart
                key={msCloudChartType}
                chartType={msCloudChartType}
                data={data.billableItemTrend.chartData}
                groupedByField="label"
                valueField="value"
                categoryField="group"
                categoryFormat="MMM"
                valueFormat="c0"
                legendPosition="bottom"
                showLabels={false}
                stacked={true}
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
      currencyCode = 'USD'
    } = data;

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>Adobe VIP</h3>
        </div>
        <div className="widget-body">
          <div className="widget-metric">
            <div className="widget-metric-row">
              <span className="metric-label">Latest Insight Invoice</span>
              <span className="metric-value">{formatCurrency(totalSpend, currencyCode)}</span>
            </div>
            <span className="metric-date">{formatDate(latestBillableItemDate)}</span>
          </div>
          {latestChange !== 0 && (
            <div className="widget-change">
              <span className={`change-indicator ${latestChange > 0 ? 'up' : 'down'}`}>
                {latestChange > 0 ? '▲' : '▼'}
              </span>
              <span className="change-text">
                {formatCurrency(Math.abs(latestChange), currencyCode)}
                {latestPercentExists && ` (${latestPercent}%)`}
              </span>
              <span className="change-label"> from previous month</span>
            </div>
          )}
        </div>
        <div className="widget-chart">
          <ChartTitleAndButtons
            title="Trending 6 Month Spend"
            trendingChartType={adobeChartType}
            handleChartTypeChange={(newType) => setAdobeChartType(newType)}
            chartOptions={columnLineAreaOptions}
            dropDownList={false}
            pageType="dashboard"
          />
          {data.billableItemTrend?.chartData && data.billableItemTrend.chartData.length > 0 ? (
            <Chart onRefresh={() => {}} style={{ height: '250px' }}>
              <BasicGroupedChart
                key={adobeChartType}
                chartType={adobeChartType}
                data={data.billableItemTrend.chartData}
                groupedByField="label"
                valueField="value"
                categoryField="group"
                categoryFormat="MMM"
                valueFormat="c0"
                legendPosition="bottom"
                showLabels={false}
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
      currencyCode = 'USD'
    } = data;

    return (
      <div className="dashboard-widget">
        <div className="widget-header">
          <h3>AWS Spend</h3>
        </div>
        <div className="widget-body">
          {currentEstimatedUsage > 0 && (
            <div className="widget-metric">
              <span className="metric-label">Current Estimated Usage</span>
              <span className="metric-value">{formatCurrency(currentEstimatedUsage, currencyCode)}</span>
            </div>
          )}
          <div className="widget-metric">
            <span className="metric-label">Latest Insight Invoice</span>
            <span className="metric-value">{formatCurrency(totalSpend, currencyCode)}</span>
            <span className="metric-date">{formatDate(latestBillableItemDate)}</span>
          </div>
          {latestChange !== 0 && (
            <div className="widget-change">
              <span className={`change-indicator ${latestChange > 0 ? 'up' : 'down'}`}>
                {latestChange > 0 ? '▲' : '▼'}
              </span>
              <span className="change-text">
                {formatCurrency(Math.abs(latestChange), currencyCode)}
                {latestPercentExists && ` (${latestPercent}%)`}
              </span>
              <span className="change-label"> from previous month</span>
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
